package com.hermes.admin.service;

import com.hermes.admin.dto.BillingDto;
import com.hermes.admin.entity.BillingConfig;
import com.hermes.admin.entity.CreditTransaction;
import com.hermes.admin.entity.User;
import com.hermes.admin.exception.BusinessException;
import com.hermes.admin.exception.ResourceNotFoundException;
import com.hermes.admin.repository.BillingConfigRepository;
import com.hermes.admin.repository.CreditTransactionRepository;
import com.hermes.admin.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/**
 * 计费策略服务：平台一键切换 + 用户级免费/试用后付费
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BillingService {

    public static final String MODE_FREE = "FREE";
    public static final String MODE_TRIAL_THEN_PAID = "TRIAL_THEN_PAID";

    private final BillingConfigRepository billingConfigRepository;
    private final UserRepository userRepository;
    private final CreditTransactionRepository creditTransactionRepository;

    public BillingConfig getConfig() {
        return billingConfigRepository.findById("default").orElseGet(() -> {
            BillingConfig config = BillingConfig.builder().id("default").build();
            return billingConfigRepository.save(config);
        });
    }

    public BillingDto.ConfigResponse getConfigResponse() {
        BillingConfig config = getConfig();
        BillingDto.ConfigResponse resp = new BillingDto.ConfigResponse();
        resp.setMode(normalizeMode(config.getMode()));
        resp.setTrialDays(config.getTrialDays());
        resp.setTrialCredits(config.getTrialCredits());
        return resp;
    }

    @Transactional
    public BillingDto.ConfigResponse updateConfig(BillingDto.UpdateConfigRequest request) {
        BillingConfig config = getConfig();
        if (request.getMode() != null) {
            config.setMode(parseMode(request.getMode()));
        }
        if (request.getTrialDays() != null) {
            if (request.getTrialDays() < 0 || request.getTrialDays() > 365) {
                throw new BusinessException("试用天数需在 0-365 之间");
            }
            config.setTrialDays(request.getTrialDays());
        }
        if (request.getTrialCredits() != null) {
            if (request.getTrialCredits() < 0) {
                throw new BusinessException("试用积分不能为负");
            }
            config.setTrialCredits(request.getTrialCredits());
        }
        billingConfigRepository.save(config);
        log.info("计费配置已更新: mode={}, trialDays={}, trialCredits={}",
                config.getMode(), config.getTrialDays(), config.getTrialCredits());
        return getConfigResponse();
    }

    /**
     * 一键切换平台计费模式：免费使用 / 试用期后付费
     */
    @Transactional
    public BillingDto.ConfigResponse setMode(BillingDto.SetModeRequest request) {
        BillingConfig config = getConfig();
        config.setMode(parseMode(request.getMode()));
        billingConfigRepository.save(config);
        log.info("平台计费模式一键切换为: {}", config.getMode());
        return getConfigResponse();
    }

    /**
     * 用户级一键设置：
     * - free: 用户免费使用
     * - trial-then-paid: 试用期后需要付费
     * - reset-trial: 重置试用期（按当前配置重新起算，并发放试用积分）
     */
    @Transactional
    public void applyUserBillingAction(String userId, String action) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("用户不存在: " + userId));
        BillingConfig config = getConfig();

        switch (action == null ? "" : action.trim().toLowerCase()) {
            case "free" -> {
                user.setFreeAccess(true);
                user.setBillingMode(null);
                userRepository.save(user);
                log.info("用户 {} 已设为免费使用", userId);
            }
            case "trial-then-paid", "paid" -> {
                user.setFreeAccess(false);
                user.setBillingMode(MODE_TRIAL_THEN_PAID);
                ensureTrial(user, config, false);
                userRepository.save(user);
                log.info("用户 {} 已设为试用期后付费", userId);
            }
            case "reset-trial" -> {
                user.setFreeAccess(false);
                user.setBillingMode(MODE_TRIAL_THEN_PAID);
                ensureTrial(user, config, true);
                grantTrialCredits(user, config);
                userRepository.save(user);
                log.info("用户 {} 试用期已重置", userId);
            }
            default -> throw new BusinessException("不支持的操作: " + action + "（可选 free / trial-then-paid / reset-trial）");
        }
    }

    @Transactional
    public void initTrialIfNeeded(User user) {
        BillingConfig config = getConfig();
        if (!MODE_TRIAL_THEN_PAID.equals(normalizeMode(config.getMode()))) {
            return;
        }
        if (user.getTrialStartAt() == null) {
            ensureTrial(user, config, true);
            grantTrialCredits(user, config);
            userRepository.save(user);
        }
    }

    private void ensureTrial(User user, BillingConfig config, boolean forceReset) {
        if (!forceReset && user.getTrialStartAt() != null && user.getTrialEndAt() != null
                && LocalDateTime.now(ZoneOffset.UTC).isBefore(user.getTrialEndAt())) {
            return;
        }
        // 统一写 UTC，避免 Prisma/JS 端把 timestamp 当 UTC 读导致试用期偏移
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        user.setTrialStartAt(now);
        user.setTrialEndAt(now.plusDays(Math.max(0, config.getTrialDays())));
    }

    private void grantTrialCredits(User user, BillingConfig config) {
        int credits = Math.max(0, config.getTrialCredits());
        if (credits <= 0) return;
        int newBalance = user.getCredits() + credits;
        user.setCredits(newBalance);
        userRepository.save(user);

        CreditTransaction tx = CreditTransaction.builder()
                .id(UUID.randomUUID().toString().replace("-", ""))
                .userId(user.getId())
                .type(CreditTransaction.TransactionType.GIFT)
                .amount(credits)
                .balanceAfter(newBalance)
                .reason("试用期赠送积分")
                .build();
        creditTransactionRepository.save(tx);
    }

    private String parseMode(String mode) {
        return normalizeMode(mode);
    }

    private String normalizeMode(String mode) {
        if (mode == null || mode.isBlank()) {
            throw new BusinessException("计费模式不能为空（可选 FREE / TRIAL_THEN_PAID）");
        }
        String normalized = mode.trim().toUpperCase().replace('-', '_');
        return switch (normalized) {
            case "FREE" -> MODE_FREE;
            case "TRIAL_THEN_PAID", "TRIAL", "PAID" -> MODE_TRIAL_THEN_PAID;
            default -> throw new BusinessException("无效计费模式: " + mode + "（可选 FREE / TRIAL_THEN_PAID）");
        };
    }
}
