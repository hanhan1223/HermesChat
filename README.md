<div align="center">

# HermesChat

**企业级 AI Agent 平台**

对话 · Agent 调度 · 知识库 RAG · 管理后台 · 订阅计费

PC / 移动端自适应 · Monorepo 三端一体 · 开箱可跑

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3-6DB33F?style=flat-square&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Java](https://img.shields.io/badge/Java-21-ED8B00?style=flat-square&logo=openjdk&logoColor=white)](https://openjdk.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](#license)

[概览](#概览) | [核心能力](#核心能力) | [技术架构](#技术架构) | [项目结构](#项目结构) | [快速开始](#快速开始) | [Agent 调度](#agent-调度循环)

</div>

---

## 目录

- [概览](#概览)
- [核心能力](#核心能力)
- [技术架构](#技术架构)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [Agent 调度循环](#agent-调度循环)
- [知识库与引用](#知识库与引用)
- [服务与端口](#服务与端口)
- [安全](#安全)
- [License](#license)

---

## 概览

HermesChat 是一套对标企业级产品的 AI Agent 平台，采用 **Monorepo + 三端分离**：

| 端 | 目录 | 技术 | 职责 |
| --- | --- | --- | --- |
| 用户前端 | `apps/web` | Next.js 15 · React 19 | 对话、知识库、分享、主题 |
| Harness 服务 | `apps/api` | NestJS 10 · Prisma | Agent 调度、模型路由、实时通信 |
| 管理后台 | `apps/admin` | Spring Boot 3.3 · Java 21 | 成员 / 额度 / 模型池 / 协议网关 |

三端共享 **PostgreSQL 16**，缓存与队列走 **Redis 7**，对象存储走 **MinIO**；知识检索由 **RAGFlow** 承担。

---

## 核心能力

### 用户侧

| 能力 | 说明 |
| --- | --- |
| **多轮对话** | 流式输出，实时展示思考链与工具调用过程 |
| **多模态输入** | 文本 / 图片 / 文件 |
| **知识库 RAG** | 对接 RAGFlow，文档解析、分块、混合检索 |
| **引用溯源** | 回答中的 `[N]` 上标可回溯原文片段 |
| **侧边预览** | 来源 / 代码 / 图片三态预览面板 |
| **会话云盘** | 按会话隔离的文件管理，上传 / 预览 / 下载 |
| **HTML 预览** | 消息中 HTML 代码块自动渲染为沙箱 iframe |
| **Mermaid 图表** | Mermaid 代码自动渲染为 SVG，支持导出 |
| **对话导出** | Markdown · JSON · PDF（浏览器打印） |
| **输入引导** | `/` 命令 · `@` 知识库 · 历史匹配 · 键盘导航 |
| **流式引导** | AI 回复中可随时输入，消息注入正在运行的 Agent |
| **全文搜索** | PostgreSQL FTS + GIN 索引，`⌘K` 唤起 |
| **分享链接** | 一键生成只读分享页 |
| **访客模式** | 免登录额度试用 |
| **浅色 / 深色主题** | 全局切换，状态持久化 |

### 管理侧

| 能力 | 说明 |
| --- | --- |
| **成员与 RBAC** | 角色权限、账号生命周期 |
| **Token 用量** | 消耗统计与趋势 |
| **积分与订阅** | 赠送 / 扣减 / 套餐 / 到期 |
| **模型池** | 多 Provider 配置与切换 |
| **协议网关** | OpenAI · Anthropic · Gemini 适配器统一接入 |
| **限流** | 网关级速率控制 |
| **MCP / Skill 管理** | 自定义工具与可复用技能 |

### 平台侧

| 能力 | 说明 |
| --- | --- |
| **增强 Agent Harness** | 用户隔离 · 三层记忆 · 并行工具 · 熔断 |
| **子代理委派** | 复杂任务并行拆解，隔离执行，结果汇总 |
| **Agent 引导** | 流式输出中用户输入实时注入 Agent 上下文 |
| **模型路由** | 按能力 / 成本 / 可用性选择 Provider |
| **Prompt 缓存** | 降低重复前缀的推理成本 |
| **插件系统** | 目录扫描 · chokidar 热重载 · 管理 API |
| **文件存储** | MinIO 会话级隔离，预签名 URL，系统生成文件 |
| **任务队列** | BullMQ 异步任务 |
| **实时通道** | Socket.IO 双向通信 |
| **短链服务** | 分享与跳转 |

---

## 技术架构

```
                           ┌─────────────────────────────────────┐
                           │            Nginx  (80/443)          │
                           │     SSL · 反向代理 · 负载均衡         │
                           └──────────┬──────────┬───────────────┘
                                      │          │
              ┌───────────────────────┘          └───────────────────────┐
              ▼                                                          ▼
   ┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
   │      /  前端         │    │    /api/  Harness    │    │   /admin/  管理后台   │
   │                     │    │                     │    │                     │
   │   Next.js 15        │    │   NestJS 10         │    │   Spring Boot 3.3   │
   │   React 19          │    │   Prisma ORM        │    │   Spring Data JPA   │
   │   TailwindCSS       │    │   Socket.IO         │    │   Spring Security   │
   │   shadcn / ui        │    │   BullMQ            │    │   JWT + RBAC        │
   │   Zustand           │    │   Agent Harness     │    │   模型协议网关        │
   └──────────┬──────────┘    └──────────┬──────────┘    └──────────┬──────────┘
              │                          │                          │
              └──────────────────────────┼──────────────────────────┘
                                         ▼
                           ┌─────────────────────────────────────┐
                           │         PostgreSQL 16  共享          │
                           └──────────────────┬──────────────────┘
                                              │
          ┌───────────────────────┬───────────┴───────────┬───────────────────────┐
          ▼                       ▼                       ▼                       ▼
 ┌─────────────────┐   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
 │    Redis 7      │   │   MinIO (S3)     │   │     RAGFlow      │   │   外部 LLM API    │
 │ 缓存 · 队列 · 会话 │   │  文件 · 图片存储   │   │  知识库检索引擎    │   │ OpenAI / Claude…  │
 └─────────────────┘   └──────────────────┘   └──────────────────┘   └──────────────────┘
```

数据流简述：

1. 前端经 Nginx 访问 `/`、`/api/`、`/admin/`
2. Harness 负责鉴权、Agent 循环、工具执行与流式回推
3. 知识库查询走 RAGFlow，结果由 SourceTracker 编号后注入上下文
4. 管理后台可经协议网关统一代理多家模型 Provider

---

## 项目结构

```
HermesChat/
├── apps/
│   ├── web/                        # Next.js 15 用户前端
│   │   └── src/
│   │       ├── app/                # App Router 页面
│   │       ├── components/
│   │       │   ├── chat/           # 对话 · 引用 · 预览 · 导出
│   │       │   ├── theme/          # 主题切换
│   │       │   └── admin/          # 前端内嵌管理视图
│   │       ├── stores/             # Zustand
│   │       └── lib/                # API client · export · utils
│   │
│   ├── api/                        # NestJS Harness 服务
│   │   └── src/
│   │       ├── agent/              # 调度循环 · 模型路由 · 熔断 · 溯源 · 子代理 · 引导
│   │       ├── knowledge/          # RAGFlow 客户端与知识库业务
│   │       ├── conversations/      # 会话 · 消息 · 全文搜索
│   │       ├── auth/               # JWT 认证
│   │       ├── memory/             # 三层记忆
│   │       ├── models/             # 模型配置
│   │       ├── mcp/ · skills/      # 工具与技能
│   │       ├── plugins/            # 插件系统（热重载）
│   │       ├── storage/            # 文件存储（会话隔离 + MinIO）
│   │       ├── prompt-cache/ · cache/
│   │       ├── credits/ · tokens/  # 额度与用量
│   │       └── realtime/ · queue/  # 实时与队列
│   │   └── plugins/                # 插件目录（hello-world 示例）
│   │
│   └── admin/                      # Spring Boot 管理后台
│       └── src/main/java/com/hermes/admin/
│           ├── controller/ · service/
│           ├── entity/ · repository/
│           ├── gateway/            # OpenAI / Anthropic / Gemini 适配
│           └── security/           # JWT + RBAC
│
├── packages/
│   ├── agent-sdk/                  # Agent 侧 SDK
│   ├── shared-types/               # 前后端共享类型
│   └── ui/                         # 共享 UI 组件
│
├── infra/
│   ├── nginx/                      # 反向代理配置
│   └── postgres/                   # 初始化脚本
│
├── scripts/                        # 本地脚本
├── docker-compose.yml              # 服务编排
└── turbo.json                      # Turborepo
```

---

## 快速开始

### 前置要求

| 工具 | 版本 | 用途 |
| --- | --- | --- |
| Node.js | ≥ 20 | 前端 & Harness |
| pnpm | 9+ | Monorepo |
| Java | 21 | 管理后台 |
| Maven | 3.9+ | 管理后台构建 |
| Docker Compose | 最新 | 基础设施 |

### 1. 启动基础设施

```bash
docker compose up -d postgres redis minio
```

### 2. 初始化数据库

```bash
cd apps/api
cp .env.example .env
pnpm install
pnpm db:migrate
```

### 3. 启动 Harness（NestJS）

```bash
pnpm --filter api dev
# → http://localhost:4000/api
```

### 4. 启动前端（Next.js）

```bash
pnpm --filter web dev
# → http://localhost:3000
```

### 5. 启动管理后台（Spring Boot）

```bash
cd apps/admin
mvn spring-boot:run
# → http://localhost:8080/admin
```

### 可选：启用 RAGFlow

```bash
# 需先准备好 ES / MySQL / MinIO，并配置 RAGFLOW_* 环境变量
docker compose --profile ragflow up -d ragflow
```

在 `apps/api/.env` 中设置：

```env
RAGFLOW_API_URL=http://localhost:9380
RAGFLOW_API_KEY=your-ragflow-api-key
```

### 一键 Docker 启动

```bash
docker compose up -d
# 前端:     http://localhost
# Harness:  http://localhost/api
# 管理后台:  http://localhost/admin
```

### 初始化管理员

`infra/postgres/init.sql` 会写入超级管理员邮箱 `admin@hermes.chat`，但 **`password_hash` 为空**，无法直接登录。首次使用前请任选其一：

1. **注册新账号**：访问 `http://localhost:3000/register`
2. **为管理员设置密码**：用 BCrypt 生成哈希后写入数据库

```bash
# 示例：用 Node 生成 BCrypt 哈希（密码 admin123）
node -e "console.log(require('bcryptjs').hashSync('admin123', 10))"
```

```sql
UPDATE users
SET password_hash = '<上面生成的哈希>'
WHERE email = 'admin@hermes.chat';
```

同文件还会预置订阅套餐（free / pro / enterprise）与示例模型配置；模型的 API Key 需在管理后台填写后才会启用。

> 生产环境务必修改默认密码与所有密钥。

---

## Agent 调度循环

Harness 核心是自研的 **Planner → Executor → Verifier** 循环：

```
        ┌──────────┐        ┌──────────┐        ┌──────────┐
        │ Planner  │───────▶│ Executor │───────▶│ Verifier │
        │          │        │          │        │          │
        │ 分析状态   │        │ 执行工具   │        │ 校验结果   │
        │ 决策下一步  │        │ 收集输出   │        │ 判断重试   │
        └────┬─────┘        └──────────┘        └────┬─────┘
             │                                       │
             └─────────────────┬─────────────────────┘
                               ▼
                    循环直到完成 / 达到最大步数
```

增强版 Harness 额外提供：

| 特性 | 说明 |
| --- | --- |
| **用户隔离** | 用户 ID 只从 JWT 提取，不信任请求体 |
| **三层记忆** | Working · Episodic · Semantic 融合 |
| **并行工具 + 熔断** | 统一 CircuitBreakerRegistry，故障自动降级 |
| **子代理委派** | `delegate` 工具并行拆解子任务，隔离上下文执行 |
| **流式引导** | 用户在回复中发送的消息实时注入 Agent 上下文 |
| **上下文压缩** | 动态管理窗口，避免超长上下文 |
| **取消中断** | AbortSignal 可随时终止循环 |
| **引用索引** | 工具结果自动注册为 `doc_x`，回复中输出 `[[ID: doc_x]]` |

**已支持 Provider：** OpenAI · Anthropic · Google Gemini · OpenAI 兼容本地模型

---

## 知识库与引用

```
  文档上传 ──▶ RAGFlow 解析 / 分块 / 向量化
                      │
                      ▼
              混合检索 Top-K
                      │
                      ▼
            SourceTracker.registerBatch()
                      │
                      ▼
         注入 Prompt，模型输出 [[ID: doc_1]]
                      │
                      ▼
     stream-end 下发 source_id_to_number 映射
                      │
                      ▼
   前端 CitationText 渲染 [1] 上标 · SourcePanel 展开原文
```

前端配套组件：

| 组件 | 作用 |
| --- | --- |
| `CitationText` | 将引用标记渲染为可点击上标 |
| `SourcePanel` | 侧栏列出全部来源与片段 |
| `PreviewPanel` | 来源 / 代码 / 图片预览 |
| `export.ts` | 导出时保留引用编号 |

---

## 服务与端口

| 服务 | 默认端口 | 说明 |
| --- | --- | --- |
| Web | 3000 | Next.js 前端 |
| Harness API | 4000 | NestJS，前缀 `/api` |
| Admin | 8080 | Spring Boot，context-path `/admin` |
| RAGFlow | 9380 | 知识库引擎（profile `ragflow`） |
| PostgreSQL | 5432 | 主库 |
| Redis | 6379 | 缓存 / 队列 |
| MinIO | 9000 / 9001 | 对象存储 / 控制台 |
| Nginx | 80 / 443 | 统一入口 |

根目录常用脚本：

```bash
pnpm dev          # turbo 并行启动各应用
pnpm build        # 全量构建
pnpm typecheck    # 类型检查
pnpm db:migrate   # 执行 Prisma 迁移
pnpm db:studio    # 打开 Prisma Studio
```

---

## 安全

- JWT 认证，Harness 与 Admin 独立密钥
- Spring Security + RBAC
- API 限流（Nest Throttler / 网关 RateLimit）
- 密码 BCrypt 加密
- Prisma 参数化查询，防 SQL 注入
- 前端输出转义，防 XSS
- CORS 白名单可配置

---

## License

MIT © 2026 HermesChat
