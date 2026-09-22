package com.hermes.admin.dto;

import com.hermes.admin.entity.User;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 用户管理 DTO
 */
public class UserDto {

    @Data
    public static class CreateRequest {
        @NotBlank(message = "邮箱不能为空")
        @Email(message = "邮箱格式不正确")
        private String email;

        @NotBlank(message = "密码不能为空")
        @Size(min = 8, max = 64, message = "密码长度需在 8-64 之间")
        private String password;

        @Size(max = 64, message = "名称长度不能超过 64")
        private String name;

        private User.Role role;
    }

    @Data
    public static class UpdateRequest {
        private String name;
        private User.Role role;
        private User.UserStatus status;
    }

    @Data
    public static class GrantCreditsRequest {
        @NotNull(message = "积分数量不能为空")
        @Min(value = 1, message = "赠送积分必须大于 0")
        @Max(value = 1000000, message = "单次赠送不能超过 100 万")
        private Integer amount;

        @Size(max = 256, message = "原因长度不能超过 256")
        private String reason;
    }

    @Data
    public static class AdjustCreditsRequest {
        private Integer amount;  // 可正可负
        private String reason;
    }

    @Data
    public static class Response {
        private String id;
        private String email;
        private String name;
        private String role;
        private String status;
        private Integer credits;
        private Long totalTokenUsed;
        private String avatarUrl;
        private Boolean freeAccess;
        private String billingMode;
        private String trialStartAt;
        private String trialEndAt;
        private LocalDateTime createdAt;
        private LocalDateTime lastLoginAt;
    }
}