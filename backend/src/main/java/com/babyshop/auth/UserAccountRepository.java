package com.babyshop.auth;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    // CUSTOMER rolundeki kullanicilari, opsiyonel arama (:q null veya '%term%') ile sayfalanmis getirir.
    @EntityGraph(attributePaths = "roles")
    @Query(value = "select u from UserAccount u "
            + "where exists (select 1 from u.roles r where upper(r.name) = 'CUSTOMER') "
            + "and (:q is null or lower(u.email) like :q "
            + "or lower(coalesce(u.firstName, '')) like :q or lower(coalesce(u.lastName, '')) like :q)",
            countQuery = "select count(u) from UserAccount u "
            + "where exists (select 1 from u.roles r where upper(r.name) = 'CUSTOMER') "
            + "and (:q is null or lower(u.email) like :q "
            + "or lower(coalesce(u.firstName, '')) like :q or lower(coalesce(u.lastName, '')) like :q)")
    Page<UserAccount> findCustomers(@Param("q") String q, Pageable pageable);

    @Query("select count(distinct u.id) from UserAccount u "
            + "where exists (select 1 from u.roles r where upper(r.name) = 'CUSTOMER') "
            + "and exists (select 1 from Order o where lower(o.customerEmail) = lower(u.email))")
    long countCustomersWithOrders();
}
