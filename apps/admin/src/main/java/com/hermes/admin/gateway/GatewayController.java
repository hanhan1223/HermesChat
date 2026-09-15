package com.hermes.admin.gateway;

import com.hermes.admin.entity.ModelProvider;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import reactor.core.Disposable;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * 模型网关 API
 * 对外暴露 OpenAI 兼容端点：/gateway/v1/chat/completions、/gateway/v1/models
 * 内部按协议路由到对应 Adapter，支持 SSE 流式输出
 */
@RestController
@RequestMapping("/gateway/v1")
@RequiredArgsConstructor
@Slf4j
public class GatewayController {

    private final ModelProviderService providerService;
    private final RateLimitService rateLimitService;

    /** SSE 异步写入线程池 */
    private static final ExecutorService SSE_EXECUTOR = Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r, "gateway-sse");
        t.setDaemon(true);
        return t;
    });

    /**
     * OpenAI 兼容：列出可用模型
     * GET /gateway/v1/models
     */
    @GetMapping("/models")
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> listModels() {
        List<String> modelIds = providerService.listGatewayModels();
        List<Map<String, Object>> data = modelIds.stream()
                .map(id -> Map.<String, Object>of(
                        "id", id,
                        "object", "model",
                        "owned_by", "hermes-gateway"
                ))
                .toList();
        return Map.of(
                "object", "list",
                "data", data
        );
    }

    /**
     * OpenAI 兼容：非流式对话补全
     * POST /gateway/v1/chat/completions  (stream=false 或省略)
     */
    @PostMapping(value = "/chat/completions",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("isAuthenticated()")
    public Object chatCompletions(@Valid @RequestBody GatewayRequest request) {
        ModelProvider provider = selectAndRateLimit(request);

        if (Boolean.TRUE.equals(request.getStream())) {
            return doStream(provider, request);
        }

        ProtocolAdapter adapter = providerService.getAdapter(provider.getProtocol());
        // 非流式：阻塞等待上游结果（内部仍为非阻塞 WebClient）
        return adapter.chatCompletion(provider, request).block();
    }

    /**
     * 选择提供者 + 限流检查
     */
    private ModelProvider selectAndRateLimit(GatewayRequest request) {
        ModelProvider provider = providerService.selectProvider(request.getModel());
        int limit = provider.getRateLimitPerMinute() != null
                ? provider.getRateLimitPerMinute() : 60;
        rateLimitService.checkAndConsume(request.getTenantId(), provider.getModelId(), limit);
        return provider;
    }

    /**
     * 构造 SSE 流式响应
     * SseEmitter 自动添加 data: 前缀，输出即为 OpenAI 兼容格式
     */
    private SseEmitter doStream(ModelProvider provider, GatewayRequest request) {
        // 超时设为 5 分钟，覆盖长文本生成场景
        SseEmitter emitter = new SseEmitter(300_000L);
        ProtocolAdapter adapter = providerService.getAdapter(provider.getProtocol());

        Disposable subscription = adapter.chatCompletionStream(provider, request)
                .subscribe(
                        json -> SSE_EXECUTOR.execute(() -> {
                            try {
                                // SseEmitter 会自动加 "data:" 前缀
                                emitter.send(SseEmitter.event().data(json));
                            } catch (IOException e) {
                                log.warn("SSE 发送失败，客户端可能已断开: {}", e.getMessage());
                            }
                        }),
                        error -> {
                            log.error("网关流式输出异常: provider={}, model={}",
                                    provider.getName(), provider.getModelId(), error);
                            try {
                                emitter.send(SseEmitter.event().data(
                                        "{\"error\":{\"message\":\"上游服务异常\",\"type\":\"gateway_error\"}}"));
                                emitter.send(SseEmitter.event().data("[DONE]"));
                            } catch (IOException ignored) {
                            }
                            emitter.complete();
                        },
                        () -> SSE_EXECUTOR.execute(() -> {
                            try {
                                emitter.send(SseEmitter.event().data("[DONE]"));
                            } catch (IOException ignored) {
                            }
                            emitter.complete();
                        })
                );

        emitter.onTimeout(() -> {
            subscription.dispose();
            emitter.complete();
        });
        emitter.onError(e -> subscription.dispose());
        emitter.onCompletion(subscription::dispose);

        return emitter;
    }
}
