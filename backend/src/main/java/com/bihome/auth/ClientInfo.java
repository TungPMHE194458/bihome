package com.bihome.auth;

import jakarta.servlet.http.HttpServletRequest;

public record ClientInfo(String ipAddress, String userAgent) {

    private static final int MAX_USER_AGENT = 500;

    public static ClientInfo from(HttpServletRequest request) {
        String ua = request.getHeader("User-Agent");
        if (ua != null && ua.length() > MAX_USER_AGENT) {
            ua = ua.substring(0, MAX_USER_AGENT);
        }
        return new ClientInfo(request.getRemoteAddr(), ua);
    }
}
