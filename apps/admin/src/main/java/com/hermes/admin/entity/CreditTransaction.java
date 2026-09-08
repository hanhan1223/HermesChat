package com.hermes.admin.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 积分交易记录实体
 * 记录所有积分变动：赠送、消费、充值、退款
 */
@Entity
@Table(name = "credit_transactions")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreditTransaction {

    @Id
    @Column(length = 32)
    private String id;

    @Column(name = "user_id", nullable = false, length = 32)
    private String userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private TransactionType type;

    @Column(nullable = false)
    private Integer amount;              // 变动金额（正数增加，负数减少）

    @Column(name = "balance_after", nullable = false)
    private Integer balanceAfter;        // 变动后余额

    @Column(length = 256)
    private String reason;               // 变动原因

    @Column(name = "admin_id", length = 32)
    private String adminId;              // 操作管理员 ID（管理员赠送时）

    @Column(name = "reference_id", length = 64)
    private String referenceId;          // 关联订单/订阅 ID

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum TransactionType {
        GIFT,           // 管理员赠送
        SUBSCRIPTION,   // 订阅发放
        CONSUME,        // 对话消费
        REFILL,         // 充值购买
        REFUND,         // 退款返还
        ADJUST          // 手动调整
    }
}