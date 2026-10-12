package com.bihome.common.security;

import com.bihome.common.exception.ErrorCode;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Optional;
import org.springframework.web.filter.OncePerRequestFilter;

/** Kiểm tra header X-Building-Id; bỏ qua nhóm /auth để tòa đã chọn cũ không chặn việc khởi động app. */
public class BuildingContextFilter extends OncePerRequestFilter {

    private static final String AUTH_PATH = "/api/v1/auth/";

    private final ProblemDetailSecurityHandler problemHandler;

    public BuildingContextFilter(ProblemDetailSecurityHandler problemHandler) {
        this.problemHandler = problemHandler;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String raw = request.getHeader(BuildingContext.HEADER);
        Optional<AuthUser> user = CurrentUser.find();
        if (raw == null || raw.isBlank() || user.isEmpty() || request.getRequestURI().startsWith(AUTH_PATH)) {
            chain.doFilter(request, response);
            return;
        }
        long buildingId;
        try {
            buildingId = Long.parseLong(raw.trim());
        } catch (NumberFormatException e) {
            problemHandler.write(response, ErrorCode.INVALID_PARAMETER, "Mã tòa nhà không hợp lệ.");
            return;
        }
        if (!user.get().canAccessBuilding(buildingId)) {
            problemHandler.write(response, ErrorCode.BUILDING_ACCESS_DENIED, ErrorCode.BUILDING_ACCESS_DENIED.getDefaultMessage());
            return;
        }
        request.setAttribute(BuildingContext.ATTRIBUTE, buildingId);
        chain.doFilter(request, response);
    }
}
