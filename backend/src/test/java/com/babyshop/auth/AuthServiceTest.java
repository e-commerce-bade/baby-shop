package com.babyshop.auth;

import com.babyshop.auth.dto.AuthLoginRequest;
import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.common.security.SecurityProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;

import java.time.Instant;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserAccountRepository userAccountRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtEncoder jwtEncoder;

    @InjectMocks
    private AuthService authService;

    @Test
    void shouldLoginWithDatabaseUser() {
        UserAccount user = buildUser(true, "{bcrypt}hash", Set.of(buildRole("ADMIN")));
        SecurityProperties properties = securityProperties();
        authService = new AuthService(userAccountRepository, passwordEncoder, jwtEncoder, properties);

        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "HS256")
                .claim("sub", "admin@babyshop.local")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        given(userAccountRepository.findByEmailIgnoreCase("admin@babyshop.local")).willReturn(Optional.of(user));
        given(passwordEncoder.matches("change-me", "{bcrypt}hash")).willReturn(true);
        given(jwtEncoder.encode(any(JwtEncoderParameters.class))).willReturn(jwt);

        var response = authService.login(new AuthLoginRequest("admin@babyshop.local", "change-me"));

        assertThat(response.accessToken()).isEqualTo("token");
        assertThat(response.email()).isEqualTo("admin@babyshop.local");
        assertThat(response.role()).isEqualTo("ADMIN");
    }

    @Test
    void shouldRejectInactiveUser() {
        UserAccount user = buildUser(false, "{bcrypt}hash", Set.of(buildRole("ADMIN")));
        authService = new AuthService(userAccountRepository, passwordEncoder, jwtEncoder, securityProperties());

        given(userAccountRepository.findByEmailIgnoreCase("admin@babyshop.local")).willReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(new AuthLoginRequest("admin@babyshop.local", "change-me")))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessage("Invalid email or password");
    }

    @Test
    void shouldRejectUserWithoutRoles() {
        UserAccount user = buildUser(true, "{bcrypt}hash", new HashSet<>());
        authService = new AuthService(userAccountRepository, passwordEncoder, jwtEncoder, securityProperties());

        given(userAccountRepository.findByEmailIgnoreCase("admin@babyshop.local")).willReturn(Optional.of(user));
        given(passwordEncoder.matches("change-me", "{bcrypt}hash")).willReturn(true);

        assertThatThrownBy(() -> authService.login(new AuthLoginRequest("admin@babyshop.local", "change-me")))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("User has no assigned roles");
    }

    @Test
    void shouldRejectMissingUser() {
        authService = new AuthService(userAccountRepository, passwordEncoder, jwtEncoder, securityProperties());
        given(userAccountRepository.findByEmailIgnoreCase("admin@babyshop.local")).willReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new AuthLoginRequest("admin@babyshop.local", "change-me")))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessage("Invalid email or password");
    }

    private UserAccount buildUser(boolean active, String passwordHash, Set<Role> roles) {
        UserAccount user = new UserAccount();
        user.setId(1L);
        user.setEmail("admin@babyshop.local");
        user.setPasswordHash(passwordHash);
        user.setActive(active);
        user.setRoles(roles);
        return user;
    }

    private Role buildRole(String name) {
        Role role = new Role();
        role.setId(1L);
        role.setName(name);
        return role;
    }

    private SecurityProperties securityProperties() {
        return new SecurityProperties(
                new SecurityProperties.Admin("admin@babyshop.local", "change-me", "ADMIN", true),
                new SecurityProperties.Jwt("test-jwt-secret-key-with-32-bytes!!", 120, "test-suite")
        );
    }
}
