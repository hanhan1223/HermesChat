package com.hermes.admin.gateway;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 网关统一响应 DTO
 * 对外固定为 OpenAI Chat Completions 兼容格式
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class GatewayResponse {

    /** 响应唯一标识 */
    private String id;

    /** 对象类型，固定 chat.completion */
    @Builder.Default
    private String object = "chat.completion";

    /** 创建时间戳（秒） */
    private Long created;

    /** 模型标识 */
    private String model;

    /** 选项列表 */
    private List<Choice> choices;

    /** Token 用量 */
    private Usage usage;

    /**
     * 单条候选结果
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Choice {

        private Integer index;

        private Message message;

        @JsonProperty("finish_reason")
        private String finishReason;
    }

    /**
     * 消息体
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Message {

        @Builder.Default
        private String role = "assistant";

        private String content;
    }

    /**
     * Token 用量统计
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Usage {

        @JsonProperty("prompt_tokens")
        private Integer promptTokens;

        @JsonProperty("completion_tokens")
        private Integer completionTokens;

        @JsonProperty("total_tokens")
        private Integer totalTokens;
    }
}
