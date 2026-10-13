package com.bihome.servicecatalog;

import com.bihome.apartment.Apartment;
import com.bihome.apartment.ApartmentService;
import com.bihome.building.BuildingService;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.util.AppTime;
import com.bihome.common.util.DailyCodeGenerator;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.common.web.SpecificationBuilder;
import com.bihome.resident.Resident;
import com.bihome.resident.ResidentRepository;
import com.bihome.residentapp.ResidentInboxItem;
import com.bihome.residentapp.ResidentInboxService;
import com.bihome.servicecatalog.ServiceOrder.Status;
import com.bihome.servicecatalog.dto.ServiceOrderDtos;
import com.bihome.transaction.FinancialTransaction.Method;
import com.bihome.transaction.FinancialTransaction.SourceType;
import com.bihome.transaction.FinancialTransaction;
import com.bihome.transaction.TransactionService;
import com.bihome.transaction.dto.TransactionDtos;
import com.bihome.voucher.Voucher.ApplyScope;
import com.bihome.voucher.VoucherRedemptionService.Redemption;
import com.bihome.voucher.VoucherRedemptionService.Target;
import com.bihome.voucher.VoucherRedemptionService;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Đơn dịch vụ: thành tiền = số lượng × đơn giá hiện hành (làm tròn đồng), trừ voucher; có tiền thì sinh giao dịch
 * chưa thanh toán. Huỷ đơn chưa hoàn thành: trả voucher, huỷ khoản chưa thu / hoàn khoản đã thu.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ServiceOrderService {

    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"));
    private static final Map<String, String> SORTS = Map.of(
            "code", "code", "total", "total", "status", "status", "createdAt", "createdAt", "scheduledAt", "scheduledAt");

    private final ServiceOrderRepository orders;
    private final ServiceOfferingRepository services;
    private final ApartmentService apartmentService;
    private final ResidentRepository residents;
    private final BuildingService buildingService;
    private final DailyCodeGenerator codes;
    private final TransactionService transactionService;
    private final ResidentInboxService residentInbox;
    private final VoucherRedemptionService voucherService;
    private final EntityManager entityManager;
    private final Clock clock;

    public PageResponse<ServiceOrderDtos.Response> list(ServiceOrderDtos.Filter f, PageParams pageParams) {
        var page = orders.findAll(spec(f), pageParams.toPageable(DEFAULT_SORT, SORTS));
        Map<Long, TransactionDtos.Summary> tx = transactionService.summaries(SourceType.SERVICE_ORDER,
                page.getContent().stream().map(ServiceOrder::getId).toList());
        return PageResponse.of(page, o -> toResponse(o, tx.get(o.getId())));
    }

    public ServiceOrderDtos.Response get(Long id) {
        ServiceOrder o = requireAccessible(id);
        return toResponse(o, transactionService.find(SourceType.SERVICE_ORDER, id).map(TransactionService::summary).orElse(null));
    }

    public ServiceOrderDtos.QuoteResponse quote(ServiceOrderDtos.Request req) {
        Checked c = check(req);
        Optional<Redemption> r = voucherService.preview(req.voucherCode(), target(c), c.amount());
        BigDecimal discount = r.map(Redemption::discount).orElse(BigDecimal.ZERO);
        return new ServiceOrderDtos.QuoteResponse(c.service().getUnitPrice(), c.service().getUnit(), c.amount(),
                r.map(x -> x.voucher().getCode()).orElse(null), discount, c.amount().subtract(discount));
    }

    @Transactional
    public ServiceOrderDtos.Response create(ServiceOrderDtos.Request req) {
        Checked c = check(req);
        Optional<Redemption> r = voucherService.redeem(req.voucherCode(), target(c), c.amount());
        BigDecimal discount = r.map(Redemption::discount).orElse(BigDecimal.ZERO);
        ServiceOrder o = new ServiceOrder();
        o.setBuildingId(c.service().getBuildingId());
        o.setCode(codes.next("DV"));
        o.setServiceId(c.service().getId());
        o.setApartmentId(c.apartment().getId());
        o.setResidentId(req.residentId());
        o.setQuantity(req.quantity());
        o.setUnitPrice(c.service().getUnitPrice());
        o.setUnit(c.service().getUnit());
        o.setAmount(c.amount());
        o.setVoucherId(r.map(x -> x.voucher().getId()).orElse(null));
        o.setDiscount(discount);
        o.setTotal(c.amount().subtract(discount));
        o.setScheduledAt(req.scheduledAt());
        o.setStatus(Status.PENDING);
        o.setNote(req.note() == null || req.note().isBlank() ? null : req.note().trim());
        orders.saveAndFlush(o);
        r.ifPresent(x -> voucherService.recordUsage(x, o.getApartmentId(), SourceType.SERVICE_ORDER, o.getId()));
        transactionService.record(SourceType.SERVICE_ORDER, o.getId(), o.getCode(), o.getBuildingId(), o.getApartmentId(),
                o.getResidentId(), o.getTotal(), c.service().getName() + " × " + o.getQuantity().stripTrailingZeros().toPlainString()
                        + " " + o.getUnit());
        // Nạp lại để có các quan hệ chỉ đọc (tòa, tiện ích / dịch vụ, căn hộ...) của bản ghi vừa tạo.
        entityManager.flush();
        entityManager.clear();
        return get(o.getId());
    }

    @Transactional
    public ServiceOrderDtos.Response confirm(Long id, Long version) {
        ServiceOrder o = requireVersion(requireAccessible(id), version);
        if (o.getStatus() != Status.PENDING) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "Chỉ xác nhận được đơn đang chờ xác nhận.");
        }
        o.setStatus(Status.CONFIRMED);
        orders.saveAndFlush(o);
        notifyResident(o, "Đơn dịch vụ " + o.getCode() + " đã được xác nhận");
        return get(id);
    }

    @Transactional
    public ServiceOrderDtos.Response complete(Long id, Long version) {
        ServiceOrder o = requireVersion(requireAccessible(id), version);
        if (o.getStatus() != Status.CONFIRMED) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "Chỉ hoàn thành được đơn đã xác nhận.");
        }
        o.setStatus(Status.COMPLETED);
        o.setCompletedAt(OffsetDateTime.now(clock));
        orders.saveAndFlush(o);
        notifyResident(o, "Đơn dịch vụ " + o.getCode() + " đã hoàn thành");
        return get(id);
    }

    /** Hộp thư app: cư dân đặt đơn (nếu có), không thì cư dân có tài khoản đang ở căn. */
    private void notifyResident(ServiceOrder o, String title) {
        String link = "/orders/" + o.getId();
        if (o.getResidentId() != null) {
            residentInbox.toResidents(List.of(o.getResidentId()), ResidentInboxItem.Type.SERVICE_ORDER, title, null, link);
        } else {
            residentInbox.toApartment(o.getApartmentId(), ResidentInboxItem.Type.SERVICE_ORDER, title, null, link);
        }
    }

    @Transactional
    public ServiceOrderDtos.Response cancel(Long id, ServiceOrderDtos.CancelRequest req) {
        ServiceOrder o = requireVersion(requireAccessible(id), req.version());
        if (!o.getStatus().isOpen()) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "Chỉ huỷ được đơn chưa hoàn thành.");
        }
        o.setStatus(Status.CANCELLED);
        o.setCancelReason(req.reason().trim());
        voucherService.release(SourceType.SERVICE_ORDER, o.getId());
        Optional<FinancialTransaction> tx = transactionService.cancel(SourceType.SERVICE_ORDER, o.getId());
        if (tx.isPresent() && tx.get().getStatus() == FinancialTransaction.Status.PAID) {
            transactionService.refund(SourceType.SERVICE_ORDER, o.getId());
        }
        orders.saveAndFlush(o);
        return get(id);
    }

    @Transactional
    public ServiceOrderDtos.Response pay(Long id, Method method) {
        ServiceOrder o = requireAccessible(id);
        if (o.getStatus() == Status.CANCELLED) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "Đơn đã huỷ, không thu phí.");
        }
        transactionService.pay(SourceType.SERVICE_ORDER, o.getId(), method);
        return get(id);
    }

    // ---------------------------------------------------------------- Helpers

    private record Checked(ServiceOffering service, Apartment apartment, BigDecimal amount) {
    }

    private Checked check(ServiceOrderDtos.Request req) {
        ServiceOffering service = services.findById(req.serviceId())
                .filter(s -> buildingService.canAccess(s.getBuildingId()))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy dịch vụ."));
        if (service.getStatus() != ActiveStatus.ACTIVE) {
            throw field("serviceId", "Dịch vụ đang ngừng hoạt động.");
        }
        buildingService.requireActive(service.getBuildingId(), "Tòa nhà đang không hoạt động, không thể tạo đơn dịch vụ.");
        Apartment apartment = apartmentService.requireAccessible(req.apartmentId());
        if (!apartment.getBuildingId().equals(service.getBuildingId())) {
            throw field("apartmentId", "Căn hộ không thuộc tòa của dịch vụ.");
        }
        if (apartment.getStatus() != ActiveStatus.ACTIVE) {
            throw field("apartmentId", "Căn hộ đang không hoạt động.");
        }
        if (req.residentId() != null) {
            Resident resident = residents.findById(req.residentId())
                    .filter(r -> r.getBuildingId().equals(service.getBuildingId()))
                    .orElseThrow(() -> field("residentId", "Cư dân không thuộc tòa của dịch vụ."));
            if (resident.activeLinks().stream().noneMatch(l -> l.getApartmentId().equals(apartment.getId()))) {
                throw field("residentId", "Cư dân không ở căn hộ đã chọn.");
            }
        }
        if (req.scheduledAt() != null && req.scheduledAt().isBefore(OffsetDateTime.now(clock).minusMinutes(5))) {
            throw field("scheduledAt", "Thời gian thực hiện phải sau thời điểm hiện tại.");
        }
        BigDecimal amount = service.getUnitPrice().multiply(req.quantity()).setScale(0, RoundingMode.HALF_UP);
        return new Checked(service, apartment, amount);
    }

    private Target target(Checked c) {
        return new Target(ApplyScope.SERVICE, c.service().getId(), c.service().getBuildingId(), c.apartment().getId(),
                LocalDate.now(clock.withZone(AppTime.ZONE)));
    }

    ServiceOrder requireAccessible(Long id) {
        return orders.findById(id)
                .filter(o -> buildingService.canAccess(o.getBuildingId()))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy đơn dịch vụ."));
    }

    private static ServiceOrder requireVersion(ServiceOrder o, Long version) {
        if (version == null || !Objects.equals(o.getVersion(), version)) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
        return o;
    }

    private Specification<ServiceOrder> spec(ServiceOrderDtos.Filter f) {
        Optional<Set<Long>> scope = buildingService.listScope(f.buildingId());
        return SpecificationBuilder.<ServiceOrder>create()
                .likeAny(f.keyword(), "code", "apartment.code", "service.name", "resident.fullName")
                .like("code", f.code())
                .eq("serviceId", f.serviceId())
                .eq("apartmentId", f.apartmentId())
                .like("apartment.code", f.apartment())
                .eq("status", f.status())
                .dateBetween("createdAt", f.createdFrom(), f.createdTo())
                .and(scope.map(ids -> (Specification<ServiceOrder>) (root, q, cb) ->
                        ids.isEmpty() ? cb.disjunction() : root.get("buildingId").in(ids)).orElse(null))
                .build();
    }

    private static ServiceOrderDtos.Response toResponse(ServiceOrder o, TransactionDtos.Summary tx) {
        return new ServiceOrderDtos.Response(o.getId(), o.getBuildingId(), o.getBuilding().getName(), o.getCode(),
                o.getServiceId(), o.getService().getCode(), o.getService().getName(), o.getApartmentId(),
                o.getApartment().getCode(), o.getResidentId(), o.getResident() == null ? null : o.getResident().getFullName(),
                o.getQuantity(), o.getUnitPrice(), o.getUnit(), o.getAmount(),
                o.getVoucher() == null ? null : o.getVoucher().getCode(), o.getDiscount(), o.getTotal(), o.getScheduledAt(),
                o.getStatus(), o.getNote(), o.getCancelReason(), o.getCompletedAt(), tx, o.getCreatedAt(), o.getCreatedBy(),
                o.getVersion());
    }

    private static BusinessException field(String field, String message) {
        return BusinessException.field(ErrorCode.VALIDATION_ERROR, field, message);
    }
}
