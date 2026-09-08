<div align="center">

<img src="https://img.shields.io/badge/HermesChat-Enterprise_AI_Agent-6366f1?style=for-the-badge&logo=openai&logoColor=white" alt="HermesChat">

### 企业级 AI Agent 平台 · 支持 PC & 移动端 · 配套完整管理后台

<p>
  <img src="https://img.shields.io/badge/Next.js_15-000000?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js 15">
  <img src="https://img.shields.io/badge/NestJS_10-E0234E?style=flat-square&logo=nestjs&logoColor=white" alt="NestJS 10">
  <img src="https://img.shields.io/badge/Spring_Boot_3-6DB33F?style=flat-square&logo=springboot&logoColor=white" alt="Spring Boot 3">
  <img src="https://img.shields.io/badge/PostgreSQL_16-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL 16">
  <img src="https://img.shields.io/badge/Redis_7-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis 7">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19">
</p>

**[快速开始](#-快速开始)** · **[核心功能](#-核心功能)** · **[技术架构](#-技术架构)** · **[在线演示](https://hermes.chat)**

</div>

---

## ✨ 概览

HermesChat 是一个对标 Hermes 的企业级 AI Agent 平台，采用 **Monorepo + 微服务** 架构，提供完整的 AI 对话、Agent 调度、用户管理与订阅计费能力。

> 前端与 Harness 服务统一在 Monorepo 中管理，管理后台为独立 Spring Boot 项目，三者共享 PostgreSQL 数据库。

---

## 🏗️ 技术架构

`
                          ┌─────────────────────────────────────┐
                          │          Nginx (80 / 443)           │
                          │        SSL · 反向代理 · 负载均衡      │
                          └──────────┬──────────┬───────────────┘
                                     │          │
              ┌──────────────────────┘          └──────────────────────┐
              ▼                                                         ▼
   ┌────────────────────┐     ┌────────────────────┐     ┌────────────────────┐
   │   / (前端)          │     │   /api/ (Harness)  │     │   /admin/ (管理后台) │
   │                    │     │                    │     │                    │
   │   Next.js 15       │     │   NestJS 10        │     │   Spring Boot 3.3  │
   │   React 19         │     │   Prisma ORM       │     │   Spring Data JPA  │
   │   TailwindCSS      │     │   Socket.IO        │     │   Spring Security  │
   │   shadcn/ui        │     │   BullMQ           │     │   JWT Auth         │
   │   Zustand          │     │   Agent 调度循环    │     │   RBAC 权限        │
   └────────────────────┘     └────────────────────┘     └────────────────────┘
              │                         │                          │
              └─────────────────────────┼──────────────────────────┘
                                        ▼
                          ┌─────────────────────────────────────┐
                          │         PostgreSQL 16 (共享)         │
                          └──────────────────┬──────────────────┘
                                             │
                          ┌──────────────────┴──────────────────┐
              ┌───────────┴───────────┐           ┌──────────────┴──────────────┐
              │       Redis 7         │           │        MinIO (S3)          │
              │  缓存 · 队列 · Session │           │      文件 · 图片存储        │
              └───────────────────────┘           └─────────────────────────────┘
`

---

## 📁 项目结构

`
HermesChat/                         # Monorepo (Harness + 前端)
├── apps/
│   ├── web/                        # Next.js 15 前端
│   │   ├── src/app/                # App Router 页面
│   │   ├── src/components/         # UI 组件
│   │   └── src/stores/             # Zustand 状态管理
│   └── api/                        # NestJS Harness 服务
│       ├── src/agent/              # Agent 调度循环
│       ├── src/auth/               # JWT 认证
│       └── src/chat/               # 对话管理
├── packages/
│   ├── shared-types/               # 前后端共享类型
│   └── ui/                         # 共享 UI 组件库
├── infra/
│   ├── nginx/                      # Nginx 配置
│   └── postgres/                   # 数据库初始化脚本
├── docker-compose.yml              # 服务编排
└── turbo.json                      # Turborepo 配置

hermes-admin/                       # 独立项目 (Spring Boot 管理后台)
├── src/main/java/com/hermes/admin/
│   ├── controller/                 # REST API
│   ├── service/                    # 业务逻辑
│   ├── repository/                 # 数据访问
│   ├── entity/                     # 数据库实体
│   ├── dto/                        # 数据传输对象
│   └── security/                   # JWT 安全
└── Dockerfile
`

---

## 🚀 快速开始

### 前置要求

| 工具 | 版本 | 用途 |
|------|------|------|
| Node.js | 20+ | 前端 & Harness |
| pnpm | 9+ | Monorepo 包管理 |
| Java | 21+ | 管理后台 |
| Maven | 3.9+ | 管理后台构建 |
| Docker & Docker Compose | 最新 | 基础设施 |

### 1. 启动基础设施

`ash
docker-compose up -d postgres redis minio
`

### 2. 初始化数据库

`ash
cd apps/api
cp .env.example .env
pnpm install
pnpm db:migrate
`

### 3. 启动 Harness 服务 (NestJS)

`ash
pnpm --filter api dev
# → http://localhost:4000/api
`

### 4. 启动前端 (Next.js)

`ash
pnpm --filter web dev
# → http://localhost:3000
`

### 5. 启动管理后台 (Spring Boot)

`ash
cd hermes-admin
mvn spring-boot:run
# → http://localhost:8080/admin
`

### 🐳 一键启动 (Docker)

`ash
docker-compose up -d
# 前端:      http://localhost
# Harness:   http://localhost/api
# 管理后台:   http://localhost/admin
`

---

## 🎯 核心功能

### 💬 用户侧

| 功能 | 描述 |
|------|------|
| 🔐 **JWT 认证** | 注册 / 登录 / Token 刷新 |
| 💬 **多模态对话** | 文本 / 图片 / 文件输入 |
| 🧠 **思考过程展示** | 流式输出，实时展示推理链 |
| 🔧 **工具执行可视化** | MCP 工具调用过程透明可见 |
| 📤 **对话分享** | 一键生成分享链接 |
| 🛠️ **自定义 MCP 工具** | 接入任意 MCP 协议工具 |
| 📦 **自定义 Skill** | 创建可复用的 Agent 技能 |

### 🎛️ 管理后台

| 功能 | 描述 |
|------|------|
| 👥 **成员权限管理** | RBAC 角色权限控制 |
| 📊 **Token 消耗统计** | 用量可视化与趋势分析 |
| 💰 **积分管控** | 赠送 / 调整 / 消费记录 |
| 📋 **订阅管理** | 套餐 / 续费 / 过期提醒 |
| 🎛️ **模型池维护** | 多模型配置与切换 |
| 🏷️ **配额管理** | 用户级速率与用量限制 |

---

## 🧠 Agent 调度循环 (Harness 核心)

自研轻量级调度引擎，采用 **Planner → Executor → Verifier** 循环：

`
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Planner │────▶│Executor │────▶│Verifier │
│         │     │         │     │         │
│ LLM 分析 │     │ 工具执行  │     │ 质量验证  │
│ 状态决策  │     │ 结果收集  │     │ 重试判断  │
└────┬────┘     └─────────┘     └────┬────┘
     │                               │
     └───────────────┬───────────────┘
                     ▼
              循环直到完成或达到最大步数
`

1. **Planner** — 调用 LLM 分析当前状态，决定下一步（回复 / 调用工具 / 结束）
2. **Executor** — 执行工具调用，收集结果
3. **Verifier** — 验证结果质量，决定是否需要重试
4. 循环直到任务完成或达到最大步数

**支持的 Provider:** OpenAI · Anthropic · Google · 本地模型（OpenAI 兼容）

---

## 🔒 安全特性

- **JWT 认证** + RBAC 权限控制
- **API 限流** (Throttler)
- **CORS** 跨域配置
- 密码 **BCrypt** 加密
- SQL 注入防护 (**Prisma** 参数化查询)
- **XSS** 防护

---

## 🛠️ 技术栈

### Harness 服务

| 技术 | 版本 | 用途 |
|------|------|------|
| NestJS | 10 | 后端框架 |
| Prisma | 最新 | ORM |
| Socket.IO | 最新 | WebSocket 实时通信 |
| BullMQ | 最新 | Redis 任务队列 |
| MinIO | 最新 | S3 文件存储 |

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 15 (App Router) | 全栈框架 |
| React | 19 | UI 框架 |
| TailwindCSS | 最新 | 原子化 CSS |
| shadcn/ui | 最新 | 组件库 |
| Zustand | 最新 | 状态管理 |
| Socket.IO Client | 最新 | 实时通信 |

### 管理后台

| 技术 | 版本 | 用途 |
|------|------|------|
| Spring Boot | 3.3 | 后端框架 |
| Java | 21 | 运行环境 |
| Spring Data JPA | 最新 | 数据访问 |
| Spring Security | 最新 | 安全认证 |
| PostgreSQL + Redis | — | 数据 & 缓存 |

---

## 📝 默认账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 超级管理员 | admin@hermes.chat | admin123 |

> ⚠️ 生产环境必须修改默认密码！

---

## 📄 License

[MIT](LICENSE) © 2026 HermesChat
