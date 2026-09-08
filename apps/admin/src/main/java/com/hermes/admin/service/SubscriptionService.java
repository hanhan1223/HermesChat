package com.hermes.admin.service;

import com.hermes.admin.dto.SubscriptionDto;
import com.hermes.admin.dto.SubscriptionPlanDto;
import com.hermes.admin.entity.*;
import com.hermes.admin.exception.BusinessException;
import com.hermes.admin.exception.ResourceNotFoundException;
import com.hermes.admin.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * 订阅与配额管理服务
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionService {

    private final SubscriptionPlanRepository planRepository;
    private final UserSubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final CreditTransactionRepository creditTransactionRepository;

    // ==================== 套餐管理 ====================

    public List<SubscriptionPlan> getActivePlans() {
        return planRepository.findByIsActiveTrueOrderBySortOrderAsc();
    }

    @Transactional
    public SubscriptionPlan createPlan(SubscriptionPlanDto.CreateRequest request) {
        if (planRepository.findByCode(request.getCode()).isPresent()) {
            throw new BusinessException("套餐编码已存在: " + request.getCode());
        }

        SubscriptionPlan plan = SubscriptionPlan.builder()
                .id(UUID.randomUUID().toString().replace("-", ""))
                .code(request.getCode())
                .name(request.getName())
                .description(request.getDescription())
                .monthlyCredits(request.getMonthlyCredits())
                .dailyTokenLimit(request.getDailyTokenLimit())
                .monthlyTokenLimit(request.getMonthlyTokenLimit())
                .maxConversations(request.getMaxConversations())
                .maxSkills(request.getMaxSkills())
                .maxMcpServers(request.getMaxMcpServers())
                .priceMonthly(request.getPriceMonthly())
                .priceYearly(request.getPriceYearly())
                .isActive(true)
                .sortOrder(request.getSortOrder())
                .build();

        return planRepository.save(plan);
    }

    @Transactional
    public SubscriptionPlan updatePlan(String planId, SubscriptionPlanDto.UpdateRequest request) {
        SubscriptionPlan plan = getPlanById(planId);
        
        if (request.getName() != null) plan.setName(request.getName());
        if (request.getDescription() != null) plan.setDescription(request.getDescription());
        if (request.getMonthlyCredits() != null) plan.setMonthlyCredits(request.getMonthlyCredits());
        if (request.getDailyTokenLimit() != null) plan.setDailyTokenLimit(request.getDailyTokenLimit());
        if (request.getMonthlyTokenLimit() != null) plan.setMonthlyTokenLimit(request.getMonthlyTokenLimit());
        if (request.getMaxConversations() != null) plan.setMaxConversations(request.getMaxConversations());
        if (request.getMaxSkills() != null) plan.setMaxSkills(request.getMaxSkills());
        if (request.getMaxMcpServers() != null) plan.setMaxMcpServers(request.getMaxMcpServers());
        if (request.getPriceMonthly() != null) plan.setPriceMonthly(request.getPriceMonthly());
        if (request.getPriceYearly() != null) plan.setPriceYearly(request.getPriceYearly());
        if (request.getIsActive() != null) plan.setIsActive(request.getIsActive());
        if (request.getSortOrder() != null) plan.setSortOrder(request.getSortOrder());

        return planRepository.save(plan);
    }

    // ==================== 订阅管理 ====================

    /**
     * 为用户分配/切换订阅
     */
    @Transactional
    public SubscriptionDto.Response assignSubscription(SubscriptionDto.AssignRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("用户不存在"));
        SubscriptionPlan plan = getPlanById(request.getPlanId());

        // 将现有活跃订阅置为过期
        subscriptionRepository.findByUserIdAndStatus(
                request.getUserId(), UserSubscription.SubscriptionStatus.ACTIVE
        ).ifPresent(sub -> {
            sub.setStatus(UserSubscription.SubscriptionStatus.EXPIRED);
            subscriptionRepository.save(sub);
        });

        int duration = request.getDurationMonths() != null ? request.getDurationMonths() : 1;
        LocalDateTime now = LocalDateTime.now();

        UserSubscription newSub = UserSubscription.builder()
                .id(UUID.randomUUID().toString().replace("-", ""))
                .userId(request.getUserId())
                .planId(request.getPlanId())
                .status(UserSubscription.SubscriptionStatus.ACTIVE)
                .startDate(now)
                .endDate(now.plusMonths(duration))
                .autoRenew(request.getAutoRenew() != null ? request.getAutoRenew() : true)
                .currentPeriodCredits(plan.getMonthlyCredits())
                .currentPeriodTokens(0L)
                .build();

        UserSubscription saved = subscriptionRepository.save(newSub);

        // 发放订阅积分
        grantSubscriptionCredits(user, plan, saved.getId());

        log.info("用户 {} 订阅套餐: {}, 时长: {}个月", user.getId(), plan.getCode(), duration);
        return toSubscriptionResponse(saved, plan.getName());
    }

    /**
     * 执行订阅续费（定时任务调用）
     */
    @Transactional
    public void processRenewal(UserSubscription subscription) {
        SubscriptionPlan plan = getPlanById(subscription.getPlanId());
        User user = userRepository.findById(subscription.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("用户不存在"));

        subscription.setStartDate(LocalDateTime.now());
        subscription.setEndDate(subscription.getEndDate().plusMonths(1));
        subscription.setCurrentPeriodCredits(subscription.getCurrentPeriodCredits() + plan.getMonthlyCredits());
        subscriptionRepository.save(subscription);

        grantSubscriptionCredits(user, plan, subscription.getId());
        log.info("用户 {} 订阅续费成功: {}", user.getId(), plan.getCode());
    }

    /**
     * 检查并处理过期订阅（定时任务调用）
     */
    @Transactional
    public void processExpiredSubscriptions() {
        List<UserSubscription> expired = subscriptionRepository.findByEndDateBeforeAndStatus(
                LocalDateTime.now(), UserSubscription.SubscriptionStatus.ACTIVE);
        
        for (UserSubscription sub : expired) {
            sub.setStatus(UserSubscription.SubscriptionStatus.EXPIRED);
            subscriptionRepository.save(sub);
            log.info("用户 {} 订阅已过期", sub.getUserId());
        }
    }

    /**
     * 检查用户配额
     */
    public void checkUserQuota(String userId, long estimatedTokens) {
        UserSubscription subscription = subscriptionRepository
                .findByUserIdAndStatus(userId, UserSubscription.SubscriptionStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException("无有效订阅"));

        SubscriptionPlan plan = getPlanById(subscription.getPlanId());

        // 检查月度 Token 限额
        if (subscription.getCurrentPeriodTokens() + estimatedTokens > plan.getMonthlyTokenLimit()) {
            throw new BusinessException("已超过月度 Token 限额，请升级套餐或等待下月重置");
        }

        // 检查积分是否充足
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("用户不存在"));
        if (user.getCredits() <= 0) {
            throw new BusinessException("积分不足，请充值或获取赠送");
        }
    }

    // ==================== 私有方法 ====================

    private void grantSubscriptionCredits(User user, SubscriptionPlan plan, String subscriptionId) {
        if (plan.getMonthlyCredits() <= 0) return;

        int newBalance = user.getCredits() + plan.getMonthlyCredits();
        user.setCredits(newBalance);
        userRepository.save(user);

        CreditTransaction tx = CreditTransaction.builder()
                .id(UUID.randomUUID().toString().replace("-", ""))
                .userId(user.getId())
                .type(CreditTransaction.TransactionType.SUBSCRIPTION)
                .amount(plan.getMonthlyCredits())
                .balanceAfter(newBalance)
                .reason("订阅发放: " + plan.getName())
                .referenceId(subscriptionId)
                .build();
        creditTransactionRepository.save(tx);
    }

    private SubscriptionPlan getPlanById(String planId) {
        return planRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException("套餐不存在: " + planId));
    }

    private SubscriptionDto.Response toSubscriptionResponse(UserSubscription sub, String planName) {
        SubscriptionDto.Response resp = new SubscriptionDto.Response();
        resp.setId(sub.getId());
        resp.setUserId(sub.getUserId());
        resp.setPlanId(sub.getPlanId());
        resp.setPlanName(planName);
        resp.setStatus(sub.getStatus().name());
        resp.setStartDate(sub.getStartDate());
        resp.setEndDate(sub.getEndDate());
        resp.setAutoRenew(sub.getAutoRenew());
        resp.setCurrentPeriodCredits(sub.getCurrentPeriodCredits());
        resp.setCurrentPeriodTokens(sub.getCurrentPeriodTokens());
        return resp;
    }
}