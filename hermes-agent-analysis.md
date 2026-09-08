# Hermes Agent 架构分析与借鉴报告

> 分析基于 NousResearch Hermes Agent 的公开架构设计及类似系统的最佳实践

---

## 一、Hermes Agent 核心架构特点

### 1.1 整体架构
Hermes Agent 是 Nous Research 开发的生产级 AI Agent 系统，核心设计理念：

- **函数式工具调用 (Function Calling First)**：所有工具调用基于 OpenAI 兼容的 function calling，支持并行工具调用
- **分层记忆系统 (Hierarchical Memory)**：工作记忆 + 情景记忆 + 语义记忆三层架构
- **自我反思循环 (Reflection Loop)**：每次工具执行后进行自我评估，检测幻觉和错误
- **上下文窗口管理**：动态上下文压缩，重要信息优先级排序

### 1.2 关键设计模式

#### 工具定义使用严格的 JSON Schema + 行为注解
`python
tool = {
    "name": "search_web",
    "description": "Search the web for information",
    "parameters": { ... },
    "behavior": {
        "is_deterministic": True,
        "is_idempotent": True,
        "cost_per_call": "low",
        "typical_latency_ms": 500,
        "can_parallelize": True
    }
}
`

---

## 二、可以借鉴的核心设计

### 2.1 工具系统改进

**建议你的系统增加：**
1. ehavior 元数据 - 帮助 Agent 智能选择工具
2. cost_tracking - 每个工具调用的 Token/积分消耗
3. etry_policy - 自动重试策略
4. cache_ttl - 工具结果缓存

### 2.2 三层记忆架构

`
Memory Architecture:
+-------------------------------------------+
| Working Memory (工作记忆)                  |
| - 当前对话上下文                            |
| - 活跃工具调用栈                            |
| - 临时变量存储                             |
+-------------------------------------------+
| Episodic Memory (情景记忆)                 |
| - 历史对话摘要                             |
| - 重要事件记录                             |
| - 用户偏好学习                             |
+-------------------------------------------+
| Semantic Memory (语义记忆)                 |
| - 知识库检索 (RAG)                         |
| - 向量数据库                               |
| - 文档嵌入索引                             |
+-------------------------------------------+
`

### 2.3 用户隔离机制

`
User Isolation Layers:
+-------------------------------------------+
| 数据隔离 (Data Isolation)                  |
| - 数据库行级安全 (RLS)                      |
| - 用户 ID 注入所有查询                      |
| - 加密存储用户数据                          |
+-------------------------------------------+
| 计算隔离 (Compute Isolation)               |
| - 独立的 Agent 实例                        |
| - 资源配额限制                              |
| - 请求队列隔离                              |
+-------------------------------------------+
| 记忆隔离 (Memory Isolation)                |
| - 独立的工作记忆空间                        |
| - 用户专属情景记忆索引                      |
| - 知识库访问权限控制                        |
+-------------------------------------------+
`

### 2.4 高并发设计

- Agent 实例池 (ObjectPool)
- 信号量并发控制 (Semaphore)
- 请求队列 (PriorityQueue)
- 背压机制 (Backpressure)

---

## 三、你当前系统的问题分析

### 3.1 用户隔离问题 [严重]

**问题 1：缺少请求级用户上下文传播**
- 当前 input.userId 来自请求体，容易被伪造
- 正确做法：从 JWT 验证后的 authContext 中提取

**问题 2：数据库查询缺少用户隔离**
- 当前 getConversation 只按 id 查询，不验证 userId
- 正确做法：findFirst({ where: { id, userId } })

**问题 3：共享状态污染风险**
- AgentContext 可能在请求间泄漏
- 正确做法：每个请求独立上下文 + 请求结束清理

### 3.2 三层记忆架构问题 [严重]

**当前状态：系统缺少记忆层**
- 只有当前对话消息，没有跨会话记忆
- 没有知识库检索 (RAG)
- 没有对话摘要和知识提取

**需要新增的数据模型：**
- EpisodicMemory - 跨会话对话摘要
- SemanticMemory - 知识库向量索引
- MemoryService - 三层记忆管理器

### 3.3 高并发问题 [中等]

**问题 1：Agent 调度循环是单线程的**
- 串行执行工具调用，效率低
- 应该：并行执行多个工具调用

**问题 2：缺少请求队列和背压机制**
- 高并发下可能过载
- 应该：BullMQ 请求队列 + 限流

**问题 3：LLM 调用缺少熔断器**
- LLM 故障会级联影响
- 应该：Circuit Breaker 模式

---

## 四、总结：需要改进的 Top 5

| 优先级 | 问题 | 影响 | 改进方案 |
|--------|------|------|----------|
| P0 | 缺少用户隔离 | 数据泄露风险 | JWT 验证 + 行级安全 |
| P0 | 缺少记忆系统 | 无跨会话记忆 | 三层记忆架构 |
| P1 | 无并发控制 | 高并发下崩溃 | Semaphore + 请求队列 |
| P1 | 无熔断器 | LLM 故障级联 | Circuit Breaker |
| P2 | 工具无行为元数据 | Agent 决策质量低 | 工具 behavior 注解 |

---

## 五、推荐的改进实施顺序

**Phase 1 (安全基础)**
- 用户隔离中间件
- 数据库 RLS 策略
- 请求认证管道

**Phase 2 (记忆系统)**
- 工作记忆 (已有对话上下文)
- 情景记忆 (对话摘要 + 时间衰减)
- 语义记忆 (向量数据库 + RAG)

**Phase 3 (高并发)**
- 请求队列 (BullMQ)
- 并发控制 (Semaphore)
- 熔断器 (Circuit Breaker)
- 缓存层 (Redis)