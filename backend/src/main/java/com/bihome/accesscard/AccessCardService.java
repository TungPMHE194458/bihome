package com.bihome.accesscard;

import com.bihome.transaction.TransactionService;
import com.bihome.transaction.FinancialTransaction.SourceType;
import com.bihome.accesscard.AccessCardEnums.CardStatus;
import com.bihome.accesscard.AccessCardEnums.HistoryAction;
import com.bihome.accesscard.dto.AccessCardDtos;
import com.bihome.apartment.Apartment;
import com.bihome.apartment.ApartmentService;
import com.bihome.asset.AssetItem;
import com.bihome.asset.AssetItemRepository;
import com.bihome.building.BuildingService;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.security.BuildingContext;
import com.bihome.common.util.AppTime;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.resident.Resident;
import com.bihome.resident.ResidentEnums.ResidenceStatus;
import com.bihome.resident.ResidentRepository;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Collection;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Thẻ từ theo tòa nhà. Mã thẻ duy nhất toàn hệ thống; luồng trạng thái ở {@link CardStatus}; mỗi lần đổi trạng thái
 * hoặc đổi người dùng thẻ đều ghi ACCESS_CARD_HISTORY. Cư dân chuyển đi thì thẻ của họ tại căn đó bị thu hồi.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AccessCardService {

    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "createdAt");
    private static final Map<String, String> SORTS = Map.of(
            "cardNo", "cardNo",
            "issuedDate", "issuedDate",
            "expiryDate", "expiryDate",
            "apartment", "apartment.code",
            "createdAt", "createdAt");
    private static final Map<CardStatus, String> STATUS_LABELS = new EnumMap<>(Map.of(
            CardStatus.IN_STOCK, "Trong kho",
            CardStatus.IN_USE, "Đang dùng",
            CardStatus.LOCKED, "Khoá",
            CardStatus.LOST, "Báo mất",
            CardStatus.REVOKED, "Thu hồi"));

    private final AccessCardRepository cards;
    private final ApartmentService apartmentService;
    private final TransactionService transactionService;
    private final ResidentRepository residents;
    private final AssetItemRepository assetItems;
    private final BuildingService buildingService;
    private final BuildingContext buildingContext;
    private final AccessCardMapper mapper;
    private final EntityManager entityManager;
    private final Clock clock;

    public PageResponse<AccessCardDtos.Response> list(AccessCardDtos.Filter filter, PageParams pageParams) {
        return PageResponse.of(cards.findAll(
                        AccessCardSpecifications.of(filter, buildingService.listScope(filter.buildingId()), today()),
                        pageParams.toPageable(DEFAULT_SORT, SORTS)),
                c -> mapper.toResponse(c, today()));
    }

    public AccessCardDtos.Response get(Long id) {
        return mapper.toResponse(requireAccessible(id), today());
    }

    public List<AccessCardDtos.HistoryEntry> history(Long id) {
        return requireAccessible(id).getHistory().stream().map(mapper::toHistory).toList();
    }

    /** Thêm vào tòa đang chọn (hoặc tòa của căn hộ nếu cấp luôn). */
    @Transactional
    public AccessCardDtos.Response create(AccessCardDtos.Request req) {
        Apartment apartment = req.apartmentId() == null ? null : apartmentService.requireAccessible(req.apartmentId());
        Long buildingId = apartment != null ? apartment.getBuildingId() : buildingContext.requireBuildingId();
        buildingService.requireActive(buildingId, "Tòa nhà đang không hoạt động, không thể thêm thẻ.");
        AccessCard card = new AccessCard();
        card.setBuildingId(buildingId);
        card.setCardNo(requireUniqueCardNo(req.cardNo(), null));
        card.setCardType(req.cardType());
        card.setIssueFee(req.issueFee());
        card.setNote(trimToNull(req.note()));
        if (apartment != null) {
            card.setStatus(CardStatus.IN_USE);
            assign(card, apartment, req.residentId(), req.assetItemId());
            card.setIssuedDate(req.issuedDate() != null ? req.issuedDate() : today());
        } else {
            requireUnassigned(req.residentId(), req.assetItemId());
            card.setStatus(CardStatus.IN_STOCK);
            card.setIssuedDate(req.issuedDate());
        }
        card.setExpiryDate(req.expiryDate());
        requireDates(card);
        addHistory(card, apartment != null ? HistoryAction.ISSUED : HistoryAction.CREATED, null, card.getNote());
        cards.saveAndFlush(card);
        return mapper.toResponse(reloaded(card.getId()), today());
    }

    @Transactional
    public AccessCardDtos.Response update(Long id, AccessCardDtos.Request req) {
        AccessCard card = requireAccessible(id);
        requireVersion(card, req.version());
        card.setCardNo(requireUniqueCardNo(req.cardNo(), id));
        card.setCardType(req.cardType());
        if (CardStatus.ASSIGNED.contains(card.getStatus())) {
            if (req.apartmentId() == null) {
                throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "apartmentId",
                        "Thẻ đang dùng phải gắn căn hộ; muốn bỏ gắn hãy Thu hồi thẻ.");
            }
            boolean changed = !Objects.equals(card.getApartmentId(), req.apartmentId())
                    || !Objects.equals(card.getResidentId(), req.residentId())
                    || !Objects.equals(card.getAssetItemId(), req.assetItemId());
            Apartment apartment = apartmentService.requireAccessible(req.apartmentId());
            assign(card, apartment, req.residentId(), req.assetItemId());
            if (changed) {
                addHistory(card, HistoryAction.REASSIGNED, card.getStatus(), null);
            }
        } else if (card.getStatus() != CardStatus.LOST) {
            requireUnassigned(req.residentId(), req.assetItemId());
            if (req.apartmentId() != null) {
                throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "apartmentId",
                        "Thẻ trong kho chưa gắn căn hộ — dùng Cấp thẻ.");
            }
        }
        card.setIssuedDate(req.issuedDate());
        card.setExpiryDate(req.expiryDate());
        card.setIssueFee(req.issueFee());
        card.setNote(trimToNull(req.note()));
        requireDates(card);
        cards.saveAndFlush(card);
        return mapper.toResponse(reloaded(id), today());
    }

    /** Cấp thẻ trong kho cho căn hộ / cư dân / xe. */
    @Transactional
    public AccessCardDtos.Response issue(Long id, AccessCardDtos.IssueRequest req) {
        AccessCard card = requireAccessible(id);
        requireVersion(card, req.version());
        if (card.getStatus() != CardStatus.IN_STOCK) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "Chỉ cấp được thẻ đang ở trạng thái Trong kho.");
        }
        Apartment apartment = apartmentService.requireAccessible(req.apartmentId());
        assign(card, apartment, req.residentId(), req.assetItemId());
        card.setStatus(CardStatus.IN_USE);
        card.setIssuedDate(req.issuedDate() != null ? req.issuedDate() : today());
        if (req.expiryDate() != null) {
            card.setExpiryDate(req.expiryDate());
        }
        if (req.issueFee() != null) {
            card.setIssueFee(req.issueFee());
        }
        requireDates(card);
        addHistory(card, HistoryAction.ISSUED, CardStatus.IN_STOCK, trimToNull(req.note()));
        cards.saveAndFlush(card);
        // Phí làm thẻ: mỗi lần cấp một giao dịch; thẻ được cấp lại sau khi nhập kho thì giao dịch cũ giữ nguyên.
        if (transactionService.find(SourceType.ACCESS_CARD, card.getId()).isEmpty()) {
            transactionService.record(SourceType.ACCESS_CARD, card.getId(), card.getCardNo(), card.getBuildingId(),
                    card.getApartmentId(), card.getResidentId(), card.getIssueFee(), "Phí làm thẻ " + card.getCardNo());
        }
        return mapper.toResponse(reloaded(id), today());
    }

    /** Khoá / mở khoá / báo mất / thu hồi / nhập lại kho. */
    @Transactional
    public AccessCardDtos.Response changeStatus(Long id, AccessCardDtos.StatusRequest req) {
        AccessCard card = requireAccessible(id);
        requireVersion(card, req.version());
        CardStatus from = card.getStatus();
        CardStatus to = req.status();
        if (from == CardStatus.IN_STOCK && to == CardStatus.IN_USE) {
            throw BusinessException.field(ErrorCode.BUSINESS_RULE_VIOLATION, "status",
                    "Thẻ trong kho cần Cấp thẻ cho căn hộ trước khi dùng.");
        }
        if (!from.canMoveTo(to)) {
            throw BusinessException.field(ErrorCode.BUSINESS_RULE_VIOLATION, "status",
                    "Không thể chuyển thẻ từ \"" + STATUS_LABELS.get(from) + "\" sang \"" + STATUS_LABELS.get(to) + "\".");
        }
        if (to == CardStatus.IN_USE && card.getAssetItemId() != null
                && cards.existsActiveForItem(card.getAssetItemId(), CardStatus.ASSIGNED, card.getId())) {
            throw new BusinessException(ErrorCode.CONFLICT, "Xe của thẻ đã được liên kết với thẻ khác đang dùng.");
        }
        transition(card, to, trimToNull(req.note()));
        cards.saveAndFlush(card);
        return mapper.toResponse(reloaded(id), today());
    }

    /** Chỉ xoá được thẻ trong kho chưa từng cấp (nhập nhầm); thẻ khác hãy Thu hồi. */
    @Transactional
    public void delete(Long id) {
        AccessCard card = requireAccessible(id);
        boolean everIssued = card.getHistory().stream().anyMatch(h -> h.getAction() != HistoryAction.CREATED);
        if (card.getStatus() != CardStatus.IN_STOCK || everIssued) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Chỉ xoá được thẻ trong kho chưa từng cấp; thẻ đã dùng hãy chuyển Thu hồi để giữ lịch sử.");
        }
        cards.delete(card);
    }

    /** Cư dân chuyển đi khỏi các căn: thu hồi thẻ của họ tại các căn đó. @return số thẻ đã thu hồi */
    @Transactional
    public int revokeForResident(Long residentId, Collection<Long> apartmentIds) {
        if (apartmentIds.isEmpty()) {
            return 0;
        }
        List<AccessCard> list = cards.findAssignedTo(residentId, apartmentIds, CardStatus.ASSIGNED);
        list.forEach(c -> transition(c, CardStatus.REVOKED, "Thu hồi khi cư dân chuyển đi"));
        cards.saveAllAndFlush(list);
        return list.size();
    }

    /** Job: thu hồi thẻ của cư dân không còn ở căn của thẻ (chuyển đi theo ngày hẹn). */
    @Transactional
    public int revokeOrphaned() {
        List<AccessCard> list = cards.findOrphaned(CardStatus.ASSIGNED, ResidenceStatus.MOVED_OUT);
        list.forEach(c -> transition(c, CardStatus.REVOKED, "Thu hồi khi cư dân chuyển đi"));
        cards.saveAllAndFlush(list);
        return list.size();
    }

    // ---------------------------------------------------------------- Helpers

    AccessCard requireAccessible(Long id) {
        return cards.findById(id)
                .filter(c -> buildingService.canAccess(c.getBuildingId()))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy thẻ từ."));
    }

    /** Ghi lịch sử với căn/cư dân trước khi bỏ gắn (thu hồi / nhập kho). */
    private void transition(AccessCard card, CardStatus to, String note) {
        CardStatus from = card.getStatus();
        card.setStatus(to);
        addHistory(card, HistoryAction.STATUS_CHANGE, from, note);
        if (to == CardStatus.REVOKED || to == CardStatus.IN_STOCK) {
            card.clearAssignment();
        }
    }

    private void assign(AccessCard card, Apartment apartment, Long residentId, Long assetItemId) {
        if (!apartment.getBuildingId().equals(card.getBuildingId())) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "apartmentId", "Căn hộ không thuộc tòa của thẻ.");
        }
        boolean apartmentChanged = !apartment.getId().equals(card.getApartmentId());
        if (apartmentChanged && apartment.getStatus() != ActiveStatus.ACTIVE) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "apartmentId", "Căn hộ đang không hoạt động.");
        }
        if (residentId != null && (apartmentChanged || !residentId.equals(card.getResidentId()))) {
            Resident resident = residents.findById(residentId)
                    .filter(r -> r.getBuildingId().equals(card.getBuildingId()))
                    .orElseThrow(() -> BusinessException.field(ErrorCode.VALIDATION_ERROR, "residentId",
                            "Cư dân không thuộc tòa của thẻ."));
            boolean living = resident.activeLinks().stream().anyMatch(l -> l.getApartmentId().equals(apartment.getId()));
            if (!living) {
                throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "residentId", "Cư dân không ở căn hộ đã chọn.");
            }
        }
        if (assetItemId != null) {
            if (!card.getCardType().allowsVehicle()) {
                throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "assetItemId",
                        "Chỉ thẻ Gửi xe hoặc Đa năng mới liên kết được với xe.");
            }
            if (apartmentChanged || !assetItemId.equals(card.getAssetItemId())) {
                AssetItem item = assetItems.findById(assetItemId)
                        .filter(i -> i.getApartmentId().equals(apartment.getId()))
                        .orElseThrow(() -> BusinessException.field(ErrorCode.VALIDATION_ERROR, "assetItemId",
                                "Hạng mục không thuộc căn hộ đã chọn."));
                if (item.getStatus() != ActiveStatus.ACTIVE) {
                    throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "assetItemId", "Hạng mục đang không hoạt động.");
                }
            }
            if (cards.existsActiveForItem(assetItemId, CardStatus.ASSIGNED, card.getId())) {
                throw BusinessException.field(ErrorCode.CONFLICT, "assetItemId", "Xe đã được liên kết với thẻ khác đang dùng.");
            }
        }
        card.setApartmentId(apartment.getId());
        card.setResidentId(residentId);
        card.setAssetItemId(assetItemId);
    }

    private static void requireUnassigned(Long residentId, Long assetItemId) {
        if (residentId != null || assetItemId != null) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "apartmentId",
                    "Chọn căn hộ trước khi gắn cư dân / xe cho thẻ.");
        }
    }

    private void addHistory(AccessCard card, HistoryAction action, CardStatus from, String note) {
        AccessCardHistory h = new AccessCardHistory();
        h.setCard(card);
        h.setAction(action);
        h.setFromStatus(from);
        h.setToStatus(card.getStatus());
        h.setNote(note);
        if (card.getApartmentId() != null) {
            Apartment a = entityManager.find(Apartment.class, card.getApartmentId());
            h.setApartmentLabel(a == null ? null : a.getCode() + " – " + a.getName());
        }
        if (card.getResidentId() != null) {
            Resident r = entityManager.find(Resident.class, card.getResidentId());
            h.setResidentName(r == null ? null : r.getFullName());
        }
        card.getHistory().add(h);
    }

    private String requireUniqueCardNo(String requested, Long excludeId) {
        String cardNo = requested.trim().replaceAll("\\s+", "").toUpperCase(Locale.ROOT);
        boolean taken = excludeId == null ? cards.existsByCardNo(cardNo) : cards.existsByCardNoAndIdNot(cardNo, excludeId);
        if (taken) {
            throw BusinessException.field(ErrorCode.CONFLICT, "cardNo", "Mã thẻ đã tồn tại.");
        }
        return cardNo;
    }

    private static void requireDates(AccessCard card) {
        if (card.getExpiryDate() != null && card.getIssuedDate() != null
                && card.getExpiryDate().isBefore(card.getIssuedDate())) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "expiryDate", "Ngày hết hạn phải sau ngày cấp.");
        }
    }

    private static void requireVersion(AccessCard card, Long version) {
        if (version == null || !Objects.equals(card.getVersion(), version)) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
    }

    /** Đọc lại để có quan hệ chỉ đọc (căn hộ, cư dân, xe) sau khi gắn qua cột id. */
    private AccessCard reloaded(Long id) {
        cards.flush();
        entityManager.clear();
        return requireAccessible(id);
    }

    private LocalDate today() {
        return LocalDate.now(clock.withZone(AppTime.ZONE));
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
