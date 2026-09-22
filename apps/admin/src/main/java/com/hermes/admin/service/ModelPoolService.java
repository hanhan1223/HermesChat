package com.hermes.admin.service;

import com.hermes.admin.entity.LlmModel;
import com.hermes.admin.exception.ResourceNotFoundException;
import com.hermes.admin.repository.LlmModelRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * 模型池管理服务
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ModelPoolService {

    private final LlmModelRepository modelRepository;

    public List<LlmModel> getEnabledModels() {
        return modelRepository.findByEnabledTrueOrderByPriorityDesc();
    }

    public List<LlmModel> getAllModels() {
        return modelRepository.findAll();
    }

    @Transactional
    public LlmModel createModel(LlmModel model) {
        model.setId(UUID.randomUUID().toString().replace("-", ""));
        return modelRepository.save(model);
    }

    @Transactional
    public LlmModel updateModel(String modelId, LlmModel updates) {
        LlmModel model = getModelById(modelId);
        
        if (updates.getName() != null) model.setName(updates.getName());
        if (updates.getProvider() != null) model.setProvider(updates.getProvider());
        if (updates.getModelId() != null) model.setModelId(updates.getModelId());
        if (updates.getApiKey() != null && !updates.getApiKey().isBlank()) {
            model.setApiKey(updates.getApiKey());
        }
        if (updates.getEndpoint() != null) model.setEndpoint(updates.getEndpoint());
        if (updates.getMaxTokens() != null) model.setMaxTokens(updates.getMaxTokens());
        if (updates.getSupportsVision() != null) model.setSupportsVision(updates.getSupportsVision());
        if (updates.getSupportsTools() != null) model.setSupportsTools(updates.getSupportsTools());
        if (updates.getCostPerInputToken() != null) model.setCostPerInputToken(updates.getCostPerInputToken());
        if (updates.getCostPerOutputToken() != null) model.setCostPerOutputToken(updates.getCostPerOutputToken());
        if (updates.getEnabled() != null) model.setEnabled(updates.getEnabled());
        if (updates.getPriority() != null) model.setPriority(updates.getPriority());
        if (updates.getAvailablePlans() != null) model.setAvailablePlans(updates.getAvailablePlans());

        return modelRepository.save(model);
    }

    @Transactional
    public void deleteModel(String modelId) {
        LlmModel model = getModelById(modelId);
        model.setEnabled(false);
        modelRepository.save(model);
        log.info("模型已禁用: {}", modelId);
    }

    private LlmModel getModelById(String modelId) {
        return modelRepository.findById(modelId)
                .orElseThrow(() -> new ResourceNotFoundException("模型不存在: " + modelId));
    }
}