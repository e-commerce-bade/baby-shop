package com.babyshop.auth;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {

    @EntityGraph(attributePaths = "roles")
    Optional<UserAccount> findByEmailIgnoreCase(String email);

    @Override
    @EntityGraph(attributePaths = "roles")
    Optional<UserAccount> findById(Long id);

    @EntityGraph(attributePaths = "roles")
    List<UserAccount> findAllByOrderByCreatedAtDesc();

    @Query("select count(distinct u.id) from UserAccount u join u.roles r "
            + "where upper(r.name) = upper(:roleName)")
    long countByRoleName(@Param("roleName") String roleName);
}
