package com.hermes.admin.service;

import com.hermes.admin.entity.SearchProvider;
import com.hermes.admin.entity.SearchUsageLog;
import com.hermes.admin.exception.ResourceNotFoundException;
import com.hermes.admin.repository.SearchProviderRepository;
import com.hermes.admin.repository.SearchUsageLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 搜索服务管理：Provider 配置（API Key / 单价 / 限流）+ 用量统计
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SearchProviderService {

    private final SearchProviderRepository providerRepository;
    private final SearchUsageLogRepository usageLogRepository;

    public List<SearchProvider> listAll() {
        return providerRepository.findAll();
    }

    public List<SearchProvider> listEnabled() {
        return providerRepository.findByEnabledTrueOrderByPriorityDesc();
    }

    public SearchProvider getById(String id) {
        return providerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("搜索服务不存在: " + id));
    }

    @Transactional
    public SearchProvider create(SearchProvider body) {
        body.setId(UUID.randomUUID().toString().replace("-", ""));
        if (body.getEnabled() == null) body.setEnabled(true);
        if (body.getCostPerCall() == null) body.setCostPerCall(0);
        if (body.getRateLimitPerMinute() == null) body.setRateLimitPerMinute(30);
        if (body.getPriority() == null) body.setPriority(0);
        log.info("创建搜索服务配置: {} ({})", body.getName(), body.getProviderType());
        return providerRepository.save(body);
    }

    @Transactional
    public SearchProvider update(String id, SearchProvider updates) {
        SearchProvider entity = getById(id);

        if (updates.getName() != null) entity.setName(updates.getName());
        if (updates.getProviderType() != null) entity.setProviderType(updates.getProviderType());
        // apiKey 传空字符串表示清空；null 表示不改
        if (updates.getApiKey() != null) {
            entity.setApiKey(updates.getApiKey().isEmpty() ? null : updates.getApiKey());
        }
        if (updates.getBaseUrl() != null) entity.setBaseUrl(updates.getBaseUrl());
        if (updates.getEnabled() != null) entity.setEnabled(updates.getEnabled());
        if (updates.getCostPerCall() != null) entity.setCostPerCall(updates.getCostPerCall());
        // dailyQuota 支持显式清空：传 -1 表示不限
        if (updates.getDailyQuota() != null) {
            entity.setDailyQuota(updates.getDailyQuota() < 0 ? null : updates.getDailyQuota());
        }
        if (updates.getRateLimitPerMinute() != null) {
            entity.setRateLimitPerMinute(updates.getRateLimitPerMinute());
        }
        if (updates.getPriority() != null) entity.setPriority(updates.getPriority());
        if (updates.getConfig() != null) entity.setConfig(updates.getConfig());

        return providerRepository.save(entity);
    }

    @Transactional
    public void delete(String id) {
        SearchProvider entity = getById(id);
        entity.setEnabled(false);
        providerRepository.save(entity);
        log.info("搜索服务已禁用: {}", id);
    }

    public Page<SearchUsageLog> listUsage(String userId, Pageable pageable) {
        if (userId != null && !userId.isBlank()) {
            return usageLogRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        }
        return usageLogRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    public Map<String, Object> stats(int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(Math.max(days, 1));
        Map<String, Object> out = new HashMap<>();
        out.put("days", days);
        out.put("totalCredits", usageLogRepository.sumCreditsSince(since));
        out.put("byProvider", usageLogRepository.aggregateByProviderTypeSince(since));
        return out;
    }

    /**
     * 列表时脱敏 API Key，避免管理列表泄露完整密钥
     */
    public Map<String, Object> toSafeDto(SearchProvider p) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", p.getId());
        dto.put("providerType", p.getProviderType());
        dto.put("name", p.getName());
        dto.put("apiKeyMasked", maskKey(p.getApiKey()));
        dto.put("hasApiKey", p.getApiKey() != null && !p.getApiKey().isEmpty());
        dto.put("baseUrl", p.getBaseUrl());
        dto.put("enabled", p.getEnabled());
        dto.put("costPerCall", p.getCostPerCall());
        dto.put("dailyQuota", p.getDailyQuota());
        dto.put("rateLimitPerMinute", p.getRateLimitPerMinute());
        dto.put("priority", p.getPriority());
        dto.put("createdAt", p.getCreatedAt());
        dto.put("updatedAt", p.getUpdatedAt());
        return dto;
    }

    private String maskKey(String key) {
        if (key == null || key.isEmpty()) return "";
        if (key.length() <= 8) return "****";
        return key.substring(0, 3) + "****" + key.substring(key.length() - 4);
    }
}
