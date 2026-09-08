# 贡献指南

感谢你对 HermesChat 的关注！我们欢迎各种形式的贡献。

## 开发流程

1. **Fork** 本仓库
2. 创建你的功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交你的变更 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 **Pull Request** 到 `develop` 分支

## 分支策略

- `main` - 生产环境代码，保持稳定
- `develop` - 开发分支，日常合并到此
- `feature/*` - 功能分支
- `fix/*` - 修复分支
- `hotfix/*` - 紧急修复

## 提交规范

我们遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat:` 新功能
- `fix:` 修复 Bug
- `docs:` 文档变更
- `style:` 代码格式（不影响功能）
- `refactor:` 重构
- `perf:` 性能优化
- `test:` 测试相关
- `chore:` 构建过程或辅助工具变动

## 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint + Prettier 配置
- 所有公共 API 必须有 JSDoc 注释
- 关键逻辑需要单元测试

## 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 运行测试
pnpm --filter api test
pnpm --filter web test

# 类型检查
pnpm typecheck
```

## 报告问题

请使用 [Issue 模板](.github/ISSUE_TEMPLATE) 报告问题，并提供：
- 清晰的问题描述
- 复现步骤
- 环境信息
- 相关截图或日志
