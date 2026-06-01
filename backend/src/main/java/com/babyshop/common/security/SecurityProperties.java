package com.babyshop.common.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.security")
public record SecurityProperties(
        Admin admin,
        Jwt jwt
) {
    public record Admin(
            String username,
            String password,
            String role
    ) {
    }

    public record Jwt(
            String secret,
            long accessTokenTtlMinutes,
            String issuer
    ) {
    }
}
