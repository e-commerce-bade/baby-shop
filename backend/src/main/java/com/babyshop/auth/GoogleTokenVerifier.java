package com.babyshop.auth;

import com.babyshop.common.exception.InvalidRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Verifies Google "Sign in with Google" ID tokens.
 *
 * Uses a {@link NimbusJwtDecoder} pointed at Google's public JWK set, so token
 * signatures (RS256) and expiry are checked against Google's rotating keys
 * without any extra dependency. Issuer and audience are validated explicitly.
 */
@Component
public class GoogleTokenVerifier {

    private static final String GOOGLE_JWK_SET_URI = "https://www.googleapis.com/oauth2/v3/certs";
    private static final List<String> VALID_ISSUERS =
            List.of("https://accounts.google.com", "accounts.google.com");

    private final String clientId;
    private volatile NimbusJwtDecoder decoder;

    public GoogleTokenVerifier(@Value("${app.security.google.client-id:}") String clientId) {
        this.clientId = clientId;
    }

    public GoogleUserInfo verify(String idToken) {
        if (clientId == null || clientId.isBlank()) {
            throw new InvalidRequestException("Google ile giriş şu anda yapılandırılmamış.");
        }

        final Jwt jwt;
        try {
            jwt = decoder().decode(idToken);
        } catch (JwtException e) {
            throw new InvalidRequestException("Geçersiz veya süresi dolmuş Google oturumu.");
        }

        String issuer = jwt.getIssuer() != null ? jwt.getIssuer().toString() : "";
        if (!VALID_ISSUERS.contains(issuer)) {
            throw new InvalidRequestException("Geçersiz Google oturumu.");
        }

        if (jwt.getAudience() == null || !jwt.getAudience().contains(clientId)) {
            throw new InvalidRequestException("Bu Google oturumu bu uygulama için verilmemiş.");
        }

        String email = jwt.getClaimAsString("email");
        if (email == null || email.isBlank() || !readBoolean(jwt.getClaim("email_verified"))) {
            throw new InvalidRequestException("Google hesabınızın e-posta adresi doğrulanmamış.");
        }

        return new GoogleUserInfo(
                email,
                jwt.getClaimAsString("given_name"),
                jwt.getClaimAsString("family_name"));
    }

    private boolean readBoolean(Object value) {
        if (value instanceof Boolean b) {
            return b;
        }
        if (value instanceof String s) {
            return Boolean.parseBoolean(s);
        }
        return false;
    }

    private NimbusJwtDecoder decoder() {
        NimbusJwtDecoder local = decoder;
        if (local == null) {
            synchronized (this) {
                local = decoder;
                if (local == null) {
                    local = NimbusJwtDecoder.withJwkSetUri(GOOGLE_JWK_SET_URI).build();
                    decoder = local;
                }
            }
        }
        return local;
    }
}
