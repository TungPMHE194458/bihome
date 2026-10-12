package com.bihome.common.security;

import java.time.Instant;

public record AccessTokenClaims(Long userId, String username, Instant issuedAt) {
}
