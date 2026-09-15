package com.hermes.admin.gateway;

import com.hermes.admin.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * 网关速率限制服务
 * 基于 Redis 固定窗口计数器，按 模型 / 租户 二维限流
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RateLimitService {

    private static final String KEY_PREFIX = "gateway:ratelimit:";

    private final StringRedisTemplate redisTemplate;

    /**
     * 检查并消耗一次配额
     *
     * @param tenantId 租户标识（可为 null，此时仅按模型限流）
     * @param modelId  模型标识
     * @param limitPerMinute 每分钟上限
     * @throws BusinessException 超限时抛出 429
     */
    public void checkAndConsume(String tenantId, String modelId, int limitPerMinute) {
        if (limitPerMinute <= 0) {
            return; // 未配置限流则放行
        }

        String key = buildKey(tenantId, modelId);
        Long count = redisTemplate.opsForValue().increment(key);

        // 首次写入时设置过期时间（1 分钟窗口）
        if (count != null && count == 1L) {
            redisTemplate.expire(key, Duration.ofMinutes(1));
        }

        if (count != null && count > limitPerMinute) {
            log.warn("触发限流: tenant={}, model={}, count={}, limit={}",
                    tenantId, modelId, count, limitPerMinute);
            throw new BusinessException(
                    "请求频率超限，请稍后重试", HttpStatus.TOO_MANY_REQUESTS);
        }
    }

    /**
     * 查询当前窗口剩余配额
     */
    public long getRemaining(String tenantId, String modelId, int limitPerMinute) {
        String key = buildKey(tenantId, modelId);
        String val = redisTemplate.opsForValue().get(key);
        long used = (val == null) ? 0L : Long.parseLong(val);
        return Math.max(0, limitPerMinute - used);
    }

    /**
     * 重置限流计数（管理用途）
     */
    public void reset(String tenantId, String modelId) {
        redisTemplate.delete(buildKey(tenantId, modelId));
    }

    private String buildKey(String tenantId, String modelId) {
        String tenant = (tenantId == null || tenantId.isBlank()) ? "anonymous" : tenantId;
        return KEY_PREFIX + tenant + ":" + modelId;
    }
}
