package com.hermes.admin.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Token 消耗统计实体
 * 按日汇总用户的 Token 使用情况
 */
@Entity
@Table(name = "token_usage_stats", 
       indexes = {
           @Index(name = "idx_user_date", columnList = "userId,usageDate"),
           @Index(name = "idx_date", columnList = "usageDate")
       })
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenUsageStat {

    @Id
    @Column(length = 32)
    private String id;

    @Column(name = "user_id", nullable = false, length = 32)
    private String userId;

    @Column(name = "model_id", length = 32)
    private String modelId;

    @Column(name = "usage_date", nullable = false)
    private LocalDateTime usageDate;

    @Column(name = "input_tokens")
    @Builder.Default
    private Long inputTokens = 0L;

    @Column(name = "output_tokens")
    @Builder.Default
    private Long outputTokens = 0L;

    @Column(name = "total_tokens")
    @Builder.Default
    private Long totalTokens = 0L;

    @Column(name = "conversation_count")
    @Builder.Default
    private Integer conversationCount = 0;

    @Column(name = "message_count")
    @Builder.Default
    private Integer messageCount = 0;

    @Column
    @Builder.Default
    private Double cost = 0.0;

    @Column(name = "credits_consumed")
    @Builder.Default
    private Integer creditsConsumed = 0;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}