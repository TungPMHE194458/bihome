package com.bihome.residentapp;

import com.bihome.common.exception.ErrorCode;
import com.bihome.common.security.JwtService;
import com.bihome.common.security.ProblemDetailSecurityHandler;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Xác thực Bearer token cư dân cho {@code /api/v1/resident/**}. Principal là {@link ResidentSession#actor()} để các
 * service dùng chung (CurrentUser, ghi CREATED_BY, lịch sử hoạt động) chạy như với nhân viên; phiên cư dân đầy đủ nằm
 * ở request attribute ({@link ResidentContext}). Token nhân viên không hợp lệ ở đây (khác {@code typ}).
 * Cư dân phải đổi mật khẩu tạm chỉ gọi được /auth/**, GET /me và /app-config.
 */
public class ResidentAuthFilter extends OncePerRequestFilter {

    private static final String BEARER = "Bearer ";
    private static final String AUTH_PATH = "/api/v1/resident/auth/";
    private static final List<String> OPEN_WHEN_MUST_CHANGE = List.of("/api/v1/resident/me", "/api/v1/resident/app-config");

    private final JwtService jwtService;
    private final ResidentSessionLoader loader;
    private final ProblemDetailSecurityHandler problemHandler;

    public ResidentAuthFilter(JwtService jwtService, ResidentSessionLoader loader, ProblemDetailSecurityHandler problemHandler) {
        this.jwtService = jwtService;
        this.loader = loader;
        this.problemHandler = problemHandler;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith(BEARER)) {
            Optional<ResidentSession> session = jwtService.parseResidentAccessToken(header.substring(BEARER.length()).trim())
                    .flatMap(claims -> loader.load(claims.userId(), claims.issuedAt()));
            if (session.isPresent()) {
                ResidentSession s = session.get();
                UsernamePasswordAuthenticationToken authentication = UsernamePasswordAuthenticationToken.authenticated(
                        s.actor(), null, List.of(new SimpleGrantedAuthority("ROLE_" + ResidentSession.ROLE)));
                SecurityContext context = SecurityContextHolder.createEmptyContext();
                context.setAuthentication(authentication);
                SecurityContextHolder.setContext(context);
                request.setAttribute(ResidentContext.ATTRIBUTE, s);

                String uri = request.getRequestURI();
                boolean open = uri.startsWith(AUTH_PATH)
                        || (HttpMethod.GET.matches(request.getMethod()) && OPEN_WHEN_MUST_CHANGE.contains(uri));
                if (s.mustChangePassword() && !open) {
                    problemHandler.write(response, ErrorCode.PASSWORD_CHANGE_REQUIRED,
                            ErrorCode.PASSWORD_CHANGE_REQUIRED.getDefaultMessage());
                    return;
                }
            }
        }
        chain.doFilter(request, response);
    }
}
