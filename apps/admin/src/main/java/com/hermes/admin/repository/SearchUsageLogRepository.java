package com.hermes.admin.repository;

import com.hermes.admin.entity.SearchUsageLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Repository
public interface SearchUsageLogRepository extends JpaRepository<SearchUsageLog, String> {

    Page<SearchUsageLog> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    Page<SearchUsageLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByProviderIdAndSuccessTrueAndCreatedAtAfter(String providerId, LocalDateTime after);

    @Query("""
        SELECT new map(
            l.providerType as providerType,
            COUNT(l) as calls,
            SUM(l.creditsCost) as credits,
            SUM(CASE WHEN l.success = true THEN 1 ELSE 0 END) as successCount,
            SUM(l.resultCount) as results
        )
        FROM SearchUsageLog l
        WHERE l.createdAt >= :since
        GROUP BY l.providerType
        ORDER BY COUNT(l) DESC
        """)
    List<Map<String, Object>> aggregateByProviderTypeSince(@Param("since") LocalDateTime since);

    @Query("""
        SELECT COALESCE(SUM(l.creditsCost), 0)
        FROM SearchUsageLog l
        WHERE l.createdAt >= :since
        """)
    long sumCreditsSince(@Param("since") LocalDateTime since);
}
