package com.hermes.admin.controller;

import com.hermes.admin.entity.LlmModel;
import com.hermes.admin.service.ModelPoolService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 模型池管理 API
 */
@RestController
@RequestMapping("/models")
@RequiredArgsConstructor
public class ModelController {

    private final ModelPoolService modelPoolService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public List<LlmModel> getModels(@RequestParam(defaultValue = "false") boolean all) {
        return all ? modelPoolService.getAllModels() : modelPoolService.getEnabledModels();
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public LlmModel createModel(@RequestBody LlmModel model) {
        return modelPoolService.createModel(model);
    }

    @PutMapping("/{modelId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public LlmModel updateModel(@PathVariable String modelId, @RequestBody LlmModel updates) {
        return modelPoolService.updateModel(modelId, updates);
    }

    @DeleteMapping("/{modelId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public void deleteModel(@PathVariable String modelId) {
        modelPoolService.deleteModel(modelId);
    }
}