package com.bihome.residentapp;

import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.security.AuthUser;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.residentapp.dto.ResidentAppDtos;
import com.bihome.servicecatalog.ServiceOfferingService;
import com.bihome.servicecatalog.ServiceOrderService;
import com.bihome.servicecatalog.dto.ServiceDtos;
import com.bihome.servicecatalog.dto.ServiceOrderDtos;
import com.bihome.survey.Survey;
import com.bihome.survey.SurveyService;
import com.bihome.survey.dto.SurveyDtos;
import java.util.List;
import java.util.Set;
import java.util.function.Supplier;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * App cư dân – khảo sát ý kiến và đặt dịch vụ. Khảo sát: chỉ khảo sát đang nhận phản hồi có căn / cư dân thuộc đối
 * tượng; mỗi cư dân trả lời một lần (bảng SURVEY_PARTICIPANT, cả khảo sát ẩn danh). Khảo sát ẩn danh ghi phản hồi dưới
 * tên chung "Cư dân (ẩn danh)" để lịch sử hoạt động không lộ người trả lời.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ResidentEngagementService {

    static final String ANONYMOUS_ACTOR = "Cư dân (ẩn danh)";
    private static final PageParams FIRST_50 = new PageParams(0, 50, null);

    private final ResidentContext context;
    private final SurveyService surveyService;
    private final ServiceOfferingService serviceOfferingService;
    private final ServiceOrderService serviceOrderService;
    private final JdbcTemplate jdbc;

    // ------------------------------------------------------------ Khảo sát

    /** Khảo sát đang nhận phản hồi mà căn / cư dân thuộc đối tượng, kèm đã trả lời hay chưa. */
    public List<ResidentAppDtos.SurveyItem> surveys(Long apartmentId) {
        ResidentSession.ApartmentRef a = context.requireApartment(apartmentId);
        ResidentSession s = context.current();
        Set<Long> answered = Set.copyOf(jdbc.queryForList(
                "SELECT SURVEY_ID FROM SURVEY_PARTICIPANT WHERE RESIDENT_ID = ?", Long.class, s.residentId()));
        return surveyService.list(new SurveyDtos.Filter(null, a.buildingId(), null, Survey.Status.OPEN, null, null, null),
                        FIRST_50).content().stream()
                .filter(v -> "ACTIVE".equals(v.phase()) && inAudience(v, a, s))
                .map(v -> new ResidentAppDtos.SurveyItem(v.id(), v.title(), v.description(), v.startAt(), v.endAt(),
                        v.anonymous(), v.questionCount(), answered.contains(v.id())))
                .toList();
    }

    public ResidentAppDtos.SurveyDetail survey(Long id, Long apartmentId) {
        ResidentSession.ApartmentRef a = context.requireApartment(apartmentId);
        ResidentSession s = context.current();
        SurveyDtos.Response v = surveyService.get(id);
        if (!v.buildingId().equals(a.buildingId()) || v.status() != Survey.Status.OPEN || !inAudience(v, a, s)) {
            throw new NotFoundException("Không tìm thấy khảo sát.");
        }
        return new ResidentAppDtos.SurveyDetail(v.id(), v.title(), v.description(), v.startAt(), v.endAt(), v.anonymous(),
                "ACTIVE".equals(v.phase()), answered(id, s.residentId()), v.questions());
    }

    @Transactional
    public void answer(Long id, ResidentAppDtos.SurveyAnswerRequest req) {
        ResidentAppDtos.SurveyDetail survey = survey(id, req.apartmentId());
        ResidentSession s = context.current();
        if (survey.answered()) {
            throw new BusinessException(ErrorCode.CONFLICT, "Bạn đã trả lời khảo sát này.");
        }
        SurveyDtos.ResponseRequest request = new SurveyDtos.ResponseRequest(req.apartmentId(), s.residentId(), req.answers());
        if (survey.anonymous()) {
            runAs(new AuthUser(null, ANONYMOUS_ACTOR, Set.of("RESIDENT"), Set.of(), Set.of(s.buildingId()), false, false),
                    () -> surveyService.submit(id, request));
        } else {
            surveyService.submit(id, request);
        }
        jdbc.update("INSERT INTO SURVEY_PARTICIPANT (SURVEY_ID, RESIDENT_ID) VALUES (?, ?)", id, s.residentId());
    }

    private boolean answered(Long surveyId, Long residentId) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM SURVEY_PARTICIPANT WHERE SURVEY_ID = ? AND RESIDENT_ID = ?",
                Integer.class, surveyId, residentId);
        return n != null && n > 0;
    }

    private static boolean inAudience(SurveyDtos.Response v, ResidentSession.ApartmentRef a, ResidentSession s) {
        return switch (v.audience()) {
            case ALL -> true;
            case FLOOR -> v.targets().contains(a.floorNo());
            case APARTMENT -> v.targets().contains(String.valueOf(a.id()));
            case RESIDENT -> v.targets().contains(String.valueOf(s.residentId()));
        };
    }

    /** Chạy dưới người thao tác khác (khảo sát ẩn danh) rồi trả lại phiên cư dân. */
    private static <T> T runAs(AuthUser actor, Supplier<T> action) {
        SecurityContext original = SecurityContextHolder.getContext();
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(actor, null,
                original.getAuthentication() == null ? List.of() : original.getAuthentication().getAuthorities()));
        SecurityContextHolder.setContext(context);
        try {
            return action.get();
        } finally {
            SecurityContextHolder.setContext(original);
        }
    }

    // ------------------------------------------------------------ Dịch vụ

    public List<ServiceDtos.Response> services(Long apartmentId) {
        ResidentSession.ApartmentRef a = context.requireApartment(apartmentId);
        return serviceOfferingService.list(new ServiceDtos.Filter(null, a.buildingId(), null, null, null, ActiveStatus.ACTIVE,
                null, null), FIRST_50).content();
    }

    public ServiceDtos.Response service(Long id, Long apartmentId) {
        ResidentSession.ApartmentRef a = context.requireApartment(apartmentId);
        ServiceDtos.Response v = serviceOfferingService.get(id);
        if (!v.buildingId().equals(a.buildingId()) || v.status() != ActiveStatus.ACTIVE) {
            throw new NotFoundException("Không tìm thấy dịch vụ.");
        }
        return v;
    }

    public ServiceOrderDtos.QuoteResponse quote(ResidentAppDtos.ServiceOrderRequest req) {
        service(req.serviceId(), req.apartmentId());
        return serviceOrderService.quote(toRequest(req));
    }

    @Transactional
    public ServiceOrderDtos.Response order(ResidentAppDtos.ServiceOrderRequest req) {
        service(req.serviceId(), req.apartmentId());
        return serviceOrderService.create(toRequest(req));
    }

    public PageResponse<ServiceOrderDtos.Response> orders(Long apartmentId, PageParams pageParams) {
        context.requireApartment(apartmentId);
        return serviceOrderService.list(new ServiceOrderDtos.Filter(null, null, null, null, apartmentId, null, null, null,
                null), pageParams);
    }

    public ServiceOrderDtos.Response orderDetail(Long id) {
        ServiceOrderDtos.Response o = serviceOrderService.get(id);
        context.requireOwned(o.apartmentId(), "Không tìm thấy đơn dịch vụ.");
        return o;
    }

    @Transactional
    public ServiceOrderDtos.Response cancelOrder(Long id, ResidentAppDtos.CancelRequest req) {
        orderDetail(id);
        return serviceOrderService.cancel(id, new ServiceOrderDtos.CancelRequest(req.reason(), req.version()));
    }

    private ServiceOrderDtos.Request toRequest(ResidentAppDtos.ServiceOrderRequest req) {
        return new ServiceOrderDtos.Request(req.serviceId(), req.apartmentId(), context.current().residentId(), req.quantity(),
                req.scheduledAt(), req.voucherCode(), req.note());
    }
}
