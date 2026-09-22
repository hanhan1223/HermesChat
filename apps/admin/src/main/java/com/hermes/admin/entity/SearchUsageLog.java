package com.hermes.admin.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 搜索调用流水 — 与 Harness (Prisma search_usage_logs) 共表
 */
@Entity
@Table(name = "search_usage_logs",
       indexes = {
           @Index(name = "idx_search_usage_user", columnList = "userId,createdAt"),
           @Index(name = "idx_search_usage_provider", columnList = "providerId,createdAt"),
           @Index(name = "idx_search_usage_created", columnList = "createdAt")
       })
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchUsageLog {

    @Id
    @Column(length = 32)
    private String id;

    @Column(name = "user_id", nullable = false, length = 32)
    private String userId;

    @Column(name = "provider_id", nullable = false, length = 32)
    private String providerId;

    @Column(name = "provider_type", nullable = false, length = 32)
    private String providerType;

    @Column(name = "tool_name", nullable = false, length = 64)
    private String toolName;

    @Column(nullable = false, columnDefinition = "text")
    private String query;

    @Column(name = "result_count")
    @Builder.Default
    private Integer resultCount = 0;

    @Column(name = "credits_cost")
    @Builder.Default
    private Integer creditsCost = 0;

    @Column(nullable = false)
    @Builder.Default
    private Boolean success = true;

    @Column(name = "latency_ms")
    private Integer latencyMs;

    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
