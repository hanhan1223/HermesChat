package com.hermes.admin.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 搜索服务提供者配置
 * Tavily / PubMed / Google(SerpAPI) / Scholar / Semantic Scholar
 * 与 Harness (Prisma search_providers) 共表
 */
@Entity
@Table(name = "search_providers",
       indexes = {
           @Index(name = "idx_search_provider_type", columnList = "providerType,enabled")
       })
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchProvider {

    @Id
    @Column(length = 32)
    private String id;

    /** tavily | pubmed | google | scholar | semantic_scholar */
    @Column(name = "provider_type", nullable = false, length = 32)
    private String providerType;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(name = "api_key", length = 512)
    private String apiKey;

    @Column(name = "base_url", length = 512)
    private String baseUrl;

    @Column(nullable = false)
    @Builder.Default
    private Boolean enabled = true;

    /** 每次调用消耗积分（0=免费源） */
    @Column(name = "cost_per_call", nullable = false)
    @Builder.Default
    private Integer costPerCall = 1;

    /** 单用户每日调用上限，null=不限 */
    @Column(name = "daily_quota")
    private Integer dailyQuota;

    @Column(name = "rate_limit_per_minute")
    @Builder.Default
    private Integer rateLimitPerMinute = 30;

    @Column(nullable = false)
    @Builder.Default
    private Integer priority = 0;

    @Column(columnDefinition = "text")
    private String config;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
