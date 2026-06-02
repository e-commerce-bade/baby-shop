package com.babyshop.auth;

import com.babyshop.common.security.SecurityProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthBootstrapService implements ApplicationRunner {

    private final UserAccountRepository userAccountRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecurityProperties securityProperties;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        SecurityProperties.Admin admin = securityProperties.admin();
        if (admin == null || !admin.bootstrapEnabled()) {
            return;
        }

        String email = admin.email() == null ? "" : admin.email().trim().toLowerCase();
        if (email.isBlank() || admin.password() == null || admin.password().isBlank()) {
            return;
        }

        Role role = roleRepository.findByName(normalizeRole(admin.role()))
                .orElseGet(() -> createRole(normalizeRole(admin.role())));

        UserAccount adminUser = userAccountRepository.findByEmailIgnoreCase(email)
                .orElseGet(() -> createUser(email, admin.password()));

        if (!adminUser.getRoles().contains(role)) {
            adminUser.getRoles().add(role);
            userAccountRepository.save(adminUser);
        }
    }

    private Role createRole(String roleName) {
        Role role = new Role();
        role.setName(roleName);
        role.setDescription("Bootstrap role for administrative access");
        return roleRepository.save(role);
    }

    private UserAccount createUser(String email, String rawPassword) {
        UserAccount user = new UserAccount();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setFirstName("System");
        user.setLastName("Admin");
        user.setActive(true);
        return user;
    }

    private String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            return "ADMIN";
        }

        String normalized = role.trim();
        return normalized.startsWith("ROLE_") ? normalized.substring(5) : normalized;
    }
}
