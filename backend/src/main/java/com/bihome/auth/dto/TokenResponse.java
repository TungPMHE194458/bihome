package com.bihome.auth.dto;

/** Access token trả trong body; refresh token chỉ nằm trong cookie HttpOnly. */
public record TokenResponse(String accessToken, String tokenType, long expiresIn, boolean mustChangePassword) {
}
