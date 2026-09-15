package com.hermes.admin.gateway;

import com.hermes.admin.entity.ModelProvider;
import com.hermes.admin.exception.ResourceNotFoundException;
import com.hermes.admin.repository.ModelProviderRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 模型提供者管理服务
 * 负责从数据库加载提供者配置，并按权重做负载均衡选择
 */
@Service
@Slf4j
public class ModelProviderService {

    private final ModelProviderRepository providerRepository;

    /** 协议适配器注册表：protocol → adapter */
    private final Map<String, ProtocolAdapter> adapterRegistry;

    /** 提供者本地缓存（毫秒级 TTL，避免每次请求查库） */
    private volatile List<ModelProvider> cachedProviders = List.of();
    private volatile long cacheTimestamp = 0;
    private static final long CACHE_TTL_MS = 30_000; // 30 秒

    /**
     * 构造时收集所有 ProtocolAdapter 实现，按协议标识注册
     */
    public ModelProviderService(ModelProviderRepository providerRepository,
                                List<ProtocolAdapter> adapters) {
        this.providerRepository = providerRepository;
        this.adapterRegistry = adapters.stream()
                .collect(Collectors.toMap(ProtocolAdapter::protocol, Function.identity()));
    }

    /**
     * 获取指定协议的适配器
     */
    public ProtocolAdapter getAdapter(String protocol) {
        ProtocolAdapter adapter = adapterRegistry.get(protocol);
        if (adapter == null) {
            throw new ResourceNotFoundException("不支持的协议类型: " + protocol);
        }
        return adapter;
    }

    /**
     * 按模型标识选择提供者（加权随机）
     * 若该模型有多个启用的提供者，按 weight 做加权随机负载均衡
     */
    public ModelProvider selectProvider(String modelId) {
        List<ModelProvider> candidates = getEnabledProviders().stream()
                .filter(p -> p.getModelId().equals(modelId) || p.getName().equals(modelId))
                .toList();

        if (candidates.isEmpty()) {
            // 回退：尝试精确匹配 modelId
            candidates = providerRepository.findByModelIdAndEnabledTrue(modelId);
        }
        if (candidates.isEmpty()) {
            throw new ResourceNotFoundException("没有可用的模型提供者: " + modelId);
        }
        if (candidates.size() == 1) {
            return candidates.get(0);
        }
        return weightedSelect(candidates);
    }

    /**
     * 列出所有启用的提供者
     */
    public List<ModelProvider> getEnabledProviders() {
        long now = System.currentTimeMillis();
        if (now - cacheTimestamp < CACHE_TTL_MS && !cachedProviders.isEmpty()) {
            return cachedProviders;
        }
        synchronized (this) {
            if (now - cacheTimestamp < CACHE_TTL_MS && !cachedProviders.isEmpty()) {
                return cachedProviders;
            }
            cachedProviders = providerRepository.findByEnabledTrue();
            cacheTimestamp = now;
            return cachedProviders;
        }
    }

    /**
     * 获取所有提供者（含禁用）
     */
    public List<ModelProvider> getAllProviders() {
        return providerRepository.findAll();
    }

    /**
     * 创建提供者
     */
    public ModelProvider createProvider(ModelProvider provider) {
        provider.setId(java.util.UUID.randomUUID().toString().replace("-", ""));
        invalidateCache();
        return providerRepository.save(provider);
    }

    /**
     * 更新提供者
     */
    public ModelProvider updateProvider(String id, ModelProvider updates) {
        ModelProvider provider = getProviderById(id);

        if (updates.getName() != null) provider.setName(updates.getName());
        if (updates.getProtocol() != null) provider.setProtocol(updates.getProtocol());
        if (updates.getBaseUrl() != null) provider.setBaseUrl(updates.getBaseUrl());
        if (updates.getApiKey() != null) provider.setApiKey(updates.getApiKey());
        if (updates.getModelId() != null) provider.setModelId(updates.getModelId());
        if (updates.getEnabled() != null) provider.setEnabled(updates.getEnabled());
        if (updates.getRateLimitPerMinute() != null) provider.setRateLimitPerMinute(updates.getRateLimitPerMinute());
        if (updates.getWeight() != null) provider.setWeight(updates.getWeight());

        invalidateCache();
        return providerRepository.save(provider);
    }

    /**
     * 删除提供者（物理删除）
     */
    public void deleteProvider(String id) {
        ModelProvider provider = getProviderById(id);
        providerRepository.delete(provider);
        invalidateCache();
        log.info("模型提供者已删除: {}", id);
    }

    /**
     * 列出网关暴露的可用模型（去重后的 modelId 列表）
     */
    public List<String> listGatewayModels() {
        return getEnabledProviders().stream()
                .map(ModelProvider::getModelId)
                .distinct()
                .sorted()
                .toList();
    }

    private ModelProvider getProviderById(String id) {
        return providerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("模型提供者不存在: " + id));
    }

    /**
     * 加权随机选择
     */
    private ModelProvider weightedSelect(List<ModelProvider> candidates) {
        int totalWeight = candidates.stream()
                .mapToInt(p -> Math.max(p.getWeight(), 1))
                .sum();
        int rand = ThreadLocalRandom.current().nextInt(totalWeight);
        int cumulative = 0;
        for (ModelProvider p : candidates) {
            cumulative += Math.max(p.getWeight(), 1);
            if (rand < cumulative) {
                return p;
            }
        }
        return candidates.get(candidates.size() - 1);
    }

    private void invalidateCache() {
        cacheTimestamp = 0;
        cachedProviders = List.of();
    }
}
