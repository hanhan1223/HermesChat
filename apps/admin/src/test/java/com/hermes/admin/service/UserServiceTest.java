package com.hermes.admin.service;

import com.hermes.admin.dto.UserDto;
import com.hermes.admin.entity.User;
import com.hermes.admin.exception.BusinessException;
import com.hermes.admin.repository.UserRepository;
import com.hermes.admin.repository.CreditTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CreditTransactionRepository creditTransactionRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(UUID.randomUUID().toString().replace("-", ""))
                .email("test@hermes.chat")
                .name("测试用户")
                .passwordHash("hashed_password")
                .role(User.Role.USER)
                .status(User.UserStatus.ACTIVE)
                .credits(1000)
                .build();
    }

    @Test
    void testGetUserById_Success() {
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        User result = userService.getUserById(testUser.getId());
        assertNotNull(result);
        assertEquals("test@hermes.chat", result.getEmail());
    }

    @Test
    void testGetUserById_NotFound() {
        when(userRepository.findById("nonexistent")).thenReturn(Optional.empty());
        assertThrows(Exception.class, () -> userService.getUserById("nonexistent"));
    }

    @Test
    void testGrantCredits() {
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(creditTransactionRepository.save(any())).thenReturn(null);

        UserDto.GrantCreditsRequest request = new UserDto.GrantCreditsRequest();
        request.setAmount(500);
        request.setReason("测试赠送");

        var response = userService.grantCredits(testUser.getId(), request, "admin001");
        assertEquals(1500, response.getCredits());
    }

    @Test
    void testCreateUser_DuplicateEmail() {
        when(userRepository.existsByEmail("test@hermes.chat")).thenReturn(true);

        UserDto.CreateRequest request = new UserDto.CreateRequest();
        request.setEmail("test@hermes.chat");
        request.setPassword("password123");

        assertThrows(BusinessException.class, () -> userService.createUser(request));
    }
}