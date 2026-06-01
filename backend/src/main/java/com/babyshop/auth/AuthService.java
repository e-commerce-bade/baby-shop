package com.babyshop.auth;

import com.babyshop.auth.dto.AuthLoginRequest;
import com.babyshop.auth.dto.AuthTokenResponse;
import com.babyshop.common.security.SecurityProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final SecurityProperties securityProperties;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;

    public AuthTokenResponse login(AuthLoginRequest request) {
        SecurityProperties.Admin admin = securityProperties.admin();
        String configuredRole = normalizeRole(admin.role());

        if (!admin.username().equals(request.username()) || !matchesPassword(request.password(), admin.password())) {
            throw new BadCredentialsException("Invalid username or password");
        }

        Instant issuedAt = Instant.now();
        Instant expiresAt = issuedAt.plus(securityProperties.jwt().accessTokenTtlMinutes(), ChronoUnit.MINUTES);

        JwtClaimsSet claimsSet = JwtClaimsSet.builder()
                .issuer(securityProperties.jwt().issuer())
                .subject(admin.username())
                .issuedAt(issuedAt)
                .expiresAt(expiresAt)
                .claim("roles", List.of(configuredRole))
                .build();

        String accessToken = jwtEncoder.encode(
                org.springframework.security.oauth2.jwt.JwtEncoderParameters.from(
                        JwsHeader.with(MacAlgorithm.HS256).build(),
                        claimsSet
                )
        ).getTokenValue();

        return new AuthTokenResponse(
                accessToken,
                "Bearer",
                securityProperties.jwt().accessTokenTtlMinutes() * 60,
                expiresAt,
                admin.username(),
                configuredRole
        );
    }

    private boolean matchesPassword(String rawPassword, String configuredPassword) {
        if (configuredPassword == null || configuredPassword.isBlank()) {
            return false;
        }

        if (configuredPassword.startsWith("{")) {
            return passwordEncoder.matches(rawPassword, configuredPassword);
        }

        return configuredPassword.equals(rawPassword);
    }

    private String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            return "ADMIN";
        }

        return role.startsWith("ROLE_") ? role.substring(5) : role.trim();
    }
}
