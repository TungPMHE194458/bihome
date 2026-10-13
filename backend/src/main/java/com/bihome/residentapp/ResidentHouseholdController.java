package com.bihome.residentapp;

import com.bihome.accesscard.dto.AccessCardDtos;
import com.bihome.asset.dto.AssetDtos;
import com.bihome.common.storage.FileContentResponses;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.declaration.dto.DeclarationDtos;
import com.bihome.document.dto.DocumentDtos;
import com.bihome.resident.dto.ResidentDtos;
import com.bihome.residentapp.dto.ResidentAppDtos;
import com.bihome.servicecatalog.dto.ServiceDtos;
import com.bihome.servicecatalog.dto.ServiceOrderDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** App cư dân: căn hộ của tôi (thành viên, xe, thẻ từ), kê khai, tài liệu, khảo sát, đặt dịch vụ. */
@Tag(name = "App cư dân – căn hộ, kê khai, khảo sát, dịch vụ")
@RestController
@RequestMapping(ResidentSecurityConfig.PREFIX)
@RequiredArgsConstructor
public class ResidentHouseholdController {

    private final ResidentHouseholdService household;
    private final ResidentEngagementService engagement;

    // ------------------------------------------------------------ Căn hộ

    @Operation(summary = "Thành viên đang ở căn")
    @GetMapping("/apartments/{apartmentId}/members")
    public List<ResidentDtos.ApartmentMember> members(@PathVariable Long apartmentId) {
        return household.members(apartmentId);
    }

    @GetMapping("/apartments/{apartmentId}/vehicles")
    public List<AssetDtos.ItemResponse> vehicles(@PathVariable Long apartmentId) {
        return household.vehicles(apartmentId);
    }

    @GetMapping("/apartments/{apartmentId}/access-cards")
    public List<AccessCardDtos.Response> accessCards(@PathVariable Long apartmentId) {
        return household.accessCards(apartmentId);
    }

    @Operation(summary = "Loại xe (danh mục hạng mục) của tòa để kê khai")
    @GetMapping("/apartments/{apartmentId}/vehicle-categories")
    public List<AssetDtos.CategoryOption> vehicleCategories(@PathVariable Long apartmentId) {
        return household.vehicleCategories(apartmentId);
    }

    // ------------------------------------------------------------ Kê khai

    @Operation(summary = "Phiếu kê khai của căn", description = "Mới nhất trước.")
    @GetMapping("/declarations")
    public List<DeclarationDtos.Response> declarations(@RequestParam Long apartmentId) {
        return household.declarations(apartmentId);
    }

    @GetMapping("/declarations/{id}")
    public DeclarationDtos.Response declaration(@PathVariable Long id) {
        return household.declaration(id);
    }

    @Operation(summary = "Kê khai thành viên gia đình",
            description = "Chỉ chủ sở hữu / người thuê của căn. Ảnh tải trước qua POST /resident/files (purpose RESIDENT_AVATAR). "
                    + "Chờ BQL duyệt.")
    @PostMapping("/declarations/members")
    @ResponseStatus(HttpStatus.CREATED)
    public DeclarationDtos.Response declareMember(@Valid @RequestBody DeclarationDtos.MemberRequest request) {
        return household.declareMember(request);
    }

    @Operation(summary = "Kê khai xe", description = "Chỉ chủ sở hữu / người thuê của căn. Chờ BQL duyệt.")
    @PostMapping("/declarations/vehicles")
    @ResponseStatus(HttpStatus.CREATED)
    public DeclarationDtos.Response declareVehicle(@Valid @RequestBody DeclarationDtos.VehicleRequest request) {
        return household.declareVehicle(request);
    }

    @Operation(summary = "Huỷ phiếu kê khai đang chờ duyệt", description = "Chỉ người gửi.")
    @PostMapping("/declarations/{id}/cancel")
    public DeclarationDtos.Response cancelDeclaration(@PathVariable Long id) {
        return household.cancelDeclaration(id);
    }

    // ------------------------------------------------------------ Tài liệu

    @Operation(summary = "Tài liệu BQL công bố cho cư dân",
            description = "Đối tượng Tất cả cư dân, cộng Chủ sở hữu / Người thuê theo vai trò ở căn.")
    @GetMapping("/documents")
    public PageResponse<DocumentDtos.Response> documents(@RequestParam Long apartmentId, @ParameterObject PageParams pageParams) {
        return household.documents(apartmentId, pageParams);
    }

    @GetMapping("/documents/{id}/content")
    public ResponseEntity<Resource> documentContent(@PathVariable Long id, @RequestParam Long apartmentId,
                                                    @RequestParam(defaultValue = "false") boolean download) {
        return FileContentResponses.of(household.documentContent(id, apartmentId), download);
    }

    // ------------------------------------------------------------ Khảo sát

    @Operation(summary = "Khảo sát đang mở cho căn / cư dân", description = "Kèm đã trả lời hay chưa.")
    @GetMapping("/surveys")
    public List<ResidentAppDtos.SurveyItem> surveys(@RequestParam Long apartmentId) {
        return engagement.surveys(apartmentId);
    }

    @GetMapping("/surveys/{id}")
    public ResidentAppDtos.SurveyDetail survey(@PathVariable Long id, @RequestParam Long apartmentId) {
        return engagement.survey(id, apartmentId);
    }

    @Operation(summary = "Trả lời khảo sát", description = "Mỗi cư dân một lần; khảo sát ẩn danh không lưu người trả lời.")
    @PostMapping("/surveys/{id}/responses")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void answer(@PathVariable Long id, @Valid @RequestBody ResidentAppDtos.SurveyAnswerRequest request) {
        engagement.answer(id, request);
    }

    // ------------------------------------------------------------ Dịch vụ

    @GetMapping("/services")
    public List<ServiceDtos.Response> services(@RequestParam Long apartmentId) {
        return engagement.services(apartmentId);
    }

    @GetMapping("/services/{id}")
    public ServiceDtos.Response service(@PathVariable Long id, @RequestParam Long apartmentId) {
        return engagement.service(id, apartmentId);
    }

    @PostMapping("/service-orders/quote")
    public ServiceOrderDtos.QuoteResponse quote(@Valid @RequestBody ResidentAppDtos.ServiceOrderRequest request) {
        return engagement.quote(request);
    }

    @Operation(summary = "Đặt dịch vụ", description = "Phí cộng vào thông báo phí kỳ tới nếu chưa thanh toán.")
    @PostMapping("/service-orders")
    @ResponseStatus(HttpStatus.CREATED)
    public ServiceOrderDtos.Response order(@Valid @RequestBody ResidentAppDtos.ServiceOrderRequest request) {
        return engagement.order(request);
    }

    @GetMapping("/service-orders")
    public PageResponse<ServiceOrderDtos.Response> orders(@RequestParam Long apartmentId, @ParameterObject PageParams pageParams) {
        return engagement.orders(apartmentId, pageParams);
    }

    @GetMapping("/service-orders/{id}")
    public ServiceOrderDtos.Response orderDetail(@PathVariable Long id) {
        return engagement.orderDetail(id);
    }

    @PostMapping("/service-orders/{id}/cancel")
    public ServiceOrderDtos.Response cancelOrder(@PathVariable Long id, @Valid @RequestBody ResidentAppDtos.CancelRequest request) {
        return engagement.cancelOrder(id, request);
    }
}
