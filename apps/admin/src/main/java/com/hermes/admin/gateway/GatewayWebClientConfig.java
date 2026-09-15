package com.hermes.admin.gateway;

import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;
import reactor.netty.resources.ConnectionProvider;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * 网关 WebClient 配置
 * 非阻塞 HTTP 客户端，连接池化以支撑高并发上游调用
 */
@Configuration
public class GatewayWebClientConfig {

    /** 连接超时（毫秒） */
    private static final int CONNECT_TIMEOUT_MS = 5_000;

    /** 读超时（秒）——流式场景需足够长 */
    private static final int READ_TIMEOUT_SEC = 120;

    /** 空闲连接存活时间（秒） */
    private static final int MAX_IDLE_TIME_SEC = 60;

    @Bean
    public WebClient webClient() {
        // 连接池配置：高复用、低延迟
        ConnectionProvider provider = ConnectionProvider.builder("gateway-pool")
                .maxIdleTime(Duration.ofSeconds(MAX_IDLE_TIME_SEC))
                .pendingAcquireMaxCount(1000)
                .build();

        HttpClient httpClient = HttpClient.create(provider)
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, CONNECT_TIMEOUT_MS)
                .responseTimeout(Duration.ofSeconds(READ_TIMEOUT_SEC))
                .doOnConnected(conn -> conn.addHandlerLast(
                        new ReadTimeoutHandler(READ_TIMEOUT_SEC, TimeUnit.SECONDS)))
                .keepAlive(true)
                .compress(true);

        return WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .codecs(configurer -> configurer
                        .defaultCodecs()
                        .maxInMemorySize(16 * 1024 * 1024)) // 16MB，兼容大响应
                .build();
    }
}
