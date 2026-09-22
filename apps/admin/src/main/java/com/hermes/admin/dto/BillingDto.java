package com.hermes.admin.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 计费 / 额度购买申请 DTO
 */
public class BillingDto {

    @Data
    public static class ConfigResponse {
        private String mode;
        private Integer trialDays;
        private Integer trialCredits;
    }

    @Data
    public static class UpdateConfigRequest {
        private String mode;
        private Integer trialDays;
        private Integer trialCredits;
    }

    /** 一键切换计费模式 */
    @Data
    public static class SetModeRequest {
        @NotNull(message = "计费模式不能为空")
        private String mode; // FREE | TRIAL_THEN_PAID
    }

    @Data
    public static class UserBillingRequest {
        /** free | trial-then-paid | reset-trial */
        @NotNull(message = "操作类型不能为空")
        private String action;
    }

    @Data
    public static class ReviewPurchaseRequest {
        @Min(value = 0, message = "发放额度不能为负")
        @Max(value = 1000000, message = "单次发放不能超过 100 万")
        private Integer grantedAmount;

        private String adminNote;
    }

    @Data
    public static class PurchaseRequestResponse {
        private String id;
        private String userId;
        private String userEmail;
        private String userName;
        private Integer amount;
        private String note;
        private String contact;
        private String status;
        private String adminId;
        private String adminNote;
        private Integer grantedAmount;
        private String createdAt;
        private String reviewedAt;
    }
}
