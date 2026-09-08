package com.hermes.admin.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 模型池实体
 * 管理可用的 LLM 模型配置
 */
@Entity
@Table(name = "models")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LlmModel {

    @Id
    @Column(length = 32)
    private String id;

    @Column(nullable = false, length = 128)
    private String name;               // 显示名称

    @Column(nullable = false, length = 32)
    private String provider;           // openai, anthropic, google, local

    @Column(name = "model_id", nullable = false, length = 128)
    private String modelId;            // 实际模型标识

    @Column(name = "api_key", length = 512)
    private String apiKey;             // 加密存储

    @Column(name = "endpoint", length = 512)
    private String endpoint;           // 自定义 API 端点

    @Column(name = "max_tokens")
    @Builder.Default
    private Integer maxTokens = 4096;

    @Column(name = "supports_vision")
    @Builder.Default
    private Boolean supportsVision = false;

    @Column(name = "supports_tools")
    @Builder.Default
    private Boolean supportsTools = true;

    @Column(name = "cost_per_input_token", precision = 12, scale = 8)
    @Builder.Default
    private Double costPerInputToken = 0.0;

    @Column(name = "cost_per_output_token", precision = 12, scale = 8)
    @Builder.Default
    private Double costPerOutputToken = 0.0;

    @Column(name = "enabled")
    @Builder.Default
    private Boolean enabled = true;

    @Column(name = "priority")
    @Builder.Default
    private Integer priority = 0;

    @Column(name = "available_plans", length = 256)
    private String availablePlans;     // 可用套餐 (JSON 数组)

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}