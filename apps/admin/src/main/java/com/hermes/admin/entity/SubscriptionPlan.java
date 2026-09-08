package com.hermes.admin.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 订阅计划实体
 * 定义不同等级的订阅套餐（免费/专业/企业）
 */
@Entity
@Table(name = "subscription_plans")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionPlan {

    @Id
    @Column(length = 32)
    private String id;

    @Column(nullable = false, unique = true, length = 64)
    private String code;           // free, pro, enterprise

    @Column(nullable = false, length = 128)
    private String name;           // 套餐名称

    @Column(length = 512)
    private String description;

    @Column(name = "monthly_credits", nullable = false)
    private Integer monthlyCredits;    // 每月赠送积分

    @Column(name = "daily_token_limit", nullable = false)
    private Long dailyTokenLimit;      // 每日 Token 限额

    @Column(name = "monthly_token_limit", nullable = false)
    private Long monthlyTokenLimit;    // 每月 Token 限额

    @Column(name = "max_conversations")
    @Builder.Default
    private Integer maxConversations = 100;

    @Column(name = "max_skills")
    @Builder.Default
    private Integer maxSkills = 10;

    @Column(name = "max_mcp_servers")
    @Builder.Default
    private Integer maxMcpServers = 5;

    @Column(name = "price_monthly", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal priceMonthly = BigDecimal.ZERO;

    @Column(name = "price_yearly", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal priceYearly = BigDecimal.ZERO;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "sort_order")
    @Builder.Default
    private Integer sortOrder = 0;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}