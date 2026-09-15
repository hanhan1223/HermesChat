import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';

/**
 * 插件系统服务
 *
 * 支持从目录加载插件，热重载，插件市场注册。
 *
 * 插件结构:
 *   plugins/
 *     my-plugin/
 *       plugin.json     — 插件元数据
 *       index.js        — 插件入口（导出 register/unregister）
 *
 * plugin.json 格式:
 * {
 *   "name": "my-plugin",
 *   "version": "1.0.0",
 *   "description": "插件描述",
 *   "author": "作者",
 *   "tools": [...],        // 提供的工具定义
 *   "hooks": {...},        // 生命周期钩子
 *   "enabled": true
 * }
 *
 * 热重载: 监听插件目录变化，自动重新加载
 */
@Injectable()
export class PluginSystemService implements OnModuleInit {
  private readonly logger = new Logger(PluginSystemService.name);
  private readonly pluginsDir: string;
  private readonly plugins = new Map<string, LoadedPlugin>();
  private watcher: chokidar.FSWatcher | null = null;

  constructor(private readonly config: ConfigService) {
    this.pluginsDir = this.config.get('PLUGINS_DIR') || path.join(process.cwd(), 'plugins');
  }

  async onModuleInit() {
    await this.ensurePluginsDir();
    await this.loadAllPlugins();
    this.startHotReload();
    this.logger.log(`插件系统初始化完成: ${this.plugins.size} 个插件已加载`);
  }

  // ==================== 插件加载 ====================

