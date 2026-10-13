package com.bihome.declaration;

import com.bihome.asset.AssetCategory;
import com.bihome.asset.AssetCategoryRepository;
import com.bihome.asset.AssetItemService;
import com.bihome.asset.dto.AssetDtos;
import com.bihome.building.BuildingService;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.security.AuthUser;
import com.bihome.common.security.CurrentUser;
import com.bihome.common.storage.FilePurpose;
import com.bihome.common.storage.FileService;
import com.bihome.common.util.DailyCodeGenerator;
import com.bihome.common.util.PhoneNumbers;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.common.web.SpecificationBuilder;
import com.bihome.declaration.Declaration.Status;
import com.bihome.declaration.Declaration.Type;
import com.bihome.declaration.dto.DeclarationDtos;
import com.bihome.notification.NotificationService;
import com.bihome.notification.NotificationType;
import com.bihome.resident.Resident;
import com.bihome.resident.ResidentEnums.ResidenceStatus;
import com.bihome.resident.ResidentEnums.ResidentRole;
import com.bihome.resident.ResidentRepository;
import com.bihome.resident.ResidentService;
import com.bihome.resident.dto.ResidentDtos;
import com.bihome.residentapp.ResidentInboxItem;
import com.bihome.residentapp.ResidentInboxService;
import com.bihome.user.AppUser;
import com.bihome.user.AppUserRepository;
import com.bihome.user.UserStatus;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Kê khai thành viên / xe từ app cư dân. Gửi (residentapp đã kiểm tra căn thuộc người gửi và vai trò) → báo BQL có
 * quyền ở tòa. Duyệt: thành viên → tạo cư dân mới qua {@link ResidentService#create} (hoặc gắn cư dân sẵn có cùng SĐT
 * trong tòa vào căn), xe → tạo hạng mục qua {@link AssetItemService#create}; mọi luật của module đó giữ nguyên. Kết quả
 * báo về hộp thư app của người gửi.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DeclarationService {

    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"));
    private static final Map<String, String> SORTS = Map.of("code", "code", "createdAt", "createdAt", "status", "status",
            "apartment", "apartment.code");

    private final DeclarationRepository declarations;
    private final ResidentRepository residents;
    private final ResidentService residentService;
    private final AssetItemService assetItemService;
    private final AssetCategoryRepository categories;
    private final BuildingService buildingService;
    private final FileService fileService;
    private final NotificationService notificationService;
    private final ResidentInboxService residentInbox;
    private final AppUserRepository users;
    private final DailyCodeGenerator codes;
    private final EntityManager entityManager;
    private final Clock clock;

    // ---------------------------------------------------------------- App cư dân

    @Transactional
    public DeclarationDtos.Response submitMember(DeclarationDtos.MemberRequest req, Long buildingId, Long submitterId,
                                                 AuthUser actor) {
        buildingService.requireActive(buildingId, "Tòa nhà đang không hoạt động.");
        String phone = PhoneNumbers.normalize(req.phone());
        if (phone != null && declarations.existsPendingMember(req.apartmentId(), phone, Status.PENDING)) {
            throw BusinessException.field(ErrorCode.CONFLICT, "phone", "Đã có phiếu kê khai đang chờ duyệt với số điện thoại này.");
        }
        Declaration d = newDeclaration(Type.MEMBER, buildingId, req.apartmentId(), submitterId);
        d.setFullName(req.fullName().trim());
        d.setPhone(phone);
        d.setEmail(trimToNull(req.email()));
        d.setGender(req.gender());
        d.setDateOfBirth(req.dateOfBirth());
        d.setIdType(req.idType());
        d.setIdNumber(trimToNull(req.idNumber()));
        d.setRole(req.role());
        d.setRelationship(req.relationship());
        d.setMoveInDate(req.moveInDate() == null ? LocalDate.now(clock) : req.moveInDate());
        d.setNote(trimToNull(req.note()));
        if (req.photoFileId() != null) {
            fileService.requireOwnUpload(req.photoFileId(), FilePurpose.RESIDENT_AVATAR, actor, "photoFileId", "Ảnh không hợp lệ.");
            d.setPhotoFileId(req.photoFileId());
        }
        return saveAndNotify(d, "RESIDENT_WRITE", "Kê khai thành viên mới", d.getFullName());
    }

    @Transactional
    public DeclarationDtos.Response submitVehicle(DeclarationDtos.VehicleRequest req, Long buildingId, Long submitterId) {
        buildingService.requireActive(buildingId, "Tòa nhà đang không hoạt động.");
        AssetCategory category = categories.findById(req.categoryId())
                .filter(c -> c.getBuildingId().equals(buildingId) && c.getStatus() == ActiveStatus.ACTIVE)
                .orElseThrow(() -> BusinessException.field(ErrorCode.VALIDATION_ERROR, "categoryId", "Loại xe không hợp lệ."));
        String plate = normalizePlate(req.plateNumber());
        if (plate != null && declarations.existsPendingVehicle(req.apartmentId(), plate, Status.PENDING)) {
            throw BusinessException.field(ErrorCode.CONFLICT, "plateNumber", "Đã có phiếu kê khai đang chờ duyệt với biển số này.");
        }
        Declaration d = newDeclaration(Type.VEHICLE, buildingId, req.apartmentId(), submitterId);
        d.setCategoryId(category.getId());
        d.setVehicleName(req.vehicleName().trim());
        d.setPlateNumber(plate);
        d.setVehicleDescription(trimToNull(req.vehicleDescription()));
        d.setNote(trimToNull(req.note()));
        return saveAndNotify(d, "ASSET_WRITE", "Kê khai xe mới", d.getVehicleName() + (plate == null ? "" : " – " + plate));
    }

    /** Phiếu của một căn (mọi người gửi trong căn), mới nhất trước. */
    public List<DeclarationDtos.Response> forApartment(Long apartmentId) {
        return declarations.findByApartmentIdOrderByCreatedAtDescIdDesc(apartmentId).stream().map(this::toResponse).toList();
    }

    /** Người gửi huỷ phiếu còn chờ duyệt. */
    @Transactional
    public DeclarationDtos.Response cancel(Long id, Long submitterId) {
        Declaration d = declarations.findById(id).filter(x -> x.getSubmittedById().equals(submitterId))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy phiếu kê khai."));
        requirePending(d);
        d.setStatus(Status.CANCELLED);
        declarations.flush();
        return reload(d.getId());
    }

    // ---------------------------------------------------------------- Web BQL

    public PageResponse<DeclarationDtos.Response> list(DeclarationDtos.Filter f, PageParams pageParams) {
        var page = declarations.findAll(spec(f), pageParams.toPageable(DEFAULT_SORT, SORTS));
        return PageResponse.of(page, this::toResponse);
    }

    public DeclarationDtos.Response get(Long id) {
        return toResponse(requireAccessible(id));
    }

    @Transactional
    public DeclarationDtos.Response approve(Long id, DeclarationDtos.ApproveRequest req) {
        Declaration d = requireAccessible(id);
        requireVersion(d, req.version());
        requirePending(d);
        requirePermission(d);
        if (d.getType() == Type.MEMBER) {
            approveMember(d, req);
        } else {
            approveVehicle(d, req);
        }
        d.setStatus(Status.APPROVED);
        reviewed(d);
        declarations.saveAndFlush(d);
        String what = d.getType() == Type.MEMBER ? "thành viên " + d.getFullName() : "xe " + d.getVehicleName();
        residentInbox.toResidents(List.of(d.getSubmittedById()), ResidentInboxItem.Type.DECLARATION,
                "Đã duyệt kê khai " + what, "Phiếu " + d.getCode() + " đã được Ban quản lý duyệt.", "/declarations/" + d.getId());
        return reload(d.getId());
    }

    @Transactional
    public DeclarationDtos.Response reject(Long id, DeclarationDtos.RejectRequest req) {
        Declaration d = requireAccessible(id);
        requireVersion(d, req.version());
        requirePending(d);
        requirePermission(d);
        d.setStatus(Status.REJECTED);
        d.setRejectReason(req.reason().trim());
        reviewed(d);
        declarations.saveAndFlush(d);
        residentInbox.toResidents(List.of(d.getSubmittedById()), ResidentInboxItem.Type.DECLARATION,
                "Phiếu kê khai " + d.getCode() + " bị từ chối", "Lý do: " + d.getRejectReason(), "/declarations/" + d.getId());
        return reload(d.getId());
    }

    public long countPending(Long buildingId) {
        return declarations.countByBuildingIdAndStatus(buildingId, Status.PENDING);
    }

    // ---------------------------------------------------------------- Duyệt

    private void approveMember(Declaration d, DeclarationDtos.ApproveRequest req) {
        if (req.fullName() != null && !req.fullName().isBlank()) d.setFullName(req.fullName().trim());
        if (req.phone() != null && !req.phone().isBlank()) d.setPhone(PhoneNumbers.normalize(req.phone()));
        if (req.email() != null) d.setEmail(trimToNull(req.email()));
        if (req.gender() != null) d.setGender(req.gender());
        if (req.dateOfBirth() != null) d.setDateOfBirth(req.dateOfBirth());
        if (req.idType() != null) d.setIdType(req.idType());
        if (req.idNumber() != null) d.setIdNumber(trimToNull(req.idNumber()));
        if (req.role() != null) d.setRole(req.role());
        if (req.relationship() != null) d.setRelationship(req.relationship());
        if (req.moveInDate() != null) d.setMoveInDate(req.moveInDate());
        if (d.getPhone() == null) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "phone",
                    "Nhập số điện thoại cho cư dân (bắt buộc, không trùng với cư dân khác trong tòa).");
        }
        ResidentDtos.LinkRequest link = new ResidentDtos.LinkRequest(d.getApartmentId(), d.getRole(), d.getRelationship(),
                false, d.getMoveInDate(), null, ResidenceStatus.LIVING, false, null);
        Optional<Resident> existing = residents.findByBuildingIdAndPhone(d.getBuildingId(), d.getPhone());
        if (existing.isPresent()) {
            // Người này đã là cư dân của tòa (vd ở căn khác): gắn thêm vào căn thay vì tạo trùng.
            residentService.assignApartment(existing.get().getId(), link);
            d.setResultResidentId(existing.get().getId());
            return;
        }
        ResidentDtos.Response created = residentService.create(new ResidentDtos.Request(null, d.getFullName(), d.getPhone(),
                d.getEmail(), d.getGender(), d.getDateOfBirth(), d.getIdType(), d.getIdNumber(), null, null, null, null,
                d.getNote(), link, null), CurrentUser.get());
        d.setResultResidentId(created.id());
        if (d.getPhotoFileId() != null) {
            // Ảnh do cư dân gửi tải lên (không phải người duyệt) nên gán thẳng thay vì qua kiểm tra người tải.
            residents.findById(created.id()).ifPresent(r -> r.setAvatarFileId(d.getPhotoFileId()));
        }
    }

    private void approveVehicle(Declaration d, DeclarationDtos.ApproveRequest req) {
        if (req.categoryId() != null) d.setCategoryId(req.categoryId());
        if (req.vehicleName() != null && !req.vehicleName().isBlank()) d.setVehicleName(req.vehicleName().trim());
        if (req.plateNumber() != null) d.setPlateNumber(normalizePlate(req.plateNumber()));
        if (req.vehicleDescription() != null) d.setVehicleDescription(trimToNull(req.vehicleDescription()));
        if (d.getCategoryId() == null) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "categoryId", "Vui lòng chọn danh mục.");
        }
        AssetDtos.ItemResponse item = assetItemService.create(new AssetDtos.ItemRequest(d.getApartmentId(), d.getCategoryId(),
                d.getVehicleName(), d.getPlateNumber(), d.getVehicleDescription(), null, LocalDate.now(clock), null,
                ActiveStatus.ACTIVE, null));
        d.setResultAssetItemId(item.id());
    }

    /** Duyệt thành viên cần quyền sửa cư dân, duyệt xe cần quyền sửa hạng mục căn hộ. */
    private static void requirePermission(Declaration d) {
        String permission = d.getType() == Type.MEMBER ? "RESIDENT_WRITE" : "ASSET_WRITE";
        if (!CurrentUser.get().permissions().contains(permission)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
    }

    // ---------------------------------------------------------------- Chung

    private Declaration newDeclaration(Type type, Long buildingId, Long apartmentId, Long submitterId) {
        Declaration d = new Declaration();
        d.setBuildingId(buildingId);
        d.setApartmentId(apartmentId);
        d.setSubmittedById(submitterId);
        d.setType(type);
        d.setStatus(Status.PENDING);
        d.setCode(codes.next("KK"));
        return d;
    }

    private DeclarationDtos.Response saveAndNotify(Declaration d, String permission, String title, String body) {
        declarations.saveAndFlush(d);
        List<Long> recipients = users.findHandlers(permission, d.getBuildingId(), UserStatus.ACTIVE).stream()
                .filter(u -> u.getBuildingIds().contains(d.getBuildingId())).map(AppUser::getId).toList();
        DeclarationDtos.Response saved = reload(d.getId());
        notificationService.notify(recipients, NotificationType.DECLARATION, title + " – căn " + saved.apartmentCode(), body,
                "/declarations?view=" + d.getId(), d.getBuildingId());
        return saved;
    }

    private void reviewed(Declaration d) {
        d.setReviewedAt(OffsetDateTime.now(clock));
        d.setReviewedBy(CurrentUser.get().username());
    }

    private Declaration requireAccessible(Long id) {
        return declarations.findById(id).filter(d -> buildingService.canAccess(d.getBuildingId()))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy phiếu kê khai."));
    }

    private static void requirePending(Declaration d) {
        if (d.getStatus() != Status.PENDING) {
            throw new BusinessException(ErrorCode.CONFLICT, "Phiếu kê khai đã được xử lý.");
        }
    }

    private static void requireVersion(Declaration d, Long version) {
        if (!d.getVersion().equals(version)) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
    }

    private DeclarationDtos.Response reload(Long id) {
        entityManager.flush();
        entityManager.clear();
        return toResponse(declarations.findById(id).orElseThrow());
    }

    private Specification<Declaration> spec(DeclarationDtos.Filter f) {
        Optional<Set<Long>> scope = buildingService.listScope(f.buildingId());
        return SpecificationBuilder.<Declaration>create()
                .likeAny(f.keyword(), "code", "fullName", "phone", "vehicleName", "plateNumber", "apartment.code")
                .eq("type", f.type())
                .eq("status", f.status())
                .eq("apartmentId", f.apartmentId())
                .like("apartment.code", f.apartment())
                .dateBetween("createdAt", f.createdFrom(), f.createdTo())
                .and(scope.map(ids -> (Specification<Declaration>) (root, q, cb) ->
                        ids.isEmpty() ? cb.disjunction() : root.get("buildingId").in(ids)).orElse(null))
                .build();
    }

    private DeclarationDtos.Response toResponse(Declaration d) {
        Resident by = d.getSubmittedBy();
        return new DeclarationDtos.Response(d.getId(), d.getBuildingId(), d.getCode(), d.getType(), d.getStatus(),
                d.getApartmentId(), d.getApartment() == null ? null : d.getApartment().getCode(), d.getSubmittedById(),
                by == null ? null : by.getFullName(), by == null ? null : by.getPhone(), d.getFullName(), d.getPhone(),
                d.getEmail(), d.getGender(), d.getDateOfBirth(), d.getIdType(), d.getIdNumber(), d.getRole(),
                d.getRelationship(), d.getMoveInDate(), d.getPhotoFileId() == null ? null : fileService.urlFor(d.getPhotoFileId()),
                d.getCategoryId(), d.getCategory() == null ? null : d.getCategory().getName(), d.getVehicleName(),
                d.getPlateNumber(), d.getVehicleDescription(), d.getNote(), d.getReviewedAt(), d.getReviewedBy(),
                d.getRejectReason(), d.getResultResidentId(), d.getResultAssetItemId(), d.getCreatedAt(), d.getVersion());
    }

    /** Cùng cách chuẩn hoá biển số với hạng mục căn hộ (asset.PlateNumbers). */
    static String normalizePlate(String plate) {
        if (plate == null || plate.isBlank()) {
            return null;
        }
        return plate.trim().replaceAll("\\s+", " ").toUpperCase(Locale.ROOT);
    }

    private static String trimToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    /** Vai trò được kê khai: chủ sở hữu hoặc người thuê của căn (thành viên gia đình / khách lưu trú thì không). */
    public static boolean canDeclare(ResidentRole role) {
        return role == ResidentRole.OWNER || role == ResidentRole.TENANT;
    }
}
