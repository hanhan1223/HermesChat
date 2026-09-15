import { Controller, Get, Post, Delete, Param, Body, Put } from '@nestjs/common';
import { PluginSystemService } from './plugin-system.service';

/**
 * 插件系统 API
 */
@Controller('plugins')
export class PluginController {
  constructor(private readonly pluginSystem: PluginSystemService) {}

  /** 列出所有插件 */
  @Get()
  listPlugins() {
    return this.pluginSystem.listPlugins();
  }

  /** 获取插件详情 */
  @Get(':name')
  getPlugin(@Param('name') name: string) {
    return this.pluginSystem.getPlugin(name);
  }

  /** 获取所有插件工具定义 */
  @Get('tools/all')
  getAllTools() {
    return this.pluginSystem.getAllPluginTools();
  }

  /** 重新加载插件 */
  @Post(':name/reload')
  reloadPlugin(@Param('name') name: string) {
    return this.pluginSystem.reloadPlugin(name);
  }

  /** 启用/禁用插件 */
  @Put(':name/toggle')
  togglePlugin(@Param('name') name: string, @Body() body: { enabled: boolean }) {
    return this.pluginSystem.togglePlugin(name, body.enabled);
  }

  /** 执行插件工具 */
  @Post(':name/tools/:toolName/execute')
  executeTool(
    @Param('name') name: string,
    @Param('toolName') toolName: string,
    @Body() body: { args: Record<string, unknown> },
  ) {
    return this.pluginSystem.executePluginTool(name, toolName, body.args || {});
  }
}
