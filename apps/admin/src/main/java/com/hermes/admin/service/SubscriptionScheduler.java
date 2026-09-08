package com.hermes.admin.service;

import com.hermes.admin.repository.UserSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 定时任务 - 订阅续费与过期处理
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SubscriptionScheduler {

    private final SubscriptionService subscriptionService;
    private final UserSubscriptionRepository subscriptionRepository;

    /**
     * 每天凌晨 2:00 处理过期订阅
     */
    @Scheduled(cron = "0 0 2 * * ?")
    public void handleExpiredSubscriptions() {
        log.info("开始处理过期订阅...");
        subscriptionService.processExpiredSubscriptions();
        log.info("过期订阅处理完成");
    }

    /**
     * 每小时检查并处理续费
     */
    @Scheduled(cron = "0 0 * * * ?")
    public void handleRenewals() {
        log.info("开始处理订阅续费...");
        subscriptionRepository.findByEndDateBeforeAndStatus(
                java.time.LocalDateTime.now().plusDays(1),
                com.hermes.admin.entity.UserSubscription.SubscriptionStatus.ACTIVE
        ).forEach(subscription -> {
            try {
                if (Boolean.TRUE.equals(subscription.getAutoRenew())) {
                    subscriptionService.processRenewal(subscription);
                }
            } catch (Exception e) {
                log.error("订阅续费失败: {}", subscription.getId(), e);
            }
        });
        log.info("订阅续费处理完成");
    }
}