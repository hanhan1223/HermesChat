package com.hermes.admin.service;

import com.hermes.admin.dto.UserDto;
import com.hermes.admin.entity.CreditTransaction;
import com.hermes.admin.entity.User;
import com.hermes.admin.exception.BusinessException;
import com.hermes.admin.exception.ResourceNotFoundException;
import com.hermes.admin.repository.CreditTransactionRepository;
import com.hermes.admin.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * 用户管理服务
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final CreditTransactionRepository creditTransactionRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * 搜索用户（分页）
     */
    public Page<UserDto.Response> searchUsers(String keyword, User.Role role, 
                                               User.UserStatus status, Pageable pageable) {
        return userRepository.searchUsers(keyword, role, status, pageable)
                .map(this::toUserResponse);
    }

    /**
     * 创建用户
     */
    @Transactional
    public UserDto.Response createUser(UserDto.CreateRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException("邮箱已被注册: " + request.getEmail());
        }

        User user = User.builder()
                .id(UUID.randomUUID().toString().replace("-", ""))
                .email(request.getEmail())
                .name(request.getName() != null ? request.getName() : request.getEmail().split("@")[0])
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole() != null ? request.getRole() : User.Role.USER)
                .credits(0)
                .status(User.UserStatus.ACTIVE)
                .build();

        User saved = userRepository.save(user);
        log.info("创建用户成功: {}", saved.getEmail());
        return toUserResponse(saved);
    }

    /**
     * 更新用户信息
     */
    @Transactional
    public UserDto.Response updateUser(String userId, UserDto.UpdateRequest request) {
        User user = getUserById(userId);
        
        if (request.getName() != null) user.setName(request.getName());
        if (request.getRole() != null) user.setRole(request.getRole());
        if (request.getStatus() != null) user.setStatus(request.getStatus());

        return toUserResponse(userRepository.save(user));
    }

    /**
     * 赠送积分
     */
    @Transactional
    public UserDto.Response grantCredits(String userId, UserDto.GrantCreditsRequest request, String adminId) {
        User user = getUserById(userId);
        
        int newBalance = user.getCredits() + request.getAmount();
        user.setCredits(newBalance);
        userRepository.save(user);

        // 记录交易
        CreditTransaction tx = CreditTransaction.builder()
                .id(UUID.randomUUID().toString().replace("-", ""))
                .userId(userId)
                .type(CreditTransaction.TransactionType.GIFT)
                .amount(request.getAmount())
                .balanceAfter(newBalance)
                .reason(request.getReason() != null ? request.getReason() : "管理员赠送")
                .adminId(adminId)
                .build();
        creditTransactionRepository.save(tx);

        log.info("用户 {} 获得赠送积分: {}, 操作人: {}", userId, request.getAmount(), adminId);
        return toUserResponse(user);
    }

    /**
     * 手动调整积分
     */
    @Transactional
    public UserDto.Response adjustCredits(String userId, UserDto.AdjustCreditsRequest request, String adminId) {
        User user = getUserById(userId);
        
        int newBalance = user.getCredits() + request.getAmount();
        if (newBalance < 0) {
            throw new BusinessException("积分调整后余额不能为负");
        }
        user.setCredits(newBalance);
        userRepository.save(user);

        CreditTransaction tx = CreditTransaction.builder()
                .id(UUID.randomUUID().toString().replace("-", ""))
                .userId(userId)
                .type(CreditTransaction.TransactionType.ADJUST)
                .amount(request.getAmount())
                .balanceAfter(newBalance)
                .reason(request.getReason())
                .adminId(adminId)
                .build();
        creditTransactionRepository.save(tx);

        log.info("用户 {} 积分调整: {}, 新余额: {}, 操作人: {}", userId, request.getAmount(), newBalance, adminId);
        return toUserResponse(user);
    }

    public User getUserById(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("用户不存在: " + userId));
    }

    public UserDto.Response getUserDetail(String userId) {
        return toUserResponse(getUserById(userId));
    }

    private UserDto.Response toUserResponse(User user) {
        UserDto.Response resp = new UserDto.Response();
        resp.setId(user.getId());
        resp.setEmail(user.getEmail());
        resp.setName(user.getName());
        resp.setRole(user.getRole().name());
        resp.setStatus(user.getStatus().name());
        resp.setCredits(user.getCredits());
        resp.setTotalTokenUsed(user.getTotalTokenUsed());
        resp.setAvatarUrl(user.getAvatarUrl());
        resp.setCreatedAt(user.getCreatedAt());
        resp.setLastLoginAt(user.getLastLoginAt());
        return resp;
    }
}