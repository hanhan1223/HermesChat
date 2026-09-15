package com.hermes.admin.controller;

import com.hermes.admin.dto.SubscriptionDto;
import com.hermes.admin.dto.SubscriptionPlanDto;
import com.hermes.admin.entity.SubscriptionPlan;
import com.hermes.admin.service.SubscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 订阅与配额管理 API
 */
@RestController
@RequestMapping("/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    // ==================== 套餐管理 ====================

    /**
     * 获取所有活跃套餐
     */
    @GetMapping("/plans")
    public List<SubscriptionPlan> getActivePlans() {
        return subscriptionService.getActivePlans();
    }

    /**
     * 创建套餐
     */
    @PostMapping("/plans")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public SubscriptionPlan createPlan(@Valid @RequestBody SubscriptionPlanDto.CreateRequest request) {
        return subscriptionService.createPlan(request);
    }

    /**
     * 更新套餐
     */
    @PutMapping("/plans/{planId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public SubscriptionPlan updatePlan(@PathVariable String planId,
                                        @Valid @RequestBody SubscriptionPlanDto.UpdateRequest request) {
        return subscriptionService.updatePlan(planId, request);
    }

    // ==================== 订阅管理 ====================

    /**
     * 分配/切换用户订阅
     */
    @PostMapping("/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public SubscriptionDto.Response assignSubscription(
            @Valid @RequestBody SubscriptionDto.AssignRequest request) {
        return subscriptionService.assignSubscription(request);
    }

    /**
     * 检查用户配额
     */
    @GetMapping("/quota/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<String> checkQuota(@PathVariable String userId,
                                              @RequestParam(defaultValue = "1000") long tokens) {
        subscriptionService.checkUserQuota(userId, tokens);
        return ResponseEntity.ok("配额充足");
    }
}