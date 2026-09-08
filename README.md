# HermesChat — 企业级 AI Agent 平台

对标 Hermes 的网页端 AI Agent 平台，支持 PC 与移动端，配套完整管理后台。

## 🏗️ 架构概览

`
┌─────────────────────────────────────────────────────────────────┐
│                         Nginx (80/443)                          │
├────────────────┬────────────────────┬───────────────────────────┤
│  / (前端)       │  /api/ (Harness)   │  /admin/ (管理后台)        │
│  Next.js 15    │  NestJS            │  Spring Boot 3             │
│  React 19      │  Harness 服务       │  管理后台服务               │
│  TailwindCSS   │  Agent 调度循环     │  用户/订阅/积分/模型池      │
├────────────────┴────────────────────┴───────────────────────────┤
│                    PostgreSQL 16 (共享数据库)                     │
├─────────────────────────────────┬───────────────────────────────┤
│        Redis 7                  │         MinIO (S3)            │
│  缓存 / 队列 / Session           │       文件 / 图片存储          │
└─────────────────────────────────┴───────────────────────────────┘
`

## 📁 项目结构

`
HermesChat/                     # Monorepo (Harness + 前端)
├── apps/
│   ├── web/                    # Next.js 15 前端
│   └── api/                    # NestJS Harness 服务
├── packages/
│   ├── shared-types/           # 前后端共享类型
│   └── ui/                     # 共享 UI 组件
├── infra/                      # 基础设施配置
│   ├── nginx/                  # Nginx 配置
│   └── postgres/               # 数据库初始化脚本
└── docker-compose.yml          # Harness 服务编排

hermes-admin/                   # 独立项目 (Spring Boot 管理后台)
├── src/main/java/com/hermes/admin/
│   ├── controller/             # REST API
│   ├── service/                # 业务逻辑
│   ├── repository/             # 数据访问
│   ├── entity/                 # 数据库实体
│   ├── dto/                    # 数据传输对象
│   └── security/               # JWT 安全
└── Dockerfile
`

## 🚀 快速开始

### 前置要求

- Docker & Docker Compose
- Node.js 20+
- pnpm 9+
- Java 21+ (管理后台)
- Maven 3.9+ (管理后台)

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
# 访问 http://localhost:4000/api
`

### 4. 启动前端 (Next.js)

`ash
pnpm --filter web dev
# 访问 http://localhost:3000
`

### 5. 启动管理后台 (Spring Boot)

`ash
cd hermes-admin
mvn spring-boot:run
# 访问 http://localhost:8080/admin
`

### 一键启动 (Docker)

`ash
docker-compose up -d
# 前端: http://localhost
# Harness API: http://localhost/api
# 管理后台: http://localhost/admin
`

## 🎯 核心功能

### 用户侧
- 🔐 JWT 认证（注册/登录）
- 💬 多模态对话（文本/图片/文件）
- 🧠 思考过程展示（流式）
- 🔧 工具执行可视化
- 📤 对话分享
- 🛠️ 自定义 MCP 工具
- 📦 自定义 Skill

### 管理后台
- 👥 成员权限管理 (RBAC)
- 📊 Token 消耗统计
- 💰 积分管控（赠送/调整/消费记录）
- 📋 订阅管理（套餐/续费/过期）
- 🎛️ 模型池维护
- 🏷️ 配额管理

## 🧠 Agent 调度循环 (Harness 核心)

自研轻量级调度，采用 **Planner → Executor → Verifier** 循环：

1. **Planner**: 调用 LLM 分析当前状态，决定下一步（回复/调用工具/结束）
2. **Executor**: 执行工具调用，收集结果
3. **Verifier**: 验证结果质量，决定是否需要重试
4. 循环直到任务完成或达到最大步数

支持的 Provider: OpenAI / Anthropic / Google / 本地模型（OpenAI 兼容）

## 🔒 安全特性

- JWT 认证 + RBAC 权限控制
- API 限流 (Throttler)
- CORS 配置
- 密码 BCrypt 加密
- SQL 注入防护 (Prisma 参数化查询)
- XSS 防护

## 📝 默认账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 超级管理员 | admin@hermes.chat | admin123 |

> ⚠️ 生产环境必须修改默认密码！

## 🛠️ 技术栈

### Harness 服务
- NestJS 10 + TypeScript
- Prisma ORM
- Socket.IO (WebSocket)
- BullMQ (Redis 队列)
- MinIO (S3 存储)

### 前端
- Next.js 15 (App Router)
- React 19 + TypeScript
- TailwindCSS + shadcn/ui
- Zustand (状态管理)
- Socket.IO Client

### 管理后台
- Spring Boot 3.3 + Java 21
- Spring Data JPA
- Spring Security + JWT
- PostgreSQL + Redis

## 📄 License

MIT