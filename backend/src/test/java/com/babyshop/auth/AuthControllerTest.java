package com.babyshop.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import(com.babyshop.common.security.SecurityConfig.class)
@TestPropertySource(properties = {
        "spring.autoconfigure.exclude=",
        "app.security.jwt.secret=test-jwt-secret-key-with-32-bytes!!",
        "app.security.jwt.access-token-ttl-minutes=120",
        "app.security.jwt.issuer=test-suite"
})
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @Test
    void shouldReturnJwtTokenForValidAdminCredentials() throws Exception {
        String requestBody = objectMapper.writeValueAsString(new LoginPayload("admin@babyshop.local", "change-me"));
        given(authService.login(new com.babyshop.auth.dto.AuthLoginRequest("admin@babyshop.local", "change-me")))
                .willReturn(new com.babyshop.auth.dto.AuthTokenResponse(
                        "jwt-token",
                        "Bearer",
                        7200,
                        Instant.parse("2026-06-01T12:00:00Z"),
                        "admin@babyshop.local",
                        "ADMIN"
                ));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("jwt-token"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.email").value("admin@babyshop.local"))
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }

    @Test
    void shouldRejectInvalidAdminCredentials() throws Exception {
        String requestBody = objectMapper.writeValueAsString(new LoginPayload("admin@babyshop.local", "wrong-password"));
        willThrow(new org.springframework.security.authentication.BadCredentialsException("Invalid email or password"))
                .given(authService)
                .login(new com.babyshop.auth.dto.AuthLoginRequest("admin@babyshop.local", "wrong-password"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    void shouldRegisterCustomerAndReturnJwtToken() throws Exception {
        String requestBody = objectMapper.writeValueAsString(
                new RegisterPayload("customer@babyshop.local", "change-me-123", "Ceren", "Unlu", "5551112233")
        );
        given(authService.register(new com.babyshop.auth.dto.AuthRegisterRequest(
                "customer@babyshop.local",
                "change-me-123",
                "Ceren",
                "Unlu",
                "5551112233"
        ))).willReturn(new com.babyshop.auth.dto.AuthTokenResponse(
                "jwt-token",
                "Bearer",
                7200,
                Instant.parse("2026-06-01T12:00:00Z"),
                "customer@babyshop.local",
                "CUSTOMER"
        ));

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("jwt-token"))
                .andExpect(jsonPath("$.email").value("customer@babyshop.local"))
                .andExpect(jsonPath("$.role").value("CUSTOMER"));
    }

    private record LoginPayload(String email, String password) {
    }

    private record RegisterPayload(String email, String password, String firstName, String lastName, String phoneNumber) {
    }
}
