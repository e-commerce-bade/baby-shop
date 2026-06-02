package com.babyshop.auth;

import com.babyshop.auth.dto.AdminUserRequest;
import com.babyshop.auth.dto.AdminUserResponse;
import com.babyshop.auth.dto.AdminUserUpdateRequest;
import com.babyshop.common.exception.DuplicateResourceException;
import com.babyshop.common.exception.GlobalExceptionHandler;
import com.babyshop.common.exception.ResourceNotFoundException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.doNothing;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminUserController.class)
@Import(AdminUserControllerTest.TestConfig.class)
class AdminUserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AdminUserService adminUserService;

    @Test
    void shouldReturnUsersForAdmin() throws Exception {
        given(adminUserService.getAllUsers()).willReturn(List.of(userResponse()));

        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value("admin@babyshop.local"));
    }

    @Test
    void shouldReturnUserById() throws Exception {
        given(adminUserService.getUserById(1L)).willReturn(userResponse());

        mockMvc.perform(get("/api/v1/admin/users/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roles[0]").value("ADMIN"));
    }

    @Test
    void shouldCreateUser() throws Exception {
        AdminUserRequest request = new AdminUserRequest(
                "manager@babyshop.local", "password123", "Manager", "User", "5551112233", true, Set.of("ADMIN")
        );
        given(adminUserService.createUser(any(AdminUserRequest.class))).willReturn(userResponse());

        mockMvc.perform(post("/api/v1/admin/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("admin@babyshop.local"));
    }

    @Test
    void shouldUpdateUser() throws Exception {
        AdminUserUpdateRequest request = new AdminUserUpdateRequest(
                "manager@babyshop.local", "password123", "Updated", "User", "5551112233", true, Set.of("ADMIN")
        );
        given(adminUserService.updateUser(anyLong(), any(AdminUserUpdateRequest.class))).willReturn(userResponse());

        mockMvc.perform(put("/api/v1/admin/users/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(true));
    }

    @Test
    void shouldUpdateUserActiveStatus() throws Exception {
        given(adminUserService.updateUserActiveStatus(1L, false)).willReturn(
                new AdminUserResponse(
                        1L, "admin@babyshop.local", "System", "Admin", null, false,
                        Set.of("ADMIN"), OffsetDateTime.now(), OffsetDateTime.now()
                )
        );

        mockMvc.perform(patch("/api/v1/admin/users/1/active")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));
    }

    @Test
    void shouldDeactivateUser() throws Exception {
        doNothing().when(adminUserService).deactivateUser(1L);

        mockMvc.perform(delete("/api/v1/admin/users/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    void shouldReturnConflictForDuplicateEmail() throws Exception {
        AdminUserRequest request = new AdminUserRequest(
                "admin@babyshop.local", "password123", "System", "Admin", null, true, Set.of("ADMIN")
        );
        given(adminUserService.createUser(any(AdminUserRequest.class)))
                .willThrow(new DuplicateResourceException("User email already exists: admin@babyshop.local"));

        mockMvc.perform(post("/api/v1/admin/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void shouldReturnNotFoundForMissingUser() throws Exception {
        given(adminUserService.getUserById(99L))
                .willThrow(new ResourceNotFoundException("User not found for id: 99"));

        mockMvc.perform(get("/api/v1/admin/users/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("User not found for id: 99"));
    }

    @Test
    void shouldReturnValidationErrorForInvalidRequest() throws Exception {
        AdminUserRequest request = new AdminUserRequest("", "short", null, null, null, null, Set.of());

        mockMvc.perform(post("/api/v1/admin/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    private AdminUserResponse userResponse() {
        return new AdminUserResponse(
                1L,
                "admin@babyshop.local",
                "System",
                "Admin",
                "5551112233",
                true,
                Set.of("ADMIN"),
                OffsetDateTime.parse("2026-06-01T09:00:00Z"),
                OffsetDateTime.parse("2026-06-01T09:30:00Z")
        );
    }

    @TestConfiguration
    static class TestConfig {

        @Bean
        GlobalExceptionHandler globalExceptionHandler() {
            return new GlobalExceptionHandler();
        }
    }
}
