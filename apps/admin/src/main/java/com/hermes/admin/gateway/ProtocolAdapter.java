package com.hermes.admin.gateway;

import com.hermes.admin.entity.ModelProvider;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/**
 * 协议适配器接口
 * 将网关统一请求格式转换为目标上游协议，并将响应回转为 OpenAI 兼容格式
 */
public interface ProtocolAdapter {

    /**
     * 协议标识，与 {@link ModelProvider#getProtocol()} 对应
     */
    String protocol();

    /**
     * 非流式对话补全
     *
     * @param provider 上游提供者配置
     * @param request  统一请求
     * @return OpenAI 兼容响应
     */
    Mono<GatewayResponse> chatCompletion(ModelProvider provider, GatewayRequest request);

    /**
     * 流式对话补全
     * 返回的每个元素为 OpenAI 兼容的 SSE data 行（不含 "data: " 前缀）
     *
     * @param provider 上游提供者配置
     * @param request  统一请求
     * @return SSE 数据流
     */
    Flux<String> chatCompletionStream(ModelProvider provider, GatewayRequest request);
}
