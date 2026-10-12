package com.bihome.apartment;

import com.bihome.survey.SurveyResponseRepository;
import com.bihome.transaction.FinancialTransactionRepository;
import com.bihome.servicecatalog.ServiceOrderRepository;
import com.bihome.booking.AmenityBookingRepository;
import com.bihome.apartment.dto.ApartmentDtos;
import com.bihome.accesscard.AccessCardRepository;
import com.bihome.asset.AssetItemRepository;
import com.bihome.building.BuildingService;
import com.bihome.feenotice.FeeNoticeRepository;
import com.bihome.meter.MeterReadingRepository;
import com.bihome.payment.PaymentRepository;
import com.bihome.sos.SosAlertRepository;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.excel.ExcelReader;
import com.bihome.common.excel.ImportResult;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.security.AuthUser;
import com.bihome.common.security.BuildingContext;
import com.bihome.common.storage.FilePurpose;
import com.bihome.common.storage.ImageListResolver;
import com.bihome.common.util.AppTime;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.resident.ApartmentResidentRepository;
import com.bihome.resident.ResidentEnums.ResidenceStatus;
import com.bihome.resident.ResidentEnums.ResidentRole;
import com.bihome.ticket.TicketRepository;
import jakarta.persistence.EntityManager;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import java.io.ByteArrayInputStream;
import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * Căn hộ thuộc phạm vi tòa nhà. Danh sách lọc theo: tòa chỉ định trong filter → tòa đang chọn ở header →
 * mọi tòa user được truy cập (chế độ "Tất cả").
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ApartmentService {

    static final int EXPORT_LIMIT = 10_000;
    private static final int OPTIONS_LIMIT = 20;
    private static final Sort DEFAULT_SORT = Sort.by("code");
    private static final Map<String, String> SORTS = Map.of(
            "code", "code",
            "name", "name",
            "floorNo", "floorNo",
            "area", "area",
            "memberCount", "memberCount",
            "buildingName", "building.name",
            "createdAt", "createdAt",
            "updatedAt", "updatedAt");
    private static final DateTimeFormatter FILE_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");
    /** Oracle giới hạn 1000 phần tử trong IN (...). */
    private static final int IN_CHUNK = 1000;

    private final ApartmentRepository apartments;
    private final AssetItemRepository assetItems;
    private final ApartmentResidentRepository residentLinks;
    private final TicketRepository tickets;
    private final AccessCardRepository accessCards;
    private final AmenityBookingRepository bookings;
    private final ServiceOrderRepository serviceOrders;
    private final FinancialTransactionRepository transactions;
    private final SurveyResponseRepository surveyResponses;
    private final MeterReadingRepository meterReadings;
    private final FeeNoticeRepository feeNotices;
    private final PaymentRepository payments;
    private final SosAlertRepository sosAlerts;
    private final BuildingService buildingService;
    private final BuildingContext buildingContext;
    private final ImageListResolver imageResolver;
    private final ApartmentMapper mapper;
    private final Validator validator;
    private final EntityManager entityManager;
    private final Clock clock;

    public PageResponse<ApartmentDtos.Summary> list(ApartmentDtos.Filter filter, PageParams pageParams) {
        var page = apartments.findAll(spec(filter), pageParams.toPageable(DEFAULT_SORT, SORTS));
        Map<Long, String> owners = ownerNames(page.map(Apartment::getId).getContent());
        return PageResponse.of(page, a -> mapper.toSummary(a, owners.get(a.getId())));
    }

    public byte[] export(ApartmentDtos.Filter filter) {
        if (apartments.count(spec(filter)) > EXPORT_LIMIT) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "Có hơn " + EXPORT_LIMIT + " căn hộ, vui lòng lọc bớt trước khi xuất Excel.");
        }
        List<Apartment> rows = apartments.findAll(spec(filter), Sort.by("building.name", "code"));
        return ApartmentExcel.export(rows, ownerNames(rows.stream().map(Apartment::getId).toList()));
    }

    public String exportFileName(ApartmentDtos.Filter filter) {
        Long buildingId = filter.buildingId() != null ? filter.buildingId()
                : buildingContext.selectedBuildingId().orElse(null);
        String scope = buildingId == null ? "tat-ca" : buildingService.findAccessible(buildingId).getCode().toLowerCase();
        return "can-ho-" + scope + "-" + LocalDate.now(clock.withZone(AppTime.ZONE)).format(FILE_DATE) + ".xlsx";
    }

    public byte[] importTemplate() {
        return ApartmentExcel.template();
    }

    public ApartmentDtos.Response get(Long id) {
        return toResponse(requireAccessible(id));
    }

    /** Gợi ý chọn căn hộ (form khác, vd hạng mục xe): tối đa 20 căn đang hoạt động khớp từ khoá. */
    public List<ApartmentDtos.Option> options(String keyword, Long buildingId) {
        ApartmentDtos.Filter filter = new ApartmentDtos.Filter(keyword, buildingId, null, null, null, null, null, null,
                null, null, null, ActiveStatus.ACTIVE, null, null, null, null);
        return apartments.findAll(spec(filter), PageRequest.of(0, OPTIONS_LIMIT, DEFAULT_SORT)).stream()
                .map(mapper::toOption).toList();
    }

    @Transactional
    public ApartmentDtos.Response create(ApartmentDtos.Request req, AuthUser actor) {
        Long buildingId = req.buildingId() != null ? req.buildingId() : buildingContext.requireBuildingId();
        requireActiveBuilding(buildingId);
        String code = ApartmentExcel.normalizeCode(req.code());
        if (apartments.existsByBuildingIdAndCode(buildingId, code)) {
            throw duplicateCode();
        }
        Apartment apartment = new Apartment();
        apartment.setBuildingId(buildingId);
        apartment.setCode(code);
        apply(apartment, req, actor);
        apartments.saveAndFlush(apartment);
        // Nạp lại để có quan hệ building (chỉ đọc) cho response.
        entityManager.refresh(apartment);
        return toResponse(apartment);
    }

    @Transactional
    public ApartmentDtos.Response update(Long id, ApartmentDtos.Request req, AuthUser actor) {
        Apartment apartment = requireAccessible(id);
        if (req.version() == null || !Objects.equals(apartment.getVersion(), req.version())) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
        String code = ApartmentExcel.normalizeCode(req.code());
        if (apartments.existsByBuildingIdAndCodeAndIdNot(apartment.getBuildingId(), code, id)) {
            throw duplicateCode();
        }
        apartment.setCode(code);
        apply(apartment, req, actor);
        apartments.saveAndFlush(apartment);
        return toResponse(apartment);
    }

    @Transactional
    public ApartmentDtos.Response changeStatus(Long id, ActiveStatus status) {
        Apartment apartment = requireAccessible(id);
        apartment.setStatus(status);
        apartments.saveAndFlush(apartment);
        return toResponse(apartment);
    }

    /** Chặn xoá khi căn hộ còn dữ liệu phụ thuộc (cư dân kể cả lịch sử, yêu cầu hỗ trợ, hạng mục xe...). */
    @Transactional
    public void delete(Long id) {
        Apartment apartment = requireAccessible(id);
        long residentRecords = residentLinks.countByApartmentId(id);
        if (residentRecords > 0) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Căn hộ còn " + residentRecords + " bản ghi cư dân, hãy chuyển sang Không hoạt động.");
        }
        long ticketCount = tickets.countByApartmentId(id);
        if (ticketCount > 0) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Căn hộ có " + ticketCount + " yêu cầu hỗ trợ, hãy chuyển sang Không hoạt động.");
        }
        long cardCount = accessCards.countByApartmentId(id);
        if (cardCount > 0) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Căn hộ còn " + cardCount + " thẻ từ, hãy thu hồi thẻ hoặc chuyển căn sang Không hoạt động.");
        }
        long items = assetItems.countByApartmentId(id);
        if (items > 0) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Căn hộ còn " + items + " hạng mục, hãy chuyển sang Không hoạt động.");
        }
        long usage = bookings.countByApartmentId(id) + serviceOrders.countByApartmentId(id) + transactions.countByApartmentId(id)
                + surveyResponses.countByApartmentId(id);
        if (usage > 0) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Căn hộ đã có đăng ký tiện ích / đơn dịch vụ / giao dịch / phản hồi khảo sát, hãy chuyển sang Không hoạt động.");
        }
        long finance = meterReadings.countByApartmentId(id) + feeNotices.countByApartmentId(id)
                + payments.countByApartmentId(id) + sosAlerts.countByApartmentId(id);
        if (finance > 0) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Căn hộ đã có số liệu điện nước / thông báo phí / phiếu thu / cảnh báo SOS, hãy chuyển sang Không hoạt động.");
        }
        apartments.delete(apartment);
    }

    /**
     * Nhập vào tòa đang chọn ở header. Kiểm tra toàn bộ file trước; nếu {@code stopOnError} và có dòng lỗi
     * thì không lưu dòng nào.
     */
    @Transactional
    public ImportResult importExcel(MultipartFile file, boolean stopOnError, AuthUser actor) {
        Long buildingId = buildingContext.requireBuildingId();
        requireActiveBuilding(buildingId);
        byte[] data = ExcelReader.requireXlsx(file);
        List<ExcelReader.ExcelRow> rows = ExcelReader.read(new ByteArrayInputStream(data), ApartmentExcel.REQUIRED);
        if (rows.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "File không có dòng dữ liệu nào.");
        }

        List<ParsedRow> parsed = rows.stream().map(this::parseRow).toList();
        markDuplicates(parsed, buildingId);
        boolean hasErrors = parsed.stream().anyMatch(p -> p.error != null);

        if (stopOnError && hasErrors) {
            return ImportResult.of(parsed.stream().map(p -> p.toResult(
                    p.error == null ? "Hợp lệ (chưa nhập vì file còn dòng lỗi)" : null)).toList(), false);
        }
        List<Apartment> toSave = new ArrayList<>();
        for (ParsedRow p : parsed) {
            if (p.error == null) {
                Apartment apartment = new Apartment();
                apartment.setBuildingId(buildingId);
                apartment.setCode(p.code);
                apply(apartment, p.request, actor);
                toSave.add(apartment);
            }
        }
        apartments.saveAllAndFlush(toSave);
        return ImportResult.of(parsed.stream().map(p -> p.toResult(p.error == null ? "Đã nhập" : null)).toList(), true);
    }

    private static final class ParsedRow {
        final int rowNumber;
        final String code;
        final ApartmentDtos.Request request;
        String error;

        ParsedRow(int rowNumber, String code, ApartmentDtos.Request request, String error) {
            this.rowNumber = rowNumber;
            this.code = code;
            this.request = request;
            this.error = error;
        }

        ImportResult.Row toResult(String okMessage) {
            return new ImportResult.Row(rowNumber, code, error == null, error == null ? okMessage : error);
        }
    }

    private ParsedRow parseRow(ExcelReader.ExcelRow row) {
        String code = ApartmentExcel.normalizeCode(row.get(ApartmentExcel.CODE));
        try {
            ApartmentDtos.Request request = ApartmentExcel.parse(row);
            Set<ConstraintViolation<ApartmentDtos.Request>> violations = validator.validate(request);
            String error = violations.isEmpty() ? null
                    : violations.stream().map(ConstraintViolation::getMessage).sorted().collect(Collectors.joining("; "));
            return new ParsedRow(row.rowNumber(), code, request, error);
        } catch (ApartmentExcel.CellException e) {
            return new ParsedRow(row.rowNumber(), code, null, e.getMessage());
        }
    }

    private void markDuplicates(List<ParsedRow> parsed, Long buildingId) {
        Map<String, Integer> firstRowByCode = new HashMap<>();
        for (ParsedRow p : parsed) {
            if (p.error != null || p.code.isEmpty()) {
                continue;
            }
            Integer first = firstRowByCode.putIfAbsent(p.code, p.rowNumber);
            if (first != null) {
                p.error = "Trùng mã căn hộ với dòng " + first;
            }
        }
        Set<String> codes = parsed.stream().filter(p -> p.error == null).map(p -> p.code).collect(Collectors.toSet());
        if (codes.isEmpty()) {
            return;
        }
        Set<String> existing = new HashSet<>(apartments.findExistingCodes(buildingId, codes));
        parsed.stream().filter(p -> p.error == null && existing.contains(p.code))
                .forEach(p -> p.error = "Mã căn hộ đã tồn tại trong tòa nhà");
    }

    private ApartmentDtos.Response toResponse(Apartment apartment) {
        Long id = apartment.getId();
        return mapper.toResponse(apartment, id == null ? null : ownerNames(List.of(id)).get(id));
    }

    /**
     * Tên chủ sở hữu còn ở mỗi căn: chủ hộ chính trước, nếu không thì người gắn sớm nhất;
     * có nhiều chủ sở hữu thì thêm "(+N)".
     */
    private Map<Long, String> ownerNames(Collection<Long> apartmentIds) {
        List<Long> ids = List.copyOf(apartmentIds);
        Map<Long, List<Object[]>> byApartment = new HashMap<>();
        for (int i = 0; i < ids.size(); i += IN_CHUNK) {
            residentLinks.findOwners(ids.subList(i, Math.min(ids.size(), i + IN_CHUNK)), ResidentRole.OWNER,
                            ResidenceStatus.MOVED_OUT)
                    .forEach(row -> byApartment.computeIfAbsent((Long) row[0], k -> new ArrayList<>()).add(row));
        }
        Comparator<Object[]> headFirst = Comparator.<Object[], Boolean>comparing(row -> !(Boolean) row[2])
                .thenComparing(row -> (Long) row[3]);
        Map<Long, String> result = new HashMap<>();
        byApartment.forEach((apartmentId, owners) -> {
            owners.sort(headFirst);
            String name = (String) owners.getFirst()[1];
            result.put(apartmentId, owners.size() > 1 ? name + " (+" + (owners.size() - 1) + ")" : name);
        });
        return result;
    }

    private Specification<Apartment> spec(ApartmentDtos.Filter filter) {
        return ApartmentSpecifications.of(filter, scope(filter.buildingId()));
    }

    private Optional<Set<Long>> scope(Long explicitBuildingId) {
        return buildingService.listScope(explicitBuildingId);
    }

    /** Căn hộ phải thuộc tòa user được truy cập, nếu không → 404 (dùng cả cho module khác). */
    public Apartment requireAccessible(Long id) {
        return apartments.findById(id)
                .filter(a -> buildingService.canAccess(a.getBuildingId()))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy căn hộ."));
    }

    private void requireActiveBuilding(Long buildingId) {
        buildingService.requireActive(buildingId, "Tòa nhà đang không hoạt động, không thể thêm căn hộ.");
    }

    private void apply(Apartment apartment, ApartmentDtos.Request req, AuthUser actor) {
        apartment.setName(req.name().trim());
        apartment.setFloorNo(req.floorNo().trim().toUpperCase());
        apartment.setBedrooms(req.bedrooms());
        apartment.setRooms(req.rooms());
        apartment.setArea(req.area());
        apartment.setType(req.type());
        apartment.setOwnershipType(req.ownershipType());
        apartment.setUsageStatus(req.usageStatus());
        apartment.setDescription(req.description() == null || req.description().isBlank() ? null : req.description().trim());
        apartment.setStatus(req.status());
        apartment.setImages(imageResolver.resolve(req.images(), apartment.getImages(), FilePurpose.APARTMENT_IMAGE, actor));
    }

    private static BusinessException duplicateCode() {
        return BusinessException.field(ErrorCode.CONFLICT, "code", "Mã căn hộ đã tồn tại trong tòa nhà này.");
    }
}
