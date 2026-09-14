package com.hermes.admin.controller;

import com.hermes.admin.entity.Skill;
import com.hermes.admin.exception.ResourceNotFoundException;
import com.hermes.admin.repository.SkillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Skill 管理 API
 */
@RestController
@RequestMapping("/skills")
@RequiredArgsConstructor
public class SkillController {

    private final SkillRepository skillRepository;

    /**
     * 搜索 Skill（分页）
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public Page<Skill> search(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 20) Pageable pageable) {
        return skillRepository.search(keyword, pageable);
    }

    /**
     * 获取 Skill 详情
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public Skill getDetail(@PathVariable String id) {
        return skillRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Skill 不存在: " + id));
    }

    /**
     * 删除 Skill
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public void delete(@PathVariable String id) {
        skillRepository.deleteById(id);
    }

    /**
     * 统计
     */
    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public java.util.Map<String, Object> stats() {
        return java.util.Map.of(
                "total", skillRepository.count(),
                "public", skillRepository.countByIsPublicTrue()
        );
    }
}
