/**
 * Hello World 示例插件
 * 演示插件系统的基本用法
 */

let context = null;

/** 插件注册钩子（加载时调用） */
async function register(ctx) {
  context = ctx;
  ctx.logger.log('Hello World 插件已注册');
}

/** 插件卸载钩子（卸载时调用） */
async function unregister() {
  if (context) {
    context.logger.log('Hello World 插件已卸载');
  }
  context = null;
}

/** 工具执行入口 */
async function executeTool(toolName, args) {
  switch (toolName) {
    case 'greet': {
      const name = args.name || '世界';
      return `你好，${name}！欢迎使用 HermesChat 插件系统。`;
    }
    case 'current_time': {
      return {
        timestamp: new Date().toISOString(),
        formatted: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
        timezone: 'Asia/Shanghai',
      };
    }
    default:
      throw new Error(`未知工具: ${toolName}`);
  }
}

module.exports = { register, unregister, executeTool };
