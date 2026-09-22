package com.hermes.admin.controller;

import com.hermes.admin.dto.BillingDto;
import com.hermes.admin.service.BillingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * 计费策略 API：
 * - 一键切换「免费使用 / 试用期后付费」
 * - 用户级一键设为免费或试用后付费
 */
@RestController
@RequestMapping("/billing")
@RequiredArgsConstructor
public class BillingController {

    private final BillingService billingService;

    @GetMapping("/config")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public BillingDto.ConfigResponse getConfig() {
        return billingService.getConfigResponse();
    }

    @PutMapping("/config")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public BillingDto.ConfigResponse updateConfig(@Valid @RequestBody BillingDto.UpdateConfigRequest request) {
        return billingService.updateConfig(request);
    }

    /** 一键设置用户免费使用 / 试用期后需要付费 */
    @PostMapping("/mode")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public BillingDto.ConfigResponse setMode(@Valid @RequestBody BillingDto.SetModeRequest request) {
        return billingService.setMode(request);
    }

    /**
     * 用户级一键操作
     * action: free | trial-then-paid | reset-trial
     */
    @PostMapping("/users/{userId}/action")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public String userBillingAction(@PathVariable String userId,
                                    @Valid @RequestBody BillingDto.UserBillingRequest request) {
        billingService.applyUserBillingAction(userId, request.getAction());
        return "ok";
    }
}
