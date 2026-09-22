package com.hermes.admin.controller;

import com.hermes.admin.entity.TokenUsageStat;
import com.hermes.admin.service.TokenUsageService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Token 消耗统计 API
 */
@RestController
@RequestMapping("/tokens")
@RequiredArgsConstructor
public class TokenUsageController {

    private final TokenUsageService tokenUsageService;

    /**
     * 平台整体 Token 用量汇总
     */
    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public TokenUsageService.TokenSummary getSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        LocalDateTime s = start != null ? start : LocalDateTime.now().minusDays(30);
        LocalDateTime e = end != null ? end : LocalDateTime.now();
        return tokenUsageService.getTokenSummary(s, e);
    }

    /**
     * 用户 Token 用量明细
     */
    @GetMapping("/users/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public List<TokenUsageStat> getUserUsage(
            @PathVariable String userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        LocalDateTime s = start != null ? start : LocalDateTime.now().minusDays(30);
        LocalDateTime e = end != null ? end : LocalDateTime.now();
        return tokenUsageService.getUserUsage(userId, s, e);
    }

    /**
     * 模型使用分布
     */
    @GetMapping("/distribution")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public List<Object[]> getModelDistribution(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        LocalDateTime s = start != null ? start : LocalDateTime.now().minusDays(30);
        LocalDateTime e = end != null ? end : LocalDateTime.now();
        return tokenUsageService.getModelDistribution(s, e);
    }
}