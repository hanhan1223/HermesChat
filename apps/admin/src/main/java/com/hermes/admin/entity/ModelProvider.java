package com.hermes.admin.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 模型提供者实体
 * 网关层的上游 LLM 服务配置，支持多协议接入与负载均衡
 */
@Entity
@Table(name = "model_providers")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModelProvider {

    @Id
    @Column(length = 32)
    private String id;

    @Column(nullable = false, length = 128)
    private String name;                       // 提供者显示名称

    /**
     * 协议类型：openai / anthropic / gemini / custom
     */
    @Column(nullable = false, length = 32)
    private String protocol;

    @Column(name = "base_url", nullable = false, length = 512)
    private String baseUrl;                    // 上游 API 基础地址

    @Column(name = "api_key", nullable = false, length = 512)
    private String apiKey;                     // 上游 API 密钥

    @Column(name = "model_id", nullable = false, length = 128)
    private String modelId;                    // 上游实际模型标识

    @Column(nullable = false)
    @Builder.Default
    private Boolean enabled = true;            // 是否启用

    @Column(name = "rate_limit_per_minute")
    @Builder.Default
    private Integer rateLimitPerMinute = 60;   // 每分钟请求上限

    @Column(nullable = false)
    @Builder.Default
    private Integer weight = 1;                // 负载均衡权重

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
