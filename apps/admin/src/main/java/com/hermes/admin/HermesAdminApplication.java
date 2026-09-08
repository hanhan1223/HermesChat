package com.hermes.admin;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * HermesChat 管理后台 - Spring Boot 主入口
 * 职责：用户管理、订阅管理、配额管理、积分赠送、模型池维护
 */
@SpringBootApplication
@EnableJpaAuditing
@EnableScheduling
public class HermesAdminApplication {

    public static void main(String[] args) {
        SpringApplication.run(HermesAdminApplication.class, args);
    }
}