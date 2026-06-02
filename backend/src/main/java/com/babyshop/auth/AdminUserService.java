package com.babyshop.auth;

import com.babyshop.auth.dto.AdminUserRequest;
import com.babyshop.auth.dto.AdminUserResponse;
import com.babyshop.auth.dto.AdminUserUpdateRequest;
import com.babyshop.common.exception.DuplicateResourceException;
import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserAccountRepository userAccountRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<AdminUserResponse> getAllUsers() {
        return userAccountRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminUserResponse getUserById(Long userId) {
        return toResponse(findUserById(userId));
    }

    @Transactional
    public AdminUserResponse createUser(AdminUserRequest request) {
        String normalizedEmail = normalizeEmail(request.email());
        userAccountRepository.findByEmailIgnoreCase(normalizedEmail)
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("User email already exists: " + normalizedEmail);
                });

        UserAccount user = new UserAccount();
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFirstName(trimToNull(request.firstName()));
        user.setLastName(trimToNull(request.lastName()));
        user.setPhoneNumber(trimToNull(request.phoneNumber()));
        user.setActive(Boolean.TRUE.equals(request.active()));
        user.setRoles(resolveRoles(request.roles()));

        return toResponse(userAccountRepository.save(user));
    }

    @Transactional
    public AdminUserResponse updateUser(Long userId, AdminUserUpdateRequest request) {
        UserAccount user = findUserById(userId);
        String normalizedEmail = normalizeEmail(request.email());

        userAccountRepository.findByEmailIgnoreCase(normalizedEmail)
                .filter(existing -> !existing.getId().equals(userId))
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("User email already exists: " + normalizedEmail);
                });

        user.setEmail(normalizedEmail);
        if (request.password() != null && !request.password().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.password()));
        }
        user.setFirstName(trimToNull(request.firstName()));
        user.setLastName(trimToNull(request.lastName()));
        user.setPhoneNumber(trimToNull(request.phoneNumber()));
        user.setActive(Boolean.TRUE.equals(request.active()));
        user.setRoles(resolveRoles(request.roles()));

        return toResponse(userAccountRepository.save(user));
    }

    @Transactional
    public AdminUserResponse updateUserActiveStatus(Long userId, boolean active) {
        UserAccount user = findUserById(userId);
        user.setActive(active);
        return toResponse(userAccountRepository.save(user));
    }

    @Transactional
    public void deactivateUser(Long userId) {
        UserAccount user = findUserById(userId);
        user.setActive(false);
        userAccountRepository.save(user);
    }

    private UserAccount findUserById(Long userId) {
        return userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found for id: " + userId));
    }

    private Set<Role> resolveRoles(Set<String> roleNames) {
        Set<String> normalizedRoleNames = roleNames.stream()
                .map(this::normalizeRoleName)
                .collect(LinkedHashSet::new, LinkedHashSet::add, LinkedHashSet::addAll);

        List<Role> roles = roleRepository.findByNameIn(normalizedRoleNames);
        if (roles.size() != normalizedRoleNames.size()) {
            Set<String> foundNames = roles.stream().map(Role::getName).collect(LinkedHashSet::new, LinkedHashSet::add, LinkedHashSet::addAll);
            String missingRoles = normalizedRoleNames.stream()
                    .filter(role -> !foundNames.contains(role))
                    .sorted()
                    .reduce((left, right) -> left + ", " + right)
                    .orElse("");
            throw new InvalidRequestException("Unknown roles requested: " + missingRoles);
        }

        return new LinkedHashSet<>(roles);
    }

    private AdminUserResponse toResponse(UserAccount user) {
        Set<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .collect(LinkedHashSet::new, LinkedHashSet::add, LinkedHashSet::addAll);

        return new AdminUserResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getPhoneNumber(),
                user.isActive(),
                roles,
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeRoleName(String roleName) {
        String normalized = roleName.trim().toUpperCase(Locale.ROOT);
        return normalized.startsWith("ROLE_") ? normalized.substring(5) : normalized;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
