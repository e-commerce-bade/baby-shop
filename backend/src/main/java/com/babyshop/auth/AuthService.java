package com.babyshop.auth;

import com.babyshop.auth.dto.AuthLoginRequest;
import com.babyshop.auth.dto.AuthTokenResponse;
import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.common.security.SecurityProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final SecurityProperties securityProperties;

    public AuthTokenResponse login(AuthLoginRequest request) {
        UserAccount user = userAccountRepository.findByEmailIgnoreCase(request.email().trim())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!user.isActive() || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        List<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .filter(role -> role != null && !role.isBlank())
                .map(this::normalizeRole)
                .distinct()
                .sorted()
                .toList();

        if (roles.isEmpty()) {
            throw new InvalidRequestException("User has no assigned roles");
        }

        Instant issuedAt = Instant.now();
        Instant expiresAt = issuedAt.plus(securityProperties.jwt().accessTokenTtlMinutes(), ChronoUnit.MINUTES);

        JwtClaimsSet claimsSet = JwtClaimsSet.builder()
                .issuer(securityProperties.jwt().issuer())
                .subject(user.getEmail())
                .issuedAt(issuedAt)
                .expiresAt(expiresAt)
                .claim("roles", roles)
                .build();

        String accessToken = jwtEncoder.encode(
                JwtEncoderParameters.from(
                        JwsHeader.with(MacAlgorithm.HS256).build(),
                        claimsSet
                )
        ).getTokenValue();

        return new AuthTokenResponse(
                accessToken,
                "Bearer",
                securityProperties.jwt().accessTokenTtlMinutes() * 60,
                expiresAt,
                user.getEmail(),
                roles.stream().min(Comparator.naturalOrder()).orElse("ADMIN")
        );
    }

    private String normalizeRole(String role) {
        String normalized = role.trim();
        return normalized.startsWith("ROLE_") ? normalized.substring(5) : normalized;
    }
}
