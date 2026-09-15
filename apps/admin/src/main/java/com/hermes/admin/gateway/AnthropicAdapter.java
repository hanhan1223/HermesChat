package com.hermes.admin.gateway;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hermes.admin.entity.ModelProvider;
import com.hermes.admin.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.UUID;

/**
 * Anthropic Messages 协议适配器
 * 上游：POST {base_url}/v1/messages，x-api-key 认证
 * SSE 事件：event: content_block_delta / message_delta
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AnthropicAdapter implements ProtocolAdapter {

    private static final String PROTOCOL = "anthropic";
    private static final String ANTHROPIC_VERSION = "2023-06-01";

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Override
    public String protocol() {
        return PROTOCOL;
    }

    @Override
    public Mono<GatewayResponse> chatCompletion(ModelProvider provider, GatewayRequest request) {
        ObjectNode body = buildRequestBody(provider, request, false);
        String url = normalizeUrl(provider.getBaseUrl()) + "/v1/messages";

        return webClient.post()
                .uri(url)
                .header("x-api-key", provider.getApiKey())
                .header("anthropic-version", ANTHROPIC_VERSION)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .flatMap(raw -> parseResponse(raw, provider))
                .doOnError(e -> log.error("Anthropic 非流式调用失败: provider={}, model={}",
                        provider.getName(), provider.getModelId(), e));
    }

    @Override
    public Flux<String> chatCompletionStream(ModelProvider provider, GatewayRequest request) {
        ObjectNode body = buildRequestBody(provider, request, true);
        String url = normalizeUrl(provider.getBaseUrl()) + "/v1/messages";

        // 使用 ServerSentEvent 解码以获取 event 类型（content_block_delta 等）
        return webClient.post()
                .uri(url)
                .header("x-api-key", provider.getApiKey())
                .header("anthropic-version", ANTHROPIC_VERSION)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.TEXT_EVENT_STREAM)
                .bodyValue(body)
                .retrieve()
                .bodyToFlux(new ParameterizedTypeReference<ServerSentEvent<String>>() {})
                .concatMap(sse -> transformSseEvent(sse.event(), sse.data()))
                .doOnError(e -> log.error("Anthropic 流式调用失败: provider={}, model={}",
                        provider.getName(), provider.getModelId(), e));
    }

    /**
     * 将 Anthropic SSE 事件转换为 OpenAI 兼容 data 行
     */
    private Flux<String> transformSseEvent(String eventType, String dataJson) {
        if (dataJson == null || dataJson.isEmpty()) {
            return Flux.empty();
        }

        try {
            // content_block_delta: 提取增量文本
            if ("content_block_delta".equals(eventType)) {
                JsonNode root = objectMapper.readTree(dataJson);
                String text = root.path("delta").path("text").asText("");
                if (text.isEmpty()) {
                    return Flux.empty();
                }
                return Flux.just(buildOpenAiDelta(text, null));
            }

            // message_delta: 携带 finish_reason / usage
            if ("message_delta".equals(eventType)) {
                JsonNode root = objectMapper.readTree(dataJson);
                String finishReason = mapStopReason(root.path("delta").path("stop_reason").asText(null));
                return Flux.just(buildOpenAiDelta("", finishReason));
            }

            // message_stop: 结束信号由网关 Controller 统一发送 [DONE]，此处忽略
            if ("message_stop".equals(eventType)) {
                return Flux.empty();
            }

            return Flux.empty();
        } catch (Exception e) {
            log.warn("Anthropic SSE 块解析失败: {}", e.getMessage());
            return Flux.empty();
        }
    }

    /**
     * 构造 OpenAI 兼容的流式 delta JSON
     */
    private String buildOpenAiDelta(String content, String finishReason) {
        try {
            ObjectNode chunk = objectMapper.createObjectNode();
            chunk.put("id", "chatcmpl-" + UUID.randomUUID());
            chunk.put("object", "chat.completion.chunk");
            chunk.put("created", System.currentTimeMillis() / 1000);
            chunk.put("model", "anthropic");

            ArrayNode choices = chunk.putArray("choices");
            ObjectNode choice = choices.addObject();
            choice.put("index", 0);
            ObjectNode delta = choice.putObject("delta");
            if (content != null && !content.isEmpty()) {
                delta.put("content", content);
            }
            if (finishReason != null) {
                choice.put("finish_reason", finishReason);
            } else {
                choice.putNull("finish_reason");
            }
            return objectMapper.writeValueAsString(chunk);
        } catch (Exception e) {
            return "{}";
        }
    }

    /**
     * 构造 Anthropic Messages 协议请求体
     */
    private ObjectNode buildRequestBody(ModelProvider provider, GatewayRequest request, boolean stream) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", provider.getModelId());
        body.put("stream", stream);

        // max_tokens 必填
        body.put("max_tokens", request.getMaxTokens() != null ? request.getMaxTokens() : 4096);

        if (request.getTemperature() != null) {
            body.put("temperature", request.getTemperature());
        }
        if (request.getTopP() != null) {
            body.put("top_p", request.getTopP());
        }
        if (request.getStop() != null && !request.getStop().isEmpty()) {
            ArrayNode stopArr = body.putArray("stop_sequences");
            request.getStop().forEach(stopArr::add);
        }

        // 拆分 system 与 messages
        StringBuilder systemPrompt = new StringBuilder();
        ArrayNode messages = body.putArray("messages");
        if (request.getMessages() != null) {
            for (GatewayRequest.Message msg : request.getMessages()) {
                if ("system".equalsIgnoreCase(msg.getRole())) {
                    if (systemPrompt.length() > 0) systemPrompt.append("\n");
                    systemPrompt.append(stringifyContent(msg.getContent()));
                } else {
                    ObjectNode msgNode = messages.addObject();
                    msgNode.put("role", msg.getRole());
                    msgNode.put("content", stringifyContent(msg.getContent()));
                }
            }
        }
        if (systemPrompt.length() > 0) {
            body.put("system", systemPrompt.toString());
        }

        // 透传扩展参数
        if (request.getExtra() != null) {
            request.getExtra().forEach((k, v) -> body.set(k, objectMapper.valueToTree(v)));
        }
        return body;
    }

    /**
     * 解析 Anthropic 非流式响应为统一格式
     */
    private Mono<GatewayResponse> parseResponse(String raw, ModelProvider provider) {
        try {
            JsonNode root = objectMapper.readTree(raw);

            // 提取 content 文本
            StringBuilder content = new StringBuilder();
            JsonNode contentArr = root.path("content");
            if (contentArr.isArray()) {
                for (JsonNode block : contentArr) {
                    if ("text".equals(block.path("type").asText())) {
                        content.append(block.path("text").asText(""));
                    }
                }
            }

            String finishReason = mapStopReason(root.path("stop_reason").asText(null));

            GatewayResponse response = GatewayResponse.builder()
                    .id(root.path("id").asText("chatcmpl-" + UUID.randomUUID()))
                    .object("chat.completion")
                    .created(System.currentTimeMillis() / 1000)
                    .model(root.path("model").asText(provider.getModelId()))
                    .choices(List.of(GatewayResponse.Choice.builder()
                            .index(0)
                            .message(GatewayResponse.Message.builder()
                                    .role("assistant")
                                    .content(content.toString())
                                    .build())
                            .finishReason(finishReason)
                            .build()))
                    .build();

            // usage
            JsonNode usageNode = root.path("usage");
            if (usageNode != null && !usageNode.isMissingNode()) {
                int promptTokens = usageNode.path("input_tokens").asInt(0);
                int completionTokens = usageNode.path("output_tokens").asInt(0);
                response.setUsage(GatewayResponse.Usage.builder()
                        .promptTokens(promptTokens)
                        .completionTokens(completionTokens)
                        .totalTokens(promptTokens + completionTokens)
                        .build());
            }
            return Mono.just(response);
        } catch (Exception e) {
            return Mono.error(new BusinessException("Anthropic 响应解析失败: " + e.getMessage()));
        }
    }

    /**
     * Anthropic stop_reason → OpenAI finish_reason
     */
    private String mapStopReason(String stopReason) {
        if (stopReason == null) return null;
        return switch (stopReason) {
            case "end_turn", "stop_sequence" -> "stop";
            case "max_tokens" -> "length";
            case "tool_use" -> "tool_calls";
            default -> stopReason;
        };
    }

    private String stringifyContent(Object content) {
        if (content == null) return "";
        if (content instanceof String s) return s;
        try {
            return objectMapper.writeValueAsString(content);
        } catch (Exception e) {
            return String.valueOf(content);
        }
    }

    private String normalizeUrl(String baseUrl) {
        return baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }
}
