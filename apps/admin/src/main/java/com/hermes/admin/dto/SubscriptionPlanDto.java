package com.hermes.admin.dto;

import com.hermes.admin.entity.SubscriptionPlan;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 订阅计划 DTO
 */
public class SubscriptionPlanDto {

    @Data
    public static class CreateRequest {
        @NotBlank
        private String code;

        @NotBlank
        private String name;

        private String description;

        @NotNull
        @Min(0)
        private Integer monthlyCredits;

        @NotNull
        @Min(0)
        private Long dailyTokenLimit;

        @NotNull
        @Min(0)
        private Long monthlyTokenLimit;

        @Min(0)
        private Integer maxConversations;

        @Min(0)
        private Integer maxSkills;

        @Min(0)
        private Integer maxMcpServers;

        private BigDecimal priceMonthly;
        private BigDecimal priceYearly;
        private Integer sortOrder;
    }

    @Data
    public static class UpdateRequest {
        private String name;
        private String description;
        private Integer monthlyCredits;
        private Long dailyTokenLimit;
        private Long monthlyTokenLimit;
        private Integer maxConversations;
        private Integer maxSkills;
        private Integer maxMcpServers;
        private BigDecimal priceMonthly;
        private BigDecimal priceYearly;
        private Boolean isActive;
        private Integer sortOrder;
    }

    @Data
    public static class Response {
        private String id;
        private String code;
        private String name;
        private String description;
        private Integer monthlyCredits;
        private Long dailyTokenLimit;
        private Long monthlyTokenLimit;
        private Integer maxConversations;
        private Integer maxSkills;
        private Integer maxMcpServers;
        private BigDecimal priceMonthly;
        private BigDecimal priceYearly;
        private Boolean isActive;
        private Integer sortOrder;
        private Long activeSubscriptions;
    }
}