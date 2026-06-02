package com.babyshop.payment;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    @EntityGraph(attributePaths = {"order"})
    Optional<Payment> findByTransactionId(String transactionId);

    @EntityGraph(attributePaths = {"order"})
    Optional<Payment> findByProviderReference(String providerReference);

    @EntityGraph(attributePaths = {"order"})
    List<Payment> findAllByOrderOrderNumberOrderByCreatedAtDesc(String orderNumber);
}
