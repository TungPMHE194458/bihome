package com.bihome.residentapp;

import com.bihome.accesscard.AccessCardEnums.CardStatus;
import com.bihome.accesscard.AccessCardService;
import com.bihome.accesscard.dto.AccessCardDtos;
import com.bihome.asset.AssetCategoryService;
import com.bihome.asset.AssetItemService;
import com.bihome.asset.dto.AssetDtos;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.storage.FileService;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.declaration.DeclarationService;
import com.bihome.declaration.dto.DeclarationDtos;
import com.bihome.document.DocumentAudience;
import com.bihome.document.DocumentService;
import com.bihome.document.dto.DocumentDtos;
import com.bihome.resident.ResidentEnums.ResidenceStatus;
import com.bihome.resident.ResidentEnums.ResidentRole;
import com.bihome.resident.ResidentService;
import com.bihome.resident.dto.ResidentDtos;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * App cư dân – căn hộ của tôi: thành viên, xe, thẻ từ (chỉ xem), kê khai thành viên / xe (BQL duyệt), tài liệu BQL công
 * bố cho cư dân. Luôn kiểm tra căn thuộc cư dân trước ({@link ResidentContext}).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ResidentHouseholdService {

    private static final PageParams FIRST_50 = new PageParams(0, 50, null);
    private static final Set<CardStatus> VISIBLE_CARDS = EnumSet.of(CardStatus.IN_USE, CardStatus.LOCKED, CardStatus.LOST);

    private final ResidentContext context;
    private final ResidentService residentService;
    private final AssetItemService assetItemService;
    private final AssetCategoryService assetCategoryService;
    private final AccessCardService accessCardService;
    private final DeclarationService declarationService;
    private final DocumentService documentService;

    // ------------------------------------------------------------ Căn hộ

    /** Người đang ở căn (đã chuyển đi thì không hiện). */
    public List<ResidentDtos.ApartmentMember> members(Long apartmentId) {
        context.requireApartment(apartmentId);
        return residentService.byApartment(apartmentId).stream()
                .filter(m -> m.residenceStatus() != ResidenceStatus.MOVED_OUT).toList();
    }

    public List<AssetDtos.ItemResponse> vehicles(Long apartmentId) {
        context.requireApartment(apartmentId);
        return assetItemService.list(new AssetDtos.ItemFilter(null, null, apartmentId, null, null, null, null, null, null,
                ActiveStatus.ACTIVE, null, null, null, null), FIRST_50).content();
    }

    public List<AccessCardDtos.Response> accessCards(Long apartmentId) {
        context.requireApartment(apartmentId);
        return accessCardService.list(new AccessCardDtos.Filter(null, null, null, null, apartmentId, null, null, null, null,
                null, null, null, null), FIRST_50).content().stream().filter(c -> VISIBLE_CARDS.contains(c.status())).toList();
    }

    public List<AssetDtos.CategoryOption> vehicleCategories(Long apartmentId) {
        ResidentSession.ApartmentRef a = context.requireApartment(apartmentId);
        return assetCategoryService.options(a.buildingId());
    }

    // ------------------------------------------------------------ Kê khai

    public List<DeclarationDtos.Response> declarations(Long apartmentId) {
        context.requireApartment(apartmentId);
        return declarationService.forApartment(apartmentId);
    }

    public DeclarationDtos.Response declaration(Long id) {
        DeclarationDtos.Response d = declarationService.get(id);
        context.requireOwned(d.apartmentId(), "Không tìm thấy phiếu kê khai.");
        return d;
    }

    @Transactional
    public DeclarationDtos.Response declareMember(DeclarationDtos.MemberRequest req) {
        ResidentSession.ApartmentRef a = requireDeclarer(req.apartmentId());
        ResidentSession s = context.current();
        return declarationService.submitMember(req, a.buildingId(), s.residentId(), s.actor());
    }

    @Transactional
    public DeclarationDtos.Response declareVehicle(DeclarationDtos.VehicleRequest req) {
        ResidentSession.ApartmentRef a = requireDeclarer(req.apartmentId());
        return declarationService.submitVehicle(req, a.buildingId(), context.current().residentId());
    }

    @Transactional
    public DeclarationDtos.Response cancelDeclaration(Long id) {
        declaration(id);
        return declarationService.cancel(id, context.current().residentId());
    }

    private ResidentSession.ApartmentRef requireDeclarer(Long apartmentId) {
        ResidentSession.ApartmentRef a = context.requireApartment(apartmentId);
        if (!DeclarationService.canDeclare(a.role())) {
            throw new BusinessException(ErrorCode.FORBIDDEN,
                    "Chỉ chủ sở hữu hoặc người thuê của căn hộ được kê khai. Vui lòng nhờ chủ hộ hoặc liên hệ Ban quản lý.");
        }
        return a;
    }

    // ------------------------------------------------------------ Tài liệu

    public PageResponse<DocumentDtos.Response> documents(Long apartmentId, PageParams pageParams) {
        ResidentSession.ApartmentRef a = context.requireApartment(apartmentId);
        return documentService.listForAudiences(a.buildingId(), audiences(a.role()), pageParams);
    }

    public FileService.FileContent documentContent(Long id, Long apartmentId) {
        ResidentSession.ApartmentRef a = context.requireApartment(apartmentId);
        DocumentDtos.Response d = documentService.get(id);
        if (!d.buildingId().equals(a.buildingId()) || !audiences(a.role()).contains(d.audience())) {
            throw new NotFoundException("Không tìm thấy tài liệu.");
        }
        return documentService.content(id);
    }

    /** Tài liệu "Chủ sở hữu" / "Người thuê" chỉ hiện cho cư dân có vai trò đó ở căn đang xem. */
    static Set<DocumentAudience> audiences(ResidentRole role) {
        return switch (role) {
            case OWNER -> EnumSet.of(DocumentAudience.ALL_RESIDENTS, DocumentAudience.OWNERS);
            case TENANT -> EnumSet.of(DocumentAudience.ALL_RESIDENTS, DocumentAudience.TENANTS);
            default -> EnumSet.of(DocumentAudience.ALL_RESIDENTS);
        };
    }
}
