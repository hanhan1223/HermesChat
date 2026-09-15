package com.hermes.admin.controller;

import com.hermes.admin.entity.CreditTransaction;
import com.hermes.admin.repository.CreditTransactionRepository;
import com.hermes.admin.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * 积分管理 API - 流水查询 + 赠送 + 调整
 */
@RestController
@RequestMapping("/credits")
@RequiredArgsConstructor
public class CreditController {

    private final CreditTransactionRepository creditTransactionRepository;
    private final UserRepository userRepository;

    /**
     * 全局积分流水（分页）
     */
    @GetMapping("/transactions")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public Page<CreditTransaction> listTransactions(
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) CreditTransaction.TransactionType type,
            @PageableDefault(size = 20) Pageable pageable) {
        if (userId != null) {
            return creditTransactionRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        }
        return creditTransactionRepository.findAll(pageable);
    }

    /**
     * 指定用户的积分流水
     */
    @GetMapping("/users/{userId}/transactions")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public Page<CreditTransaction> getUserTransactions(
            @PathVariable String userId,
            @PageableDefault(size = 20) Pageable pageable) {
        return creditTransactionRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    /**
     * 积分概览统计
     */
    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public java.util.Map<String, Object> getCreditStats() {
        var now = java.time.LocalDateTime.now();
        var monthStart = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
        return java.util.Map.of(
                "monthGifted", creditTransactionRepository.sumGiftCreditsInPeriod(monthStart, now),
                "monthConsumed", creditTransactionRepository.sumConsumedCreditsInPeriod(monthStart, now),
                "totalUsers", userRepository.count()
        );
    }
}
