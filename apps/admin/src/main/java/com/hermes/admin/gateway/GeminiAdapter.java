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

import java.util.List;
import java.util.UUID;

/**
 * Google Gemini 协议适配器
 * 上游：POST {base_url}/v1beta/models/{model}:streamGenerateContent，?key=API_KEY
 * 非流式：{model}:generateContent
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GeminiAdapter implements ProtocolAdapter {

    private static final String PROTOCOL = "gemini";

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Override
    public String protocol() {
        return PROTOCOL;
    }

    @Override
    public Mono<GatewayResponse> chatCompletion(ModelProvider provider, GatewayRequest request) {
        ObjectNode body = buildRequestBody(provider, request);
        String url = normalizeUrl(provider.getBaseUrl())
                + "/v1beta/models/" + provider.getModelId() + ":generateContent?key=" + provider.getApiKey();

        return webClient.post()
                .uri(url)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .flatMap(raw -> parseResponse(raw, provider))
                .doOnError(e -> log.error("Gemini 非流式调用失败: provider={}, model={}",
                        provider.getName(), provider.getModelId(), e));
    }

    @Override
    public Flux<String> chatCompletionStream(ModelProvider provider, GatewayRequest request) {
        ObjectNode body = buildRequestBody(provider, request);
        String url = normalizeUrl(provider.getBaseUrl())
                + "/v1beta/models/" + provider.getModelId() + ":streamGenerateContent?alt=sse&key=" + provider.getApiKey();

        // WebClient SSE 解码器自动提取 data 字段
        return webClient.post()
                .uri(url)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.TEXT_EVENT_STREAM)
                .bodyValue(body)
                .retrieve()
                .bodyToFlux(String.class)
                .filter(data -> data != null && !data.isBlank())
                .concatMap(this::transformStreamChunk)
                .doOnError(e -> log.error("Gemini 流式调用失败: provider={}, model={}",
                        provider.getName(), provider.getModelId(), e));
    }

    /**
     * 将 Gemini 流式 chunk 转换为 OpenAI 兼容 data 行
     */
    private Flux<String> transformStreamChunk(String dataJson) {
        try {
            JsonNode root = objectMapper.readTree(dataJson);
            StringBuilder text = new StringBuilder();
            JsonNode candidates = root.path("candidates");
            String finishReason = null;

            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode candidate = candidates.get(0);
                JsonNode parts = candidate.path("content").path("parts");
                if (parts.isArray()) {
                    for (JsonNode part : parts) {
                        text.append(part.path("text").asText(""));
                    }
                }
                finishReason = mapFinishReason(candidate.path("finishReason").asText(null));
            }

            if (text.length() == 0 && finishReason == null) {
                return Flux.empty();
            }
            return Flux.just(buildOpenAiDelta(text.toString(), finishReason));
        } catch (Exception e) {
            log.warn("Gemini 流式 chunk 解析失败: {}", e.getMessage());
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
            chunk.put("model", "gemini");

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
     * 构造 Gemini generateContent 请求体
     */
    private ObjectNode buildRequestBody(ModelProvider provider, GatewayRequest request) {
        ObjectNode body = objectMapper.createObjectNode();

        // contents
        ArrayNode contents = body.putArray("contents");
        StringBuilder systemText = new StringBuilder();

        if (request.getMessages() != null) {
            for (GatewayRequest.Message msg : request.getMessages()) {
                if ("system".equalsIgnoreCase(msg.getRole())) {
                    if (systemText.length() > 0) systemText.append("\n");
                    systemText.append(stringifyContent(msg.getContent()));
                } else {
                    ObjectNode content = contents.addObject();
                    // Gemini: user → user, assistant → model
                    content.put("role", "assistant".equalsIgnoreCase(msg.getRole()) ? "model" : "user");
                    ArrayNode parts = content.putArray("parts");
                    ObjectNode part = parts.addObject();
                    part.put("text", stringifyContent(msg.getContent()));
                }
            }
        }

        // systemInstruction
        if (systemText.length() > 0) {
            ObjectNode sysInst = body.putObject("systemInstruction");
            ArrayNode parts = sysInst.putArray("parts");
            parts.addObject().put("text", systemText.toString());
        }

        // generationConfig
        ObjectNode genConfig = body.putObject("generationConfig");
        if (request.getMaxTokens() != null) {
            genConfig.put("maxOutputTokens", request.getMaxTokens());
        }
        if (request.getTemperature() != null) {
            genConfig.put("temperature", request.getTemperature());
        }
        if (request.getTopP() != null) {
            genConfig.put("topP", request.getTopP());
        }
        if (request.getStop() != null && !request.getStop().isEmpty()) {
            ArrayNode stopSeqs = genConfig.putArray("stopSequences");
            request.getStop().forEach(stopSeqs::add);
        }

        // 透传扩展参数
        if (request.getExtra() != null) {
            request.getExtra().forEach((k, v) -> body.set(k, objectMapper.valueToTree(v)));
        }
        return body;
    }

    /**
     * 解析 Gemini 非流式响应为统一格式
     */
    private Mono<GatewayResponse> parseResponse(String raw, ModelProvider provider) {
        try {
            JsonNode root = objectMapper.readTree(raw);

            StringBuilder content = new StringBuilder();
            String finishReason = null;
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode candidate = candidates.get(0);
                JsonNode parts = candidate.path("content").path("parts");
                if (parts.isArray()) {
                    for (JsonNode part : parts) {
                        content.append(part.path("text").asText(""));
                    }
                }
                finishReason = mapFinishReason(candidate.path("finishReason").asText(null));
            }

            GatewayResponse response = GatewayResponse.builder()
                    .id("chatcmpl-" + UUID.randomUUID())
                    .object("chat.completion")
                    .created(System.currentTimeMillis() / 1000)
                    .model(provider.getModelId())
                    .choices(List.of(GatewayResponse.Choice.builder()
                            .index(0)
                            .message(GatewayResponse.Message.builder()
                                    .role("assistant")
                                    .content(content.toString())
                                    .build())
                            .finishReason(finishReason)
                            .build()))
                    .build();

            // usageMetadata
            JsonNode usageMeta = root.path("usageMetadata");
            if (usageMeta != null && !usageMeta.isMissingNode()) {
                int promptTokens = usageMeta.path("promptTokenCount").asInt(0);
                int completionTokens = usageMeta.path("candidatesTokenCount").asInt(0);
                response.setUsage(GatewayResponse.Usage.builder()
                        .promptTokens(promptTokens)
                        .completionTokens(completionTokens)
                        .totalTokens(usageMeta.path("totalTokenCount").asInt(promptTokens + completionTokens))
                        .build());
            }
            return Mono.just(response);
        } catch (Exception e) {
            return Mono.error(new BusinessException("Gemini 响应解析失败: " + e.getMessage()));
        }
    }

    /**
     * Gemini finishReason → OpenAI finish_reason
     */
    private String mapFinishReason(String finishReason) {
        if (finishReason == null || finishReason.isEmpty()) return null;
        return switch (finishReason) {
            case "STOP" -> "stop";
            case "MAX_TOKENS" -> "length";
            case "SAFETY", "RECITATION" -> "content_filter";
            default -> "stop";
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
