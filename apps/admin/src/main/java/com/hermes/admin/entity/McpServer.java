package com.hermes.admin.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * MCP 服务器实体 - 与 NestJS Prisma 共享同一张表
 */
@Entity
@Table(name = "mcp_servers")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class McpServer {

    @Id
    @Column(length = 32)
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String transport;

    @Column(columnDefinition = "jsonb", nullable = false)
    private String config;

    @Column(name = "user_id", nullable = false, length = 32)
    private String userId;

    @Column(nullable = false)
    @Builder.Default
    private String status = "disconnected";

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
