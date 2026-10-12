package com.bihome.transaction;

import com.bihome.common.excel.ExcelResponses;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.transaction.dto.TransactionDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Lịch sử giao dịch")
@RestController
@RequestMapping("/api/v1/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @Operation(summary = "Lịch sử giao dịch (chỉ đọc)",
            description = "Lọc theo mã, loại nguồn, mã tham chiếu, căn hộ, phương thức, trạng thái, khoảng ngày; phạm vi theo tòa đang chọn.")
    @GetMapping
    @PreAuthorize("hasAuthority('TRANSACTION_READ')")
    public PageResponse<TransactionDtos.Response> list(@ParameterObject TransactionDtos.Filter filter,
                                                      @ParameterObject PageParams pageParams) {
        return transactionService.list(filter, pageParams);
    }

    @Operation(summary = "Xuất Excel theo bộ lọc hiện tại")
    @GetMapping("/export")
    @PreAuthorize("hasAuthority('TRANSACTION_EXPORT')")
    public ResponseEntity<byte[]> export(@ParameterObject TransactionDtos.Filter filter) {
        return ExcelResponses.attachment(transactionService.export(filter), transactionService.exportFileName(filter));
    }
}
