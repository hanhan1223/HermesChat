package com.hermes.admin.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 用户实体 - 管理后台侧
 * 与 Harness 服务的用户表共享同一 PostgreSQL 数据库
 */
@Entity
@Table(name = "users")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @Column(length = 32)
    private String id;

    @Column(nullable = false, unique = true, length = 128)
    private String email;

    @Column(length = 64)
    private String name;

    @Column(name = "password_hash", length = 256)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private Role role = Role.USER;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private UserStatus status = UserStatus.ACTIVE;

    @Column(nullable = false)
    @Builder.Default
    private Integer credits = 0;

    @Column(name = "total_token_used")
    @Builder.Default
    private Long totalTokenUsed = 0L;

    @Column(name = "avatar_url", length = 512)
    private String avatarUrl;

    /** 一键免费：为 true 时该用户可免费使用 */
    @Column(name = "free_access", nullable = false)
    @Builder.Default
    private Boolean freeAccess = false;

    /** 用户级计费覆盖，null 表示跟随平台配置；FREE | TRIAL_THEN_PAID */
    @Column(name = "billing_mode", length = 32)
    private String billingMode;

    @Column(name = "trial_start_at")
    private LocalDateTime trialStartAt;

    @Column(name = "trial_end_at")
    private LocalDateTime trialEndAt;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    public enum Role {
        USER, ADMIN, SUPER_ADMIN
    }

    public enum UserStatus {
        ACTIVE, SUSPENDED, DELETED
    }
}