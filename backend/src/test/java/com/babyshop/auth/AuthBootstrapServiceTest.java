package com.babyshop.auth;

import com.babyshop.common.security.SecurityProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class AuthBootstrapServiceTest {

    @Mock
    private UserAccountRepository userAccountRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthBootstrapService authBootstrapService;

    @Test
    void shouldCreateAdminUserAndRoleWhenMissing() throws Exception {
        authBootstrapService = new AuthBootstrapService(
                userAccountRepository,
                roleRepository,
                passwordEncoder,
                new SecurityProperties(
                        new SecurityProperties.Admin("admin@babyshop.local", "change-me", "ADMIN", true),
                        new SecurityProperties.Jwt("test-jwt-secret-key-with-32-bytes!!", 120, "test-suite")
                )
        );

        given(roleRepository.findByName("ADMIN")).willReturn(Optional.empty());
        given(userAccountRepository.findByEmailIgnoreCase("admin@babyshop.local")).willReturn(Optional.empty());
        given(passwordEncoder.encode("change-me")).willReturn("{bcrypt}encoded");
        given(roleRepository.save(any(Role.class))).willAnswer(invocation -> {
            Role role = invocation.getArgument(0);
            role.setId(1L);
            return role;
        });
        given(userAccountRepository.save(any(UserAccount.class))).willAnswer(invocation -> invocation.getArgument(0));

        authBootstrapService.run(new DefaultApplicationArguments(new String[]{}));

        verify(roleRepository).save(any(Role.class));
        verify(userAccountRepository).save(any(UserAccount.class));
    }

    @Test
    void shouldAttachRoleToExistingUser() throws Exception {
        Role role = new Role();
        role.setId(1L);
        role.setName("ADMIN");

        UserAccount user = new UserAccount();
        user.setId(1L);
        user.setEmail("admin@babyshop.local");
        user.setPasswordHash("{bcrypt}encoded");
        user.setActive(true);
        user.setRoles(new HashSet<>());

        authBootstrapService = new AuthBootstrapService(
                userAccountRepository,
                roleRepository,
                passwordEncoder,
                new SecurityProperties(
                        new SecurityProperties.Admin("admin@babyshop.local", "change-me", "ADMIN", true),
                        new SecurityProperties.Jwt("test-jwt-secret-key-with-32-bytes!!", 120, "test-suite")
                )
        );

        given(roleRepository.findByName("ADMIN")).willReturn(Optional.of(role));
        given(userAccountRepository.findByEmailIgnoreCase("admin@babyshop.local")).willReturn(Optional.of(user));
        given(userAccountRepository.save(any(UserAccount.class))).willAnswer(invocation -> invocation.getArgument(0));

        authBootstrapService.run(new DefaultApplicationArguments(new String[]{}));

        assertThat(user.getRoles()).contains(role);
        verify(userAccountRepository).save(user);
        verify(roleRepository, never()).save(any(Role.class));
    }
}
