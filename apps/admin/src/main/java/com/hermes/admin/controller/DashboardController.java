package com.hermes.admin.controller;

import com.hermes.admin.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 仪表盘 API - 前端 /admin 调用
 */
@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final UserRepository userRepository;
    private final CreditTransactionRepository creditTransactionRepository;
    private final TokenUsageStatRepository tokenUsageStatRepository;
    private final UserSubscriptionRepository userSubscriptionRepository;
    private final LlmModelRepository llmModelRepository;

    /**
     * 仪表盘统计数据
     */
    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public Map<String, Object> getStats() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime monthStart = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
        LocalDateTime dayStart = LocalDate.now().atStartOfDay();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", userRepository.count());
        stats.put("activeUsers", userRepository.countByStatus(com.hermes.admin.entity.User.UserStatus.ACTIVE));
        stats.put("totalTokens", tokenUsageStatRepository.sumTotalTokensInPeriod(monthStart, now));
        stats.put("totalCredits", creditTransactionRepository.sumGiftCreditsInPeriod(monthStart, now));
        stats.put("activeSubscriptions", userSubscriptionRepository.countActiveSubscriptions());
        stats.put("totalConversations", 0L); // 对话表在 NestJS 侧，此处留占位
        stats.put("todayTokens", tokenUsageStatRepository.sumTotalTokensInPeriod(dayStart, now));
        stats.put("monthCost", tokenUsageStatRepository.sumCostInPeriod(monthStart, now));
        stats.put("enabledModels", llmModelRepository.countByEnabledTrue());
        return stats;
    }

    /**
     * Token 用量趋势（按模型）
     */
    @GetMapping("/tokens/by-model")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public Map<String, Object> getTokensByModel(
            @RequestParam(required = false) Integer days) {
        int d = days != null ? days : 30;
        LocalDateTime start = LocalDateTime.now().minusDays(d);
        LocalDateTime end = LocalDateTime.now();

        var rows = tokenUsageStatRepository.sumTokensByModelInPeriod(start, end);
        return Map.of("period", d + "d", "data", rows);
    }
}
