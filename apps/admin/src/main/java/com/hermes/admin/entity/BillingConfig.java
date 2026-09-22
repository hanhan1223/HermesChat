package com.hermes.admin.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 平台计费配置（单行，id = "default"）
 * 支持一键在「免费使用」与「试用期后付费」之间切换
 */
@Entity
@Table(name = "billing_config")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillingConfig {

    @Id
    @Column(length = 32)
    @Builder.Default
    private String id = "default";

    /** FREE | TRIAL_THEN_PAID */
    @Column(nullable = false, length = 32)
    @Builder.Default
    private String mode = "TRIAL_THEN_PAID";

    @Column(name = "trial_days", nullable = false)
    @Builder.Default
    private Integer trialDays = 7;

    @Column(name = "trial_credits", nullable = false)
    @Builder.Default
    private Integer trialCredits = 100;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
