package com.hermes.admin.service;

import com.hermes.admin.entity.TokenUsageStat;
import com.hermes.admin.repository.TokenUsageStatRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Token 消耗统计服务
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TokenUsageService {

    private final TokenUsageStatRepository statRepository;

    /**
     * 获取平台整体 Token 用量
     */
    public TokenSummary getTokenSummary(LocalDateTime start, LocalDateTime end) {
        Long totalTokens = statRepository.sumTotalTokensInPeriod(start, end);
        Double totalCost = statRepository.sumCostInPeriod(start, end);

        return new TokenSummary(
                totalTokens != null ? totalTokens : 0L,
                totalCost != null ? totalCost : 0.0,
                start + " ~ " + end
        );
    }

    /**
     * 获取用户 Token 用量
     */
    public List<TokenUsageStat> getUserUsage(String userId, LocalDateTime start, LocalDateTime end) {
        return statRepository.findByUserIdAndUsageDateBetweenOrderByUsageDateDesc(userId, start, end);
    }

    /**
     * 获取模型使用分布
     */
    public List<Object[]> getModelDistribution(LocalDateTime start, LocalDateTime end) {
        return statRepository.sumTokensByModelInPeriod(start, end);
    }

    public record TokenSummary(Long totalTokens, Double totalCost, String period) {}
}