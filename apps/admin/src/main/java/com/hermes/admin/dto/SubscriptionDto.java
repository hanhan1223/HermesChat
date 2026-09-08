package com.hermes.admin.dto;

import com.hermes.admin.entity.CreditTransaction;
import com.hermes.admin.entity.UserSubscription;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 订阅管理 DTO
 */
public class SubscriptionDto {

    @Data
    public static class AssignRequest {
        @NotBlank
        private String userId;

        @NotBlank
        private String planId;

        @Min(1)
        private Integer durationMonths;

        private Boolean autoRenew;
    }

    @Data
    public static class Response {
        private String id;
        private String userId;
        private String planId;
        private String planName;
        private String status;
        private LocalDateTime startDate;
        private LocalDateTime endDate;
        private Boolean autoRenew;
        private Integer currentPeriodCredits;
        private Long currentPeriodTokens;
    }

    @Data
    public static class TransactionResponse {
        private String id;
        private String userId;
        private String type;
        private Integer amount;
        private Integer balanceAfter;
        private String reason;
        private String adminId;
        private LocalDateTime createdAt;
    }
}