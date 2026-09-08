package com.hermes.admin;

import com.hermes.admin.dto.UserDto;
import com.hermes.admin.entity.User;
import com.hermes.admin.repository.UserRepository;
import com.hermes.admin.security.JwtTokenProvider;
import com.hermes.admin.service.UserService;
import com.hermes.admin.service.SubscriptionService;
import com.hermes.admin.dto.SubscriptionPlanDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("dev")
@Transactional
class HermesAdminApplicationTests {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private SubscriptionService subscriptionService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(UUID.randomUUID().toString().replace("-", ""))
                .email("test@hermes.chat")
                .name("测试用户")
                .passwordHash(passwordEncoder.encode("test123456"))
                .role(User.Role.USER)
                .status(User.UserStatus.ACTIVE)
                .credits(1000)
                .build();
        userRepository.save(testUser);
    }

    @Test
    void contextLoads() {
        assertNotNull(userRepository);
        assertNotNull(userService);
    }

    @Test
    void testSearchUsers() {
        var users = userService.searchUsers(null, null, null, null);
        assertNotNull(users);
        assertTrue(users.getTotalElements() > 0);
    }

    @Test
    void testCreateUser() {
        UserDto.CreateRequest request = new UserDto.CreateRequest();
        request.setEmail("newuser@hermes.chat");
        request.setPassword("password123");
        request.setName("新用户");
        var response = userService.createUser(request);
        assertNotNull(response);
        assertEquals("newuser@hermes.chat", response.getEmail());
    }

    @Test
    void testGrantCredits() {
        UserDto.GrantCreditsRequest request = new UserDto.GrantCreditsRequest();
        request.setAmount(500);
        request.setReason("测试赠送");
        var response = userService.grantCredits(testUser.getId(), request, "admin001");
        assertEquals(1500, response.getCredits());
    }

    @Test
    void testAdjustCredits_NegativeBalance() {
        UserDto.AdjustCreditsRequest request = new UserDto.AdjustCreditsRequest();
        request.setAmount(-9999);
        request.setReason("测试");
        assertThrows(Exception.class, () -> userService.adjustCredits(testUser.getId(), request, "admin001"));
    }

    @Test
    void testCreatePlan() {
        SubscriptionPlanDto.CreateRequest request = new SubscriptionPlanDto.CreateRequest();
        request.setCode("test_plan");
        request.setName("测试套餐");
        request.setMonthlyCredits(5000);
        request.setDailyTokenLimit(50000L);
        request.setMonthlyTokenLimit(500000L);
        request.setPriceMonthly(new BigDecimal("99"));
        var plan = subscriptionService.createPlan(request);
        assertNotNull(plan);
        assertEquals("test_plan", plan.getCode());
    }

    @Test
    void testJwtToken() {
        String token = jwtTokenProvider.generateToken(testUser.getId(), testUser.email(), testUser.getRole().name());
        assertNotNull(token);
        assertTrue(jwtTokenProvider.validateToken(token));
        assertEquals(testUser.getId(), jwtTokenProvider.getUserIdFromToken(token));
    }

    @Test
    void testJwtToken_Invalid() {
        assertFalse(jwtTokenProvider.validateToken("invalid.token.here"));
    }
}