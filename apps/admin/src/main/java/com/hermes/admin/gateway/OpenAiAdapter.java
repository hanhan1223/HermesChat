package com.hermes.admin.gateway;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hermes.admin.entity.ModelProvider;
import com.hermes.admin.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

/**
 * OpenAI Chat Completions 协议适配器
 * 上游：POST {base_url}/chat/completions，Bearer 认证，SSE data: {...}
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OpenAiAdapter implements ProtocolAdapter {

    private static final String PROTOCOL = "openai";

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Override
    public String protocol() {
        return PROTOCOL;
    }

    @Override
    public Mono<GatewayResponse> chatCompletion(ModelProvider provider, GatewayRequest request) {
        ObjectNode body = buildRequestBody(provider, request, false);
        String url = normalizeUrl(provider.getBaseUrl()) + "/chat/completions";

        return webClient.post()
                .uri(url)
                .header("Authorization", "Bearer " + provider.getApiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .flatMap(raw -> parseResponse(raw, provider))
                .doOnError(e -> log.error("OpenAI 非流式调用失败: provider={}, model={}",
                        provider.getName(), provider.getModelId(), e));
    }

    @Override
    public Flux<String> chatCompletionStream(ModelProvider provider, GatewayRequest request) {
        ObjectNode body = buildRequestBody(provider, request, true);
        String url = normalizeUrl(provider.getBaseUrl()) + "/chat/completions";

        // WebClient 的 SSE 解码器会自动提取 data 字段内容
        return webClient.post()
                .uri(url)
                .header("Authorization", "Bearer " + provider.getApiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.TEXT_EVENT_STREAM)
                .bodyValue(body)
                .retrieve()
                .bodyToFlux(String.class)
                .filter(data -> data != null && !data.isBlank() && !data.equals("[DONE]"))
                .doOnError(e -> log.error("OpenAI 流式调用失败: provider={}, model={}",
                        provider.getName(), provider.getModelId(), e));
    }

    /**
     * 构造 OpenAI 协议请求体
     */
    private ObjectNode buildRequestBody(ModelProvider provider, GatewayRequest request, boolean stream) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", provider.getModelId());
        body.put("stream", stream);

        if (request.getTemperature() != null) {
            body.put("temperature", request.getTemperature());
        }
        if (request.getTopP() != null) {
            body.put("top_p", request.getTopP());
        }
        if (request.getMaxTokens() != null) {
            body.put("max_tokens", request.getMaxTokens());
        }
        if (request.getStop() != null && !request.getStop().isEmpty()) {
            ArrayNode stopArr = body.putArray("stop");
            request.getStop().forEach(stopArr::add);
        }
        if (request.getFrequencyPenalty() != null) {
            body.put("frequency_penalty", request.getFrequencyPenalty());
        }
        if (request.getPresencePenalty() != null) {
            body.put("presence_penalty", request.getPresencePenalty());
        }
        if (request.getUser() != null) {
            body.put("user", request.getUser());
        }

        // 消息列表
        ArrayNode messages = body.putArray("messages");
        if (request.getMessages() != null) {
            for (GatewayRequest.Message msg : request.getMessages()) {
                ObjectNode msgNode = messages.addObject();
                msgNode.put("role", msg.getRole());
                if (msg.getContent() instanceof String s) {
                    msgNode.put("content", s);
                } else {
                    msgNode.set("content", objectMapper.valueToTree(msg.getContent()));
                }
            }
        }

        // 透传扩展参数
        if (request.getExtra() != null) {
            request.getExtra().forEach((k, v) -> body.set(k, objectMapper.valueToTree(v)));
        }
        return body;
    }

    /**
     * 解析 OpenAI 响应为统一格式（字段已兼容，直接反序列化）
     */
    private Mono<GatewayResponse> parseResponse(String raw, ModelProvider provider) {
        try {
            JsonNode root = objectMapper.readTree(raw);
            GatewayResponse response = GatewayResponse.builder()
                    .id(root.path("id").asText("chatcmpl-" + UUID.randomUUID()))
                    .object(root.path("object").asText("chat.completion"))
                    .created(root.path("created").asLong(System.currentTimeMillis() / 1000))
                    .model(root.path("model").asText(provider.getModelId()))
                    .build();

            // choices
            JsonNode choicesNode = root.path("choices");
            if (choicesNode.isArray()) {
                var choices = new java.util.ArrayList<GatewayResponse.Choice>();
                for (JsonNode c : choicesNode) {
                    JsonNode msgNode = c.path("message");
                    choices.add(GatewayResponse.Choice.builder()
                            .index(c.path("index").asInt(0))
                            .message(GatewayResponse.Message.builder()
                                    .role(msgNode.path("role").asText("assistant"))
                                    .content(msgNode.path("content").asText(""))
                                    .build())
                            .finishReason(c.path("finish_reason").asText(null))
                            .build());
                }
                response.setChoices(choices);
            }

            // usage
            JsonNode usageNode = root.path("usage");
            if (usageNode != null && !usageNode.isMissingNode()) {
                response.setUsage(GatewayResponse.Usage.builder()
                        .promptTokens(usageNode.path("prompt_tokens").asInt(0))
                        .completionTokens(usageNode.path("completion_tokens").asInt(0))
                        .totalTokens(usageNode.path("total_tokens").asInt(0))
                        .build());
            }
            return Mono.just(response);
        } catch (Exception e) {
            return Mono.error(new BusinessException("OpenAI 响应解析失败: " + e.getMessage()));
        }
    }

    private String normalizeUrl(String baseUrl) {
        return baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }
}
