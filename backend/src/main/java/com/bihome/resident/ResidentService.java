package com.bihome.resident;

import com.bihome.survey.SurveyResponseRepository;
import com.bihome.transaction.FinancialTransactionRepository;
import com.bihome.servicecatalog.ServiceOrderRepository;
import com.bihome.booking.AmenityBookingRepository;
import com.bihome.accesscard.AccessCardRepository;
import com.bihome.accesscard.AccessCardService;
import com.bihome.apartment.Apartment;
import com.bihome.apartment.ApartmentRepository;
import com.bihome.apartment.ApartmentService;
import com.bihome.building.BuildingService;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.excel.ExcelReader;
import com.bihome.common.excel.ImportResult;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.security.AuthUser;
import com.bihome.common.security.BuildingContext;
import com.bihome.common.storage.FileAttachmentRepository;
import com.bihome.common.storage.FilePurpose;
import com.bihome.common.util.AppTime;
import com.bihome.common.util.PhoneNumbers;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.resident.ResidentEnums.AppAccountStatus;
import com.bihome.resident.ResidentEnums.ResidenceStatus;
import com.bihome.resident.ResidentEnums.ResidentRole;
import com.bihome.resident.dto.ResidentDtos;
import com.bihome.ticket.TicketRepository;
import jakarta.persistence.EntityManager;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import java.io.ByteArrayInputStream;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * Cư dân thuộc một tòa; mỗi lần ở một căn hộ là một bản ghi APARTMENT_RESIDENT (giữ lại khi chuyển đi).
 * Quy tắc: mỗi căn tối đa một chủ hộ chính (vai trò Chủ sở hữu, chưa chuyển đi); có ngày chuyển đi ≤ hôm nay
 * → Đã chuyển đi và bỏ cờ chủ hộ chính; số điện thoại và mã cư dân duy nhất trong tòa.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ResidentService {

    static final int EXPORT_LIMIT = 10_000;
    static final String DEFAULT_NATIONALITY = "Việt Nam";
    private static final String CODE_PREFIX = "CD";
    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "createdAt");
    private static final Map<String, String> SORTS = Map.of(
            "code", "code",
            "fullName", "fullName",
            "phone", "phone",
            "buildingName", "building.name",
            "createdAt", "createdAt",
            "updatedAt", "updatedAt");
    private static final DateTimeFormatter FILE_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final ResidentRepository residents;
    private final ApartmentResidentRepository links;
    private final TicketRepository tickets;
    private final AccessCardService accessCardService;
    private final AccessCardRepository accessCards;
    private final AmenityBookingRepository bookings;
    private final ServiceOrderRepository serviceOrders;
    private final FinancialTransactionRepository transactions;
    private final SurveyResponseRepository surveyResponses;
    private final ApartmentService apartmentService;
    private final ApartmentRepository apartments;
    private final BuildingService buildingService;
    private final BuildingContext buildingContext;
    private final FileAttachmentRepository files;
    private final ResidentMapper mapper;
    private final Validator validator;
    private final EntityManager entityManager;
    private final Clock clock;

    public PageResponse<ResidentDtos.Summary> list(ResidentDtos.Filter filter, PageParams pageParams) {
        return PageResponse.of(residents.findAll(spec(filter), pageParams.toPageable(DEFAULT_SORT, SORTS)),
                mapper::toSummary);
    }

    public byte[] export(ResidentDtos.Filter filter) {
        if (residents.count(spec(filter)) > EXPORT_LIMIT) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "Có hơn " + EXPORT_LIMIT + " cư dân, vui lòng lọc bớt trước khi xuất Excel.");
        }
        return ResidentExcel.export(residents.findAll(spec(filter), Sort.by("building.name", "fullName")));
    }

    public String exportFileName(ResidentDtos.Filter filter) {
        Long buildingId = filter.buildingId() != null ? filter.buildingId()
                : buildingContext.selectedBuildingId().orElse(null);
        String scope = buildingId == null ? "tat-ca" : buildingService.findAccessible(buildingId).getCode().toLowerCase();
        return "cu-dan-" + scope + "-" + today().format(FILE_DATE) + ".xlsx";
    }

    public byte[] importTemplate() {
        return ResidentExcel.template();
    }

    public ResidentDtos.Response get(Long id) {
        return mapper.toResponse(requireAccessible(id));
    }

    /** Tab "Cư dân" ở chi tiết căn hộ: người đang ở trước, rồi lịch sử đã chuyển đi. */
    public List<ResidentDtos.ApartmentMember> byApartment(Long apartmentId) {
        apartmentService.requireAccessible(apartmentId);
        return links.findByApartment(apartmentId, ResidenceStatus.MOVED_OUT).stream().map(mapper::toMember).toList();
    }

    /** Cư dân thuộc tòa của căn hộ đầu tiên (bắt buộc). */
    @Transactional
    public ResidentDtos.Response create(ResidentDtos.Request req, AuthUser actor) {
        if (req.apartment() == null) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "apartment.apartmentId", "Vui lòng chọn căn hộ");
        }
        Apartment apartment = apartmentService.requireAccessible(req.apartment().apartmentId());
        Long buildingId = apartment.getBuildingId();
        buildingService.requireActive(buildingId, "Tòa nhà đang không hoạt động, không thể thêm cư dân.");

        Resident resident = new Resident();
        resident.setBuildingId(buildingId);
        resident.setAppAccountStatus(AppAccountStatus.NONE);
        String code = ResidentExcel.normalizeCode(req.code());
        if (code.isEmpty()) {
            code = formatCode(nextCodeNumber(buildingId));
        } else if (residents.existsByBuildingIdAndCode(buildingId, code)) {
            throw duplicateCode();
        }
        resident.setCode(code);
        apply(resident, req, actor);
        addLink(resident, apartment, req.apartment(), "apartment.");
        residents.saveAndFlush(resident);
        // Nạp lại để có quan hệ building/apartment (chỉ đọc) cho response.
        entityManager.refresh(resident);
        return mapper.toResponse(resident);
    }

    /** Chỉ sửa thông tin cá nhân; căn hộ quản lý qua gán căn hộ / sửa cư trú / chuyển đi. */
    @Transactional
    public ResidentDtos.Response update(Long id, ResidentDtos.Request req, AuthUser actor) {
        Resident resident = requireAccessible(id);
        if (req.version() == null || !Objects.equals(resident.getVersion(), req.version())) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
        String code = ResidentExcel.normalizeCode(req.code());
        if (code.isEmpty()) {
            code = resident.getCode();
        } else if (residents.existsByBuildingIdAndCodeAndIdNot(resident.getBuildingId(), code, id)) {
            throw duplicateCode();
        }
        resident.setCode(code);
        apply(resident, req, actor);
        residents.saveAndFlush(resident);
        return mapper.toResponse(resident);
    }

    /** Gán cư dân vào thêm một căn hộ cùng tòa. */
    @Transactional
    public ResidentDtos.Response assignApartment(Long id, ResidentDtos.LinkRequest req) {
        Resident resident = requireAccessible(id);
        Apartment apartment = apartmentService.requireAccessible(req.apartmentId());
        addLink(resident, apartment, req, "");
        residents.saveAndFlush(resident);
        entityManager.refresh(resident);
        return mapper.toResponse(resident);
    }

    /** Sửa thông tin cư trú tại một căn (vai trò, chủ hộ, ngày, tình trạng...); không đổi được căn hộ. */
    @Transactional
    public ResidentDtos.Response updateApartment(Long id, Long linkId, ResidentDtos.LinkRequest req) {
        Resident resident = requireAccessible(id);
        ApartmentResident link = resident.getApartments().stream().filter(l -> l.getId().equals(linkId)).findFirst()
                .orElseThrow(() -> new NotFoundException("Không tìm thấy thông tin cư trú."));
        if (req.version() == null || !Objects.equals(link.getVersion(), req.version())) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
        if (!link.getApartmentId().equals(req.apartmentId())) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "apartmentId",
                    "Không đổi được căn hộ; hãy chuyển đi rồi gán căn hộ mới.");
        }
        boolean wasActive = link.isActive();
        applyLink(resident, link, req, "");
        links.saveAndFlush(link);
        if (wasActive && !link.isActive()) {
            accessCardService.revokeForResident(resident.getId(), List.of(link.getApartmentId()));
        }
        return mapper.toResponse(resident);
    }

    /** Chuyển đi khỏi các căn đã chọn (mặc định mọi căn đang ở); thẻ từ của cư dân tại các căn đó bị thu hồi. */
    @Transactional
    public ResidentDtos.Response moveOut(Long id, ResidentDtos.MoveOutRequest req) {
        Resident resident = requireAccessible(id);
        if (req.moveOutDate().isAfter(today())) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "moveOutDate",
                    "Ngày chuyển đi không được sau hôm nay.");
        }
        List<ApartmentResident> active = resident.activeLinks();
        List<ApartmentResident> targets;
        if (req.linkIds() == null || req.linkIds().isEmpty()) {
            targets = active;
        } else {
            Map<Long, ApartmentResident> byId = active.stream()
                    .collect(Collectors.toMap(ApartmentResident::getId, Function.identity()));
            targets = req.linkIds().stream().distinct().map(byId::get).toList();
            if (targets.contains(null)) {
                throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "linkIds",
                        "Căn hộ đã chọn không còn hiệu lực với cư dân này.");
            }
        }
        if (targets.isEmpty()) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "Cư dân không còn ở căn hộ nào.");
        }
        for (ApartmentResident link : targets) {
            if (req.moveOutDate().isBefore(link.getMoveInDate())) {
                throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "moveOutDate",
                        "Ngày chuyển đi phải sau hoặc bằng ngày chuyển đến căn " + link.getApartment().getCode() + ".");
            }
        }
        for (ApartmentResident link : targets) {
            link.setMoveOutDate(req.moveOutDate());
            link.setResidenceStatus(ResidenceStatus.MOVED_OUT);
            link.setHouseholdHead(false);
        }
        residents.saveAndFlush(resident);
        accessCardService.revokeForResident(resident.getId(),
                targets.stream().map(ApartmentResident::getApartmentId).toList());
        return mapper.toResponse(resident);
    }

    /** Chỉ xoá được khi cư dân không còn ở căn nào (lịch sử cư trú bị xoá theo). */
    @Transactional
    public void delete(Long id) {
        Resident resident = requireAccessible(id);
        int active = resident.activeLinks().size();
        if (active > 0) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Cư dân còn đang ở " + active + " căn hộ, hãy dùng Chuyển đi trước khi xoá.");
        }
        long ticketCount = tickets.countByResidentId(id);
        if (ticketCount > 0) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Cư dân có " + ticketCount + " yêu cầu hỗ trợ nên không xoá được.");
        }
        long cardCount = accessCards.countByResidentId(id);
        if (cardCount > 0) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Cư dân còn gắn với " + cardCount + " thẻ từ (kể cả thẻ báo mất) nên không xoá được.");
        }
        long usage = bookings.countByResidentId(id) + serviceOrders.countByResidentId(id) + transactions.countByResidentId(id)
                + surveyResponses.countByResidentId(id);
        if (usage > 0) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Cư dân đã có đăng ký tiện ích / đơn dịch vụ / giao dịch / phản hồi khảo sát nên không xoá được.");
        }
        residents.delete(resident);
    }

    /** Job hằng ngày gọi. @return số lần cư trú vừa chuyển sang Đã chuyển đi. */
    @Transactional
    public int moveOutDue() {
        return links.moveOutDue(today(), OffsetDateTime.now(clock), ResidenceStatus.MOVED_OUT);
    }

    // ---------------------------------------------------------------- Import

    /**
     * Nhập vào tòa đang chọn ở header, mỗi dòng một cư dân mới. Kiểm tra toàn bộ file trước; nếu
     * {@code stopOnError} và có dòng lỗi thì không lưu dòng nào.
     */
    @Transactional
    public ImportResult importExcel(MultipartFile file, boolean stopOnError, AuthUser actor) {
        Long buildingId = buildingContext.requireBuildingId();
        buildingService.requireActive(buildingId, "Tòa nhà đang không hoạt động, không thể thêm cư dân.");
        byte[] data = ExcelReader.requireXlsx(file);
        List<ExcelReader.ExcelRow> rows = ExcelReader.read(new ByteArrayInputStream(data), ResidentExcel.REQUIRED);
        if (rows.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "File không có dòng dữ liệu nào.");
        }

        Set<String> apartmentCodes = rows.stream().map(r -> ResidentExcel.normalizeCode(r.get(ResidentExcel.APARTMENT)))
                .filter(c -> !c.isEmpty()).collect(Collectors.toSet());
        Map<String, Apartment> apartmentsByCode = apartmentCodes.isEmpty() ? Map.of()
                : apartments.findByBuildingIdAndCodeIn(buildingId, apartmentCodes).stream()
                .collect(Collectors.toMap(Apartment::getCode, Function.identity()));

        List<ParsedRow> parsed = rows.stream().map(r -> parseRow(r, apartmentsByCode)).toList();
        markConflicts(parsed, buildingId);
        boolean hasErrors = parsed.stream().anyMatch(p -> p.error != null);

        if (stopOnError && hasErrors) {
            return ImportResult.of(parsed.stream().map(p -> p.toResult(
                    p.error == null ? "Hợp lệ (chưa nhập vì file còn dòng lỗi)" : null)).toList(), false);
        }
        int nextCode = nextCodeNumber(buildingId);
        Set<String> takenCodes = parsed.stream().filter(p -> p.error == null && !p.code.isEmpty())
                .map(p -> p.code).collect(Collectors.toSet());
        List<Resident> toSave = new ArrayList<>();
        for (ParsedRow p : parsed) {
            if (p.error != null) {
                continue;
            }
            if (p.code.isEmpty()) {
                do {
                    p.code = formatCode(nextCode++);
                } while (takenCodes.contains(p.code));
            }
            Resident resident = new Resident();
            resident.setBuildingId(buildingId);
            resident.setAppAccountStatus(AppAccountStatus.NONE);
            resident.setCode(p.code);
            applyFields(resident, p.request, IdNumbers.normalize(p.request.idNumber()));
            ApartmentResident link = new ApartmentResident();
            link.setResident(resident);
            link.setApartmentId(p.apartment.getId());
            setLink(link, p.request.apartment(), ResidenceStatus.LIVING, p.request.apartment().householdHead());
            resident.getApartments().add(link);
            toSave.add(resident);
        }
        residents.saveAllAndFlush(toSave);
        return ImportResult.of(parsed.stream().map(p -> p.toResult(p.error == null ? "Đã nhập (" + p.code + ")" : null))
                .toList(), true);
    }

    private static final class ParsedRow {
        final int rowNumber;
        final String key;
        final ResidentDtos.Request request;
        String code;
        String phone;
        Apartment apartment;
        String error;

        ParsedRow(int rowNumber, String key, ResidentDtos.Request request, String error) {
            this.rowNumber = rowNumber;
            this.key = key;
            this.request = request;
            this.error = error;
        }

        ImportResult.Row toResult(String okMessage) {
            return new ImportResult.Row(rowNumber, key, error == null, error == null ? okMessage : error);
        }
    }

    private ParsedRow parseRow(ExcelReader.ExcelRow row, Map<String, Apartment> apartmentsByCode) {
        String key = row.get(ResidentExcel.FULL_NAME).trim();
        try {
            ResidentDtos.Request request = ResidentExcel.parse(row, apartmentsByCode);
            List<String> errors = new ArrayList<>(validator.validate(request).stream()
                    .map(ConstraintViolation::getMessage).sorted().toList());
            String idError = IdNumbers.validate(request.idType(), IdNumbers.normalize(request.idNumber()));
            if (idError != null) {
                errors.add(idError);
            }
            ResidentDtos.LinkRequest link = request.apartment();
            Apartment apartment = link.apartmentId() == null ? null
                    : apartmentsByCode.get(ResidentExcel.normalizeCode(row.get(ResidentExcel.APARTMENT)));
            if (apartment != null && apartment.getStatus() != ActiveStatus.ACTIVE) {
                errors.add("Căn hộ " + apartment.getCode() + " đang không hoạt động");
            }
            if (link.householdHead() && link.role() != null && link.role() != ResidentRole.OWNER) {
                errors.add("Chủ hộ chính phải có vai trò Chủ sở hữu");
            }
            ParsedRow parsed = new ParsedRow(row.rowNumber(), key, request,
                    errors.isEmpty() ? null : String.join("; ", errors));
            parsed.code = ResidentExcel.normalizeCode(request.code());
            parsed.phone = PhoneNumbers.normalize(request.phone());
            parsed.apartment = apartment;
            return parsed;
        } catch (ResidentExcel.CellException e) {
            return new ParsedRow(row.rowNumber(), key, null, e.getMessage());
        }
    }

    /** Trùng trong file (SĐT, mã, chủ hộ chính cùng căn) và trùng với dữ liệu đã có trong tòa. */
    private void markConflicts(List<ParsedRow> parsed, Long buildingId) {
        Map<String, Integer> firstPhone = new HashMap<>();
        Map<String, Integer> firstCode = new HashMap<>();
        Map<Long, Integer> firstHead = new HashMap<>();
        for (ParsedRow p : parsed) {
            if (p.error != null) {
                continue;
            }
            Integer row = firstPhone.putIfAbsent(p.phone, p.rowNumber);
            if (row != null) {
                p.error = "Trùng số điện thoại với dòng " + row;
                continue;
            }
            row = p.code.isEmpty() ? null : firstCode.putIfAbsent(p.code, p.rowNumber);
            if (row != null) {
                p.error = "Trùng mã cư dân với dòng " + row;
                continue;
            }
            row = p.request.apartment().householdHead() ? firstHead.putIfAbsent(p.apartment.getId(), p.rowNumber) : null;
            if (row != null) {
                p.error = "Căn " + p.apartment.getCode() + " đã có chủ hộ chính ở dòng " + row;
            }
        }
        List<ParsedRow> valid = parsed.stream().filter(p -> p.error == null).toList();
        if (valid.isEmpty()) {
            return;
        }
        Set<String> phones = new HashSet<>(residents.findExistingPhones(buildingId,
                valid.stream().map(p -> p.phone).toList()));
        List<String> codes = valid.stream().map(p -> p.code).filter(c -> !c.isEmpty()).toList();
        Set<String> existingCodes = codes.isEmpty() ? Set.of() : new HashSet<>(residents.findExistingCodes(buildingId, codes));
        List<Long> headApartments = valid.stream().filter(p -> p.request.apartment().householdHead())
                .map(p -> p.apartment.getId()).toList();
        Set<Long> withHead = headApartments.isEmpty() ? Set.of()
                : new HashSet<>(links.findApartmentsWithActiveHead(headApartments, ResidenceStatus.MOVED_OUT));
        for (ParsedRow p : valid) {
            if (phones.contains(p.phone)) {
                p.error = "Số điện thoại đã được dùng cho cư dân khác trong tòa nhà";
            } else if (existingCodes.contains(p.code)) {
                p.error = "Mã cư dân đã tồn tại trong tòa nhà";
            } else if (p.request.apartment().householdHead() && withHead.contains(p.apartment.getId())) {
                p.error = "Căn " + p.apartment.getCode() + " đã có chủ hộ chính";
            }
        }
    }

    // ---------------------------------------------------------------- Helpers

    private Specification<Resident> spec(ResidentDtos.Filter filter) {
        return ResidentSpecifications.of(filter, buildingService.listScope(filter.buildingId()));
    }

    /** Cư dân phải thuộc tòa user được truy cập, nếu không → 404. */
    public Resident requireAccessible(Long id) {
        return residents.findById(id)
                .filter(r -> buildingService.canAccess(r.getBuildingId()))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy cư dân."));
    }

    private void apply(Resident resident, ResidentDtos.Request req, AuthUser actor) {
        String phone = PhoneNumbers.normalize(req.phone());
        boolean phoneTaken = resident.getId() == null
                ? residents.existsByBuildingIdAndPhone(resident.getBuildingId(), phone)
                : residents.existsByBuildingIdAndPhoneAndIdNot(resident.getBuildingId(), phone, resident.getId());
        if (phoneTaken) {
            throw BusinessException.field(ErrorCode.CONFLICT, "phone",
                    "Số điện thoại đã được dùng cho cư dân khác trong tòa nhà.");
        }
        String idNumber = IdNumbers.normalize(req.idNumber());
        String idError = IdNumbers.validate(req.idType(), idNumber);
        if (idError != null) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, idNumber == null ? "idType" : "idNumber", idError);
        }
        if (req.idIssueDate() != null && req.dateOfBirth() != null && req.idIssueDate().isBefore(req.dateOfBirth())) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "idIssueDate", "Ngày cấp phải sau ngày sinh.");
        }
        if (req.avatarFileId() != null && !req.avatarFileId().equals(resident.getAvatarFileId())) {
            boolean valid = files.findById(req.avatarFileId())
                    .filter(f -> f.getPurpose() == FilePurpose.RESIDENT_AVATAR)
                    .filter(f -> actor.username().equals(f.getCreatedBy()))
                    .isPresent();
            if (!valid) {
                throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "avatarFileId", "Ảnh đại diện không hợp lệ.");
            }
        }
        applyFields(resident, req, idNumber);
        resident.setAvatarFileId(req.avatarFileId());
    }

    private static void applyFields(Resident resident, ResidentDtos.Request req, String idNumber) {
        resident.setFullName(req.fullName().trim());
        resident.setPhone(PhoneNumbers.normalize(req.phone()));
        resident.setEmail(trimToNull(req.email()));
        resident.setGender(req.gender());
        resident.setDateOfBirth(req.dateOfBirth());
        resident.setIdType(idNumber == null ? null : req.idType());
        resident.setIdNumber(idNumber);
        resident.setIdIssueDate(idNumber == null ? null : req.idIssueDate());
        resident.setIdIssuePlace(idNumber == null ? null : trimToNull(req.idIssuePlace()));
        String nationality = trimToNull(req.nationality());
        resident.setNationality(nationality == null ? DEFAULT_NATIONALITY : nationality);
        resident.setNote(trimToNull(req.note()));
    }

    private void addLink(Resident resident, Apartment apartment, ResidentDtos.LinkRequest req, String prefix) {
        if (!apartment.getBuildingId().equals(resident.getBuildingId())) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, prefix + "apartmentId",
                    "Căn hộ không thuộc tòa nhà của cư dân.");
        }
        if (apartment.getStatus() != ActiveStatus.ACTIVE) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, prefix + "apartmentId", "Căn hộ đang không hoạt động.");
        }
        requireNotLivingThere(resident, apartment.getId(), null, prefix);
        ApartmentResident link = new ApartmentResident();
        link.setResident(resident);
        link.setApartmentId(apartment.getId());
        applyLink(resident, link, req, prefix);
        resident.getApartments().add(link);
    }

    /** Kiểm tra hết rồi mới gán, để auto-flush trước truy vấn không ghi dữ liệu dở dang xuống DB. */
    private void applyLink(Resident resident, ApartmentResident link, ResidentDtos.LinkRequest req, String prefix) {
        LocalDate moveOut = req.moveOutDate();
        if (moveOut != null && moveOut.isBefore(req.moveInDate())) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, prefix + "moveOutDate",
                    "Ngày chuyển đi phải sau hoặc bằng ngày chuyển đến.");
        }
        boolean movedOut = moveOut != null && !moveOut.isAfter(today());
        if (req.residenceStatus() == ResidenceStatus.MOVED_OUT && !movedOut) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, prefix + "moveOutDate",
                    "Nhập ngày chuyển đi (không sau hôm nay) để chuyển sang Đã chuyển đi.");
        }
        ResidenceStatus status = movedOut ? ResidenceStatus.MOVED_OUT
                : req.residenceStatus() == null ? ResidenceStatus.LIVING : req.residenceStatus();
        if (req.householdHead() && req.role() != ResidentRole.OWNER) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, prefix + "householdHead",
                    "Chủ hộ chính phải có vai trò Chủ sở hữu.");
        }
        boolean head = req.householdHead() && status != ResidenceStatus.MOVED_OUT;
        if (link.getId() != null && !link.isActive() && status != ResidenceStatus.MOVED_OUT) {
            requireNotLivingThere(resident, link.getApartmentId(), link.getId(), prefix);
        }
        if (head) {
            links.findActiveHead(link.getApartmentId(), ResidenceStatus.MOVED_OUT, link.getId()).stream().findFirst()
                    .ifPresent(other -> {
                        throw BusinessException.field(ErrorCode.CONFLICT, prefix + "householdHead",
                                "Căn hộ đã có chủ hộ chính: " + other.getResident().getFullName() + ".");
                    });
        }
        setLink(link, req, status, head);
    }

    private static void setLink(ApartmentResident link, ResidentDtos.LinkRequest req, ResidenceStatus status,
                                boolean head) {
        link.setRole(req.role());
        link.setRelationship(req.relationship());
        link.setHouseholdHead(head);
        link.setMoveInDate(req.moveInDate());
        link.setMoveOutDate(req.moveOutDate());
        link.setResidenceStatus(status);
        link.setTempResidenceRegistered(req.tempResidenceRegistered());
    }

    private static void requireNotLivingThere(Resident resident, Long apartmentId, Long excludeLinkId, String prefix) {
        boolean living = resident.activeLinks().stream()
                .anyMatch(l -> l.getApartmentId().equals(apartmentId) && !Objects.equals(l.getId(), excludeLinkId));
        if (living) {
            throw BusinessException.field(ErrorCode.CONFLICT, prefix + "apartmentId", "Cư dân đang ở căn hộ này.");
        }
    }

    /** Số kế tiếp cho mã tự sinh CD + 6 số trong tòa. */
    private int nextCodeNumber(Long buildingId) {
        String max = residents.findMaxGeneratedCode(buildingId);
        return max == null ? 1 : Integer.parseInt(max.substring(CODE_PREFIX.length())) + 1;
    }

    private static String formatCode(int number) {
        return CODE_PREFIX + "%06d".formatted(number);
    }

    private LocalDate today() {
        return LocalDate.now(clock.withZone(AppTime.ZONE));
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static BusinessException duplicateCode() {
        return BusinessException.field(ErrorCode.CONFLICT, "code", "Mã cư dân đã tồn tại trong tòa nhà này.");
    }
}
