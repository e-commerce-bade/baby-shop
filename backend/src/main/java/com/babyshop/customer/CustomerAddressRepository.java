package com.babyshop.customer;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CustomerAddressRepository extends JpaRepository<CustomerAddress, Long> {

    List<CustomerAddress> findAllByUserEmailIgnoreCaseOrderByIsDefaultDescCreatedAtDesc(String email);

    Optional<CustomerAddress> findByIdAndUserEmailIgnoreCase(Long id, String email);

    Optional<CustomerAddress> findFirstByUserEmailIgnoreCaseAndIsDefaultTrue(String email);

    boolean existsByUserEmailIgnoreCase(String email);
}