  /**
   * 加载所有插件
   */
  async loadAllPlugins(): Promise<void> {
    const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pluginPath = path.join(this.pluginsDir, entry.name);
      const manifestPath = path.join(pluginPath, 'plugin.json');

      if (!fs.existsSync(manifestPath)) continue;

      try {
        await this.loadPlugin(pluginPath);
      } catch (error) {
        this.logger.error(`插件加载失败 [${entry.name}]: ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  /**
   * 加载单个插件
   */
  async loadPlugin(pluginPath: string): Promise<LoadedPlugin> {
    const manifestPath = path.join(pluginPath, 'plugin.json');
    const manifest: PluginManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    if (!manifest.name) {
      throw new Error('插件缺少 name 字段');
    }

    // 检查是否启用
    if (manifest.enabled === false) {
      this.logger.log(`插件已禁用，跳过: ${manifest.name}`);
      return { manifest, module: null, status: 'disabled', loadedAt: new Date() };
    }

    // 加载插件入口
    const entryPath = path.join(pluginPath, manifest.main || 'index.js');
    let module: PluginModule | null = null;

    if (fs.existsSync(entryPath)) {
      // 清除 require 缓存（支持热重载）
      delete require.cache[require.resolve(entryPath)];
      const loadedModule: PluginModule = require(entryPath);
      module = loadedModule;

      // 调用插件的 register 钩子
      if (typeof loadedModule.register === 'function') {
        await loadedModule.register(this.createPluginContext(manifest));
      }
    }

    const plugin: LoadedPlugin = {
      manifest,
      module,
      status: 'active',
      loadedAt: new Date(),
      path: pluginPath,
    };

    this.plugins.set(manifest.name, plugin);
    this.logger.log(`插件已加载: ${manifest.name} v${manifest.version}`);
    return plugin;
  }

  /**
   * 卸载插件
   */
  async unloadPlugin(name: string): Promise<boolean> {
    const plugin = this.plugins.get(name);
    if (!plugin) return false;

    try {
      if (plugin.module && typeof plugin.module.unregister === 'function') {
        await plugin.module.unregister();
      }
    } catch (error) {
      this.logger.warn(`插件卸载钩子失败 [${name}]: ${error instanceof Error ? error.message : error}`);
    }

    this.plugins.delete(name);
    this.logger.log(`插件已卸载: ${name}`);
    return true;
  }

  /**
   * 重新加载插件
   */
  async reloadPlugin(name: string): Promise<LoadedPlugin | null> {
    const plugin = this.plugins.get(name);
    if (!plugin || !plugin.path) return null;

    await this.unloadPlugin(name);
    return this.loadPlugin(plugin.path);
  }

  // ==================== 插件查询 ====================

  /**
   * 列出所有插件
   */
  listPlugins(): PluginInfo[] {
    return Array.from(this.plugins.values()).map((p) => ({
      name: p.manifest.name,
      version: p.manifest.version,
      description: p.manifest.description || '',
      author: p.manifest.author || '',
      status: p.status,
      tools: p.manifest.tools?.length || 0,
      loadedAt: p.loadedAt,
    }));
  }

  /**
   * 获取插件详情
   */
  getPlugin(name: string): LoadedPlugin | null {
    return this.plugins.get(name) || null;
  }

  /**
   * 获取所有插件提供的工具定义
   */
  getAllPluginTools(): PluginTool[] {
    const tools: PluginTool[] = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.status === 'active' && plugin.manifest.tools) {
        tools.push(...plugin.manifest.tools);
      }
    }
    return tools;
  }

  /**
   * 执行插件工具
   */
  async executePluginTool(pluginName: string, toolName: string, args: Record<string, unknown>): Promise<unknown> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin || plugin.status !== 'active') {
      throw new Error(`插件不可用: ${pluginName}`);
    }
    if (!plugin.module || typeof plugin.module.executeTool !== 'function') {
      throw new Error(`插件未实现 executeTool: ${pluginName}`);
    }
    return plugin.module.executeTool(toolName, args);
  }

  // ==================== 插件市场 ====================

  /**
   * 从市场安装插件（从 URL 下载）
   */
  async installFromUrl(url: string): Promise<LoadedPlugin> {
    // 简化实现：实际应从市场 API 下载 zip 并解压
    throw new Error('插件市场安装功能开发中');
  }

  /**
   * 启用/禁用插件
   */
  async togglePlugin(name: string, enabled: boolean): Promise<boolean> {
    const plugin = this.plugins.get(name);
    if (!plugin || !plugin.path) return false;

    // 更新 manifest
    const manifestPath = path.join(plugin.path, 'plugin.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    manifest.enabled = enabled;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    // 重新加载
    if (enabled) {
      await this.loadPlugin(plugin.path);
    } else {
      await this.unloadPlugin(name);
    }
    return true;
  }

  // ==================== 热重载 ====================

  /**
   * 启动文件监听（热重载）
   */
  private startHotReload(): void {
    if (this.watcher) {
      this.watcher.close();
    }

    this.watcher = chokidar.watch(this.pluginsDir, {
      ignored: /node_modules/,
      ignoreInitial: true,
      depth: 2,
    });

    this.watcher.on('change', async (filePath) => {
      if (filePath.endsWith('plugin.json') || filePath.endsWith('index.js')) {
        const pluginDir = path.dirname(filePath);
        const pluginName = path.basename(pluginDir);
        this.logger.log(`检测到插件变化，热重载: ${pluginName}`);
        try {
          await this.reloadPlugin(pluginName);
        } catch (error) {
          this.logger.error(`热重载失败 [${pluginName}]: ${error instanceof Error ? error.message : error}`);
        }
      }
    });

    this.watcher.on('addDir', async (dirPath) => {
      const manifestPath = path.join(dirPath, 'plugin.json');
      if (fs.existsSync(manifestPath)) {
        this.logger.log(`检测到新插件目录: ${path.basename(dirPath)}`);
        try {
          await this.loadPlugin(dirPath);
        } catch (error) {
          this.logger.error(`新插件加载失败: ${error instanceof Error ? error.message : error}`);
        }
      }
    });

    this.logger.log(`插件热重载监听已启动: ${this.pluginsDir}`);
  }

  // ==================== 私有方法 ====================

  private async ensurePluginsDir(): Promise<void> {
    if (!fs.existsSync(this.pluginsDir)) {
      fs.mkdirSync(this.pluginsDir, { recursive: true });
      this.logger.log(`插件目录已创建: ${this.pluginsDir}`);
    }
  }

  private createPluginContext(manifest: PluginManifest): PluginContext {
    return {
      name: manifest.name,
      version: manifest.version,
      logger: new Logger(`Plugin:${manifest.name}`),
      config: {},
    };
  }

  /**
   * 关闭时清理
   */
  async onModuleDestroy() {
    if (this.watcher) {
      await this.watcher.close();
    }
    for (const [name] of this.plugins) {
      await this.unloadPlugin(name);
    }
  }
}

// ==================== 类型定义 ====================

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  main?: string;
  enabled?: boolean;
  tools?: PluginTool[];
  hooks?: Record<string, string>;
}

export interface PluginTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface PluginModule {
  register?: (context: PluginContext) => Promise<void> | void;
  unregister?: () => Promise<void> | void;
  executeTool?: (toolName: string, args: Record<string, unknown>) => Promise<unknown>;
}

export interface PluginContext {
  name: string;
  version: string;
  logger: Logger;
  config: Record<string, unknown>;
}

export interface LoadedPlugin {
  manifest: PluginManifest;
  module: PluginModule | null;
  status: 'active' | 'disabled' | 'error';
  loadedAt: Date;
  path?: string;
}

export interface PluginInfo {
  name: string;
  version: string;
  description: string;
  author: string;
  status: string;
  tools: number;
  loadedAt: Date;
}
