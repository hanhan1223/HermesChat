package com.hermes.admin.repository;

import com.hermes.admin.entity.CreditTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface CreditTransactionRepository extends JpaRepository<CreditTransaction, String> {

    Page<CreditTransaction> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(ct.amount), 0) FROM CreditTransaction ct " +
           "WHERE ct.type = 'GIFT' AND ct.createdAt BETWEEN :start AND :end")
    Long sumGiftCreditsInPeriod(LocalDateTime start, LocalDateTime end);

    @Query("SELECT COALESCE(SUM(ct.amount), 0) FROM CreditTransaction ct " +
           "WHERE ct.type = 'CONSUME' AND ct.createdAt BETWEEN :start AND :end")
    Long sumConsumedCreditsInPeriod(LocalDateTime start, LocalDateTime end);
}