package com.bihome.residentapp;

import com.bihome.common.security.JwtService;
import com.bihome.common.security.ProblemDetailSecurityHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Chuỗi bảo mật riêng của app cư dân, xét trước chuỗi chung ({@code SecurityConfig}): mọi API dưới
 * {@code /api/v1/resident/**} chỉ nhận token cư dân; API của BQL không nhận token cư dân.
 */
@Configuration
public class ResidentSecurityConfig {

    public static final String PREFIX = "/api/v1/resident";

    @Bean
    @Order(1)
    SecurityFilterChain residentFilterChain(HttpSecurity http, ProblemDetailSecurityHandler problemHandler,
                                            JwtService jwtService, ResidentSessionLoader loader) throws Exception {
        http
                .securityMatcher(PREFIX + "/**")
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(e -> e
                        .authenticationEntryPoint(problemHandler)
                        .accessDeniedHandler(problemHandler))
                .authorizeHttpRequests(a -> a
                        .requestMatchers(HttpMethod.POST, PREFIX + "/auth/login", PREFIX + "/auth/refresh",
                                PREFIX + "/auth/logout").permitAll()
                        .requestMatchers(HttpMethod.GET, PREFIX + "/app-config").permitAll()
                        .anyRequest().hasRole(ResidentSession.ROLE))
                .addFilterBefore(new ResidentAuthFilter(jwtService, loader, problemHandler),
                        UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
