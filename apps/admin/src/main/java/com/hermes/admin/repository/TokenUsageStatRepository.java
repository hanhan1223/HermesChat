package com.hermes.admin.repository;

import com.hermes.admin.entity.TokenUsageStat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TokenUsageStatRepository extends JpaRepository<TokenUsageStat, String> {

    List<TokenUsageStat> findByUserIdAndUsageDateBetweenOrderByUsageDateDesc(
            String userId, LocalDateTime start, LocalDateTime end);

    @Query("SELECT COALESCE(SUM(t.totalTokens), 0) FROM TokenUsageStat t " +
           "WHERE t.usageDate BETWEEN :start AND :end")
    Long sumTotalTokensInPeriod(LocalDateTime start, LocalDateTime end);

    @Query("SELECT COALESCE(SUM(t.cost), 0) FROM TokenUsageStat t " +
           "WHERE t.usageDate BETWEEN :start AND :end")
    Double sumCostInPeriod(LocalDateTime start, LocalDateTime end);

    @Query("SELECT t.modelId, SUM(t.totalTokens) FROM TokenUsageStat t " +
           "WHERE t.usageDate BETWEEN :start AND :end GROUP BY t.modelId")
    List<Object[]> sumTokensByModelInPeriod(LocalDateTime start, LocalDateTime end);
}