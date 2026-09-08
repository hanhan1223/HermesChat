package com.hermes.admin.controller;

import com.hermes.admin.dto.UserDto;
import com.hermes.admin.entity.User;
import com.hermes.admin.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 用户管理 API
 */
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * 搜索用户（分页）
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public Page<UserDto.Response> searchUsers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) User.Role role,
            @RequestParam(required = false) User.UserStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        return userService.searchUsers(keyword, role, status, pageable);
    }

    /**
     * 获取用户详情
     */
    @GetMapping("/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public UserDto.Response getUserDetail(@PathVariable String userId) {
        return userService.getUserDetail(userId);
    }

    /**
     * 创建用户
     */
    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public UserDto.Response createUser(@Valid @RequestBody UserDto.CreateRequest request) {
        return userService.createUser(request);
    }

    /**
     * 更新用户
     */
    @PutMapping("/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public UserDto.Response updateUser(@PathVariable String userId,
                                        @Valid @RequestBody UserDto.UpdateRequest request) {
        return userService.updateUser(userId, request);
    }

    /**
     * 赠送积分
     */
    @PostMapping("/{userId}/credits/grant")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public UserDto.Response grantCredits(
            @PathVariable String userId,
            @Valid @RequestBody UserDto.GrantCreditsRequest request,
            @AuthenticationPrincipal String adminId) {
        return userService.grantCredits(userId, request, adminId);
    }

    /**
     * 调整积分
     */
    @PostMapping("/{userId}/credits/adjust")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public UserDto.Response adjustCredits(
            @PathVariable String userId,
            @Valid @RequestBody UserDto.AdjustCreditsRequest request,
            @AuthenticationPrincipal String adminId) {
        return userService.adjustCredits(userId, request, adminId);
    }
}