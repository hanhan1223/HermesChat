package com.hermes.admin.controller;

import com.hermes.admin.entity.McpServer;
import com.hermes.admin.exception.ResourceNotFoundException;
import com.hermes.admin.repository.McpServerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * MCP 服务器管理 API
 */
@RestController
@RequestMapping("/mcp")
@RequiredArgsConstructor
public class McpController {

    private final McpServerRepository mcpServerRepository;

    /**
     * 搜索 MCP 服务器（分页）
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public Page<McpServer> search(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20) Pageable pageable) {
        if (status != null) {
            return mcpServerRepository.findAll(pageable); // 简化：全量分页
        }
        return mcpServerRepository.findAll(pageable);
    }

    /**
     * 获取详情
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public McpServer getDetail(@PathVariable String id) {
        return mcpServerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MCP 服务器不存在: " + id));
    }

    /**
     * 删除 MCP 服务器
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public void delete(@PathVariable String id) {
        mcpServerRepository.deleteById(id);
    }

    /**
     * 统计
     */
    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public java.util.Map<String, Object> stats() {
        return java.util.Map.of(
                "total", mcpServerRepository.count(),
                "connected", mcpServerRepository.countByStatus("connected"),
                "disconnected", mcpServerRepository.countByStatus("disconnected")
        );
    }
}
