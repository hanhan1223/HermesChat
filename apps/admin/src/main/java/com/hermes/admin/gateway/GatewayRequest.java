package com.hermes.admin.gateway;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * 网关统一请求 DTO
 * 对外暴露 OpenAI Chat Completions 兼容格式，内部由各协议适配器转换
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class GatewayRequest {

    /** 目标模型标识（网关侧逻辑名称） */
    private String model;

    /** 对话消息列表 */
    private List<Message> messages;

    /** 是否流式返回 */
    private Boolean stream;

    /** 采样温度 0-2 */
    private Double temperature;

    /** 核采样 top_p */
    @JsonProperty("top_p")
    private Double topP;

    /** 最大生成 token 数 */
    @JsonProperty("max_tokens")
    private Integer maxTokens;

    /** 停止词 */
    @JsonProperty("stop")
    private List<String> stop;

    /** 频率惩罚 */
    @JsonProperty("frequency_penalty")
    private Double frequencyPenalty;

    /** 存在惩罚 */
    @JsonProperty("presence_penalty")
    private Double presencePenalty;

    /** 用户标识（用于审计 / 限流） */
    private String user;

    /** 租户标识（用于限流隔离） */
    @JsonProperty("tenant_id")
    private String tenantId;

    /** 扩展参数，透传给上游 */
    private Map<String, Object> extra;

    /**
     * 对话消息
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Message {

        /** 角色：system / user / assistant / tool */
        private String role;

        /** 文本内容 */
        private Object content;
    }
}
