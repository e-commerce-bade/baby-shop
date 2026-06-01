package com.babyshop.auth;

import com.babyshop.auth.dto.AdminUserRequest;
import com.babyshop.auth.dto.AdminUserUpdateRequest;
import com.babyshop.common.exception.DuplicateResourceException;
import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.common.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

    @Mock
    private UserAccountRepository userAccountRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AdminUserService adminUserService;

    @Test
    void shouldReturnAllUsers() {
        given(userAccountRepository.findAllByOrderByCreatedAtDesc()).willReturn(List.of(buildUser(1L, "admin@babyshop.local")));

        var response = adminUserService.getAllUsers();

        assertThat(response).hasSize(1);
        assertThat(response.getFirst().email()).isEqualTo("admin@babyshop.local");
    }

    @Test
    void shouldCreateUser() {
        AdminUserRequest request = new AdminUserRequest(
                "manager@babyshop.local", "password123", "Manager", "User", "5551112233", true, Set.of("ADMIN")
        );
        Role adminRole = buildRole("ADMIN");

        given(userAccountRepository.findByEmailIgnoreCase("manager@babyshop.local")).willReturn(Optional.empty());
        given(roleRepository.findByNameIn(Set.of("ADMIN"))).willReturn(List.of(adminRole));
        given(passwordEncoder.encode("password123")).willReturn("{bcrypt}encoded");
        given(userAccountRepository.save(any(UserAccount.class))).willAnswer(invocation -> {
            UserAccount user = invocation.getArgument(0);
            user.setId(2L);
            return user;
        });

        var response = adminUserService.createUser(request);

        assertThat(response.id()).isEqualTo(2L);
        assertThat(response.email()).isEqualTo("manager@babyshop.local");
        assertThat(response.roles()).containsExactly("ADMIN");
    }

    @Test
    void shouldUpdateUser() {
        UserAccount existingUser = buildUser(1L, "admin@babyshop.local");
        AdminUserUpdateRequest request = new AdminUserUpdateRequest(
                "updated@babyshop.local", "newpassword123", "Updated", "User", "5559998877", true, Set.of("ADMIN")
        );

        given(userAccountRepository.findById(1L)).willReturn(Optional.of(existingUser));
        given(userAccountRepository.findByEmailIgnoreCase("updated@babyshop.local")).willReturn(Optional.empty());
        given(roleRepository.findByNameIn(Set.of("ADMIN"))).willReturn(List.of(buildRole("ADMIN")));
        given(passwordEncoder.encode("newpassword123")).willReturn("{bcrypt}new");
        given(userAccountRepository.save(any(UserAccount.class))).willAnswer(invocation -> invocation.getArgument(0));

        var response = adminUserService.updateUser(1L, request);

        assertThat(response.email()).isEqualTo("updated@babyshop.local");
        assertThat(existingUser.getPasswordHash()).isEqualTo("{bcrypt}new");
    }

    @Test
    void shouldUpdateUserActiveStatus() {
        UserAccount existingUser = buildUser(1L, "admin@babyshop.local");
        given(userAccountRepository.findById(1L)).willReturn(Optional.of(existingUser));
        given(userAccountRepository.save(any(UserAccount.class))).willAnswer(invocation -> invocation.getArgument(0));

        var response = adminUserService.updateUserActiveStatus(1L, false);

        assertThat(response.active()).isFalse();
        assertThat(existingUser.isActive()).isFalse();
    }

    @Test
    void shouldDeactivateUser() {
        UserAccount existingUser = buildUser(1L, "admin@babyshop.local");
        given(userAccountRepository.findById(1L)).willReturn(Optional.of(existingUser));

        adminUserService.deactivateUser(1L);

        assertThat(existingUser.isActive()).isFalse();
        verify(userAccountRepository).save(existingUser);
    }

    @Test
    void shouldRejectDuplicateEmail() {
        AdminUserRequest request = new AdminUserRequest(
                "admin@babyshop.local", "password123", null, null, null, true, Set.of("ADMIN")
        );
        given(userAccountRepository.findByEmailIgnoreCase("admin@babyshop.local")).willReturn(Optional.of(buildUser(1L, "admin@babyshop.local")));

        assertThatThrownBy(() -> adminUserService.createUser(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessage("User email already exists: admin@babyshop.local");
    }

    @Test
    void shouldRejectUnknownRoles() {
        AdminUserRequest request = new AdminUserRequest(
                "manager@babyshop.local", "password123", null, null, null, true, Set.of("ADMIN", "EDITOR")
        );

        given(userAccountRepository.findByEmailIgnoreCase("manager@babyshop.local")).willReturn(Optional.empty());
        given(roleRepository.findByNameIn(Set.of("ADMIN", "EDITOR"))).willReturn(List.of(buildRole("ADMIN")));

        assertThatThrownBy(() -> adminUserService.createUser(request))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("Unknown roles requested: EDITOR");
    }

    @Test
    void shouldThrowWhenUserMissing() {
        given(userAccountRepository.findById(99L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> adminUserService.getUserById(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("User not found for id: 99");
    }

    private UserAccount buildUser(Long id, String email) {
        UserAccount user = new UserAccount();
        user.setId(id);
        user.setEmail(email);
        user.setPasswordHash("{bcrypt}encoded");
        user.setFirstName("System");
        user.setLastName("Admin");
        user.setPhoneNumber("5551112233");
        user.setActive(true);
        user.setCreatedAt(OffsetDateTime.parse("2026-06-01T09:00:00Z"));
        user.setUpdatedAt(OffsetDateTime.parse("2026-06-01T09:30:00Z"));
        user.setRoles(new LinkedHashSet<>(Set.of(buildRole("ADMIN"))));
        return user;
    }

    private Role buildRole(String name) {
        Role role = new Role();
        role.setId(1L);
        role.setName(name);
        return role;
    }
}
