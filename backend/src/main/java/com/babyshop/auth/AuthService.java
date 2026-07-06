package com.babyshop.auth;

import com.babyshop.auth.dto.AuthLoginRequest;
import com.babyshop.auth.dto.AuthRegisterRequest;
import com.babyshop.auth.dto.AuthTokenResponse;
import com.babyshop.auth.dto.GoogleLoginRequest;
import com.babyshop.common.exception.DuplicateResourceException;
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
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.LinkedHashSet;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String CUSTOMER_ROLE = "CUSTOMER";
    private static final String ADMIN_ROLE = "ADMIN";

    // Kullanici yoksa zamanlama esitlemesi icin tek seferlik hesaplanan sabit hash.
    private volatile String dummyPasswordHash;

    private final UserAccountRepository userAccountRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final SecurityProperties securityProperties;
    private final GoogleTokenVerifier googleTokenVerifier;

    public AuthTokenResponse login(AuthLoginRequest request) {
        UserAccount user = userAccountRepository.findByEmailIgnoreCase(normalizeEmail(request.email()))
                .orElse(null);

        // Kullanici bulunamasa bile sabit bir hash'e karsi bcrypt calistirilir; boylece
        // "kullanici var/yok" zamanlama yan-kanali ortadan kalkar (user enumeration).
        boolean passwordMatches = verifyPasswordOrDummy(user, request.password());

        if (user == null || !user.isActive() || !passwordMatches) {
            throw new BadCredentialsException("Invalid email or password");
        }

        return issueToken(user);
    }

    private boolean verifyPasswordOrDummy(UserAccount user, String rawPassword) {
        if (user != null) {
            return passwordEncoder.matches(rawPassword, user.getPasswordHash());
        }

        if (dummyPasswordHash == null) {
            dummyPasswordHash = passwordEncoder.encode("invalid-user-placeholder-password");
        }
        passwordEncoder.matches(rawPassword, dummyPasswordHash);
        return false;
    }

    @Transactional
    public AuthTokenResponse register(AuthRegisterRequest request) {
        String normalizedEmail = normalizeEmail(request.email());
        userAccountRepository.findByEmailIgnoreCase(normalizedEmail)
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("User email already exists: " + normalizedEmail);
                });

        Role customerRole = roleRepository.findByName(CUSTOMER_ROLE)
                .orElseGet(this::createCustomerRole);

        UserAccount user = new UserAccount();
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFirstName(trimToNull(request.firstName()));
        user.setLastName(trimToNull(request.lastName()));
        user.setPhoneNumber(trimToNull(request.phoneNumber()));
        user.setActive(true);
        user.setRoles(new LinkedHashSet<>(List.of(customerRole)));

        return issueToken(userAccountRepository.save(user));
    }

    @Transactional
    public AuthTokenResponse loginWithGoogle(GoogleLoginRequest request) {
        GoogleUserInfo info = googleTokenVerifier.verify(request.idToken());
        String normalizedEmail = normalizeEmail(info.email());

        UserAccount user = userAccountRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseGet(() -> createGoogleUser(normalizedEmail, info));

        if (!user.isActive()) {
            throw new BadCredentialsException("Account is disabled");
        }

        return issueToken(user);
    }

    private UserAccount createGoogleUser(String email, GoogleUserInfo info) {
        Role customerRole = roleRepository.findByName(CUSTOMER_ROLE)
                .orElseGet(this::createCustomerRole);

        UserAccount user = new UserAccount();
        user.setEmail(email);
        // No password login for Google accounts — store an unusable random hash
        // so the NOT NULL column is satisfied without a guessable value.
        user.setPasswordHash(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));
        user.setFirstName(trimToNull(info.firstName()));
        user.setLastName(trimToNull(info.lastName()));
        user.setActive(true);
        user.setRoles(new LinkedHashSet<>(List.of(customerRole)));

        return userAccountRepository.save(user);
    }

    private AuthTokenResponse issueToken(UserAccount user) {
        List<String> roles = extractNormalizedRoles(user);

        if (roles.isEmpty()) {
            throw new InvalidRequestException("User has no assigned roles");
        }

        Instant issuedAt = Instant.now();
        long ttlMinutes = resolveTokenTtlMinutes(roles);
        Instant expiresAt = issuedAt.plus(ttlMinutes, ChronoUnit.MINUTES);

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
                ttlMinutes * 60,
                expiresAt,
                user.getEmail(),
                roles.stream().min(Comparator.naturalOrder()).orElse(CUSTOMER_ROLE)
        );
    }

    // Admin oturumu daha uzun tutulur; musteri token'i kisa kalir. Admin TTL yapilandirilmamissa
    // (0 veya negatif) standart TTL'e duser.
    private long resolveTokenTtlMinutes(List<String> roles) {
        long standardTtl = securityProperties.jwt().accessTokenTtlMinutes();
        if (!roles.contains(ADMIN_ROLE)) {
            return standardTtl;
        }
        long adminTtl = securityProperties.jwt().adminAccessTokenTtlMinutes();
        return adminTtl > 0 ? adminTtl : standardTtl;
    }

    private List<String> extractNormalizedRoles(UserAccount user) {
        return user.getRoles().stream()
                .map(Role::getName)
                .filter(role -> role != null && !role.isBlank())
                .map(this::normalizeRole)
                .distinct()
                .sorted()
                .toList();
    }

    private Role createCustomerRole() {
        Role role = new Role();
        role.setName(CUSTOMER_ROLE);
        role.setDescription("Default role for storefront customers");
        return roleRepository.save(role);
    }

    private String normalizeRole(String role) {
        String normalized = role.trim();
        return normalized.startsWith("ROLE_") ? normalized.substring(5) : normalized;
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
