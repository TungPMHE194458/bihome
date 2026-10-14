package com.bihome.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Access token trả trong body. Web: refresh token chỉ nằm trong cookie HttpOnly ({@code refreshToken} = null, không
 * xuất hiện trong JSON). App mobile (header {@code X-Client-Type: mobile}): refresh token trả trong body để app tự lưu.
 */
public record TokenResponse(String accessToken, String tokenType, long expiresIn, boolean mustChangePassword,
                            @JsonInclude(JsonInclude.Include.NON_NULL) String refreshToken) {

    public TokenResponse(String accessToken, String tokenType, long expiresIn, boolean mustChangePassword) {
        this(accessToken, tokenType, expiresIn, mustChangePassword, null);
    }

    public TokenResponse withRefreshToken(String token) {
        return new TokenResponse(accessToken, tokenType, expiresIn, mustChangePassword, token);
    }
}
