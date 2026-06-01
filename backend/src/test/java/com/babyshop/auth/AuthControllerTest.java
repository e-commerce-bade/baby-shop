package com.babyshop.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import({
        AuthService.class,
        com.babyshop.common.security.SecurityConfig.class
})
@TestPropertySource(properties = {
        "spring.autoconfigure.exclude=",
        "app.security.admin.username=admin",
        "app.security.admin.password=change-me",
        "app.security.admin.role=ADMIN",
        "app.security.jwt.secret=test-jwt-secret-key-with-32-bytes!!",
        "app.security.jwt.access-token-ttl-minutes=120",
        "app.security.jwt.issuer=test-suite"
})
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldReturnJwtTokenForValidAdminCredentials() throws Exception {
        String requestBody = objectMapper.writeValueAsString(new LoginPayload("admin", "change-me"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.username").value("admin"))
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }

    @Test
    void shouldRejectInvalidAdminCredentials() throws Exception {
        String requestBody = objectMapper.writeValueAsString(new LoginPayload("admin", "wrong-password"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid username or password"));
    }

    private record LoginPayload(String username, String password) {
    }
}
