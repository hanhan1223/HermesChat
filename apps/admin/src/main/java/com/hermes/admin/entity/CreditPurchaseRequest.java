package com.hermes.admin.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;

import java.time.LocalDateTime;

/**
 * 额度购买申请
 * 用户在设置页提交，管理员在此审批并发放额度
 */
@Entity
@Table(name = "credit_purchase_requests")
@EntityListeners(org.springframework.data.jpa.domain.support.AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreditPurchaseRequest {

    @Id
    @Column(length = 32)
    private String id;

    @Column(name = "user_id", nullable = false, length = 32)
    private String userId;

    @Column(nullable = false)
    private Integer amount;

    @Column(columnDefinition = "text")
    private String note;

    @Column(length = 128)
    private String contact;

    /** PENDING | APPROVED | REJECTED */
    @Column(nullable = false, length = 16)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "admin_id", length = 32)
    private String adminId;

    @Column(name = "admin_note", columnDefinition = "text")
    private String adminNote;

    @Column(name = "granted_amount")
    private Integer grantedAmount;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;
}
