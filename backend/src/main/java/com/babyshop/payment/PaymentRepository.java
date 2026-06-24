package com.babyshop.payment;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    @EntityGraph(attributePaths = {"order"})
    Optional<Payment> findByTransactionId(String transactionId);

    @EntityGraph(attributePaths = {"order"})
    Optional<Payment> findByProviderReference(String providerReference);

    @EntityGraph(attributePaths = {"order"})
    List<Payment> findAllByOrderOrderNumberOrderByCreatedAtDesc(String orderNumber);

    // Callback isleminde odeme satirini kilitler; es zamanli (replay/duplicate) callback'ler
    // serilestirir, ikincisi terminal durumu gorup idempotent doner. (order lazy yuklenir;
    // EntityGraph + FOR UPDATE outer-join sorununu onlemek icin entity graph yok.)
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.transactionId = :transactionId")
    Optional<Payment> findByTransactionIdForUpdate(@Param("transactionId") String transactionId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.providerReference = :providerReference")
    Optional<Payment> findByProviderReferenceForUpdate(@Param("providerReference") String providerReference);
}
