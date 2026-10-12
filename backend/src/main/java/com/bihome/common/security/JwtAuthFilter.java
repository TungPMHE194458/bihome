package com.bihome.common.security;

import com.bihome.common.exception.ErrorCode;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Optional;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Xác thực bằng Bearer token. Token sai/hết hạn thì bỏ qua để entry point trả 401.
 * User bị bắt đổi mật khẩu chỉ được gọi nhóm /api/v1/auth/** (me, change-password, logout).
 */
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final String BEARER = "Bearer ";
    private static final String AUTH_PATH = "/api/v1/auth/";

    private final JwtService jwtService;
    private final AuthUserProvider authUserProvider;
    private final ProblemDetailSecurityHandler problemHandler;

    public JwtAuthFilter(JwtService jwtService, AuthUserProvider authUserProvider,
                         ProblemDetailSecurityHandler problemHandler) {
        this.jwtService = jwtService;
        this.authUserProvider = authUserProvider;
        this.problemHandler = problemHandler;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith(BEARER)) {
            Optional<AuthUser> user = jwtService.parseAccessToken(header.substring(BEARER.length()).trim())
                    .flatMap(claims -> authUserProvider.loadActive(claims.userId(), claims.issuedAt()));
            if (user.isPresent()) {
                AuthUser authUser = user.get();
                UsernamePasswordAuthenticationToken authentication =
                        UsernamePasswordAuthenticationToken.authenticated(authUser, null, authUser.authorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContext context = SecurityContextHolder.createEmptyContext();
                context.setAuthentication(authentication);
                SecurityContextHolder.setContext(context);

                if (authUser.mustChangePassword() && !request.getRequestURI().startsWith(AUTH_PATH)) {
                    problemHandler.write(response, ErrorCode.PASSWORD_CHANGE_REQUIRED,
                            ErrorCode.PASSWORD_CHANGE_REQUIRED.getDefaultMessage());
                    return;
                }
            }
        }
        chain.doFilter(request, response);
    }
}
