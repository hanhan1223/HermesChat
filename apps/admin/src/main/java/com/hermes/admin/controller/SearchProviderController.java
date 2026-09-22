package com.hermes.admin.controller;

import com.hermes.admin.entity.SearchProvider;
import com.hermes.admin.entity.SearchUsageLog;
import com.hermes.admin.service.SearchProviderService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 搜索服务管理 API
 * 路径与前端 /admin/api/search-providers 对齐（Nginx 反代）
 */
@RestController
@RequestMapping({"/search-providers", "/api/search-providers"})
@RequiredArgsConstructor
public class SearchProviderController {

    private final SearchProviderService searchProviderService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public List<Map<String, Object>> list(@RequestParam(defaultValue = "false") boolean all) {
        List<SearchProvider> list = all
                ? searchProviderService.listAll()
                : searchProviderService.listEnabled();
        return list.stream().map(searchProviderService::toSafeDto).toList();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public Map<String, Object> get(@PathVariable String id) {
        return searchProviderService.toSafeDto(searchProviderService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public Map<String, Object> create(@RequestBody SearchProvider body) {
        return searchProviderService.toSafeDto(searchProviderService.create(body));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public Map<String, Object> update(@PathVariable String id, @RequestBody SearchProvider body) {
        return searchProviderService.toSafeDto(searchProviderService.update(id, body));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public void delete(@PathVariable String id) {
        searchProviderService.delete(id);
    }

    @GetMapping("/usage")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public Page<SearchUsageLog> usage(
            @RequestParam(required = false) String userId,
            @PageableDefault(size = 20) Pageable pageable) {
        return searchProviderService.listUsage(userId, pageable);
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public Map<String, Object> stats(@RequestParam(defaultValue = "30") int days) {
        return searchProviderService.stats(days);
    }
}
