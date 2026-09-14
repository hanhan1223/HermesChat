import { Controller, Post, Get, Param, Body, Req, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { AgentStateManager, AgentState } from './agent-state.manager';
import { SandboxService } from './sandbox.service';

/**
 * Agent 运行控制 API — 暂停/恢复/取消/状态查询
 */
@Controller('agent/runs')
export class AgentRunController {
  constructor(
    private readonly stateManager: AgentStateManager,
    private readonly sandbox: SandboxService,
  ) {}

  /**
   * 获取运行状态
   */
  @Get(':runId')
  getRun(@Param('runId') runId: string, @Req() req: Request) {
    const user = (req as any).user;
    if (!user) throw new UnauthorizedException();

    const run = this.stateManager.getRun(runId);
    if (!run) return { error: 'Run not found' };
    if (run.userId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('无权访问此运行');
    }

    return {
      runId: run.runId,
      state: run.state,
      currentStep: run.currentStep,
      maxSteps: run.maxSteps,
      startedAt: run.startedAt,
      updatedAt: run.updatedAt,
      error: run.error,
    };
  }

  /**
   * 暂停运行
   */
  @Post(':runId/pause')
  pause(@Param('runId') runId: string, @Req() req: Request) {
    const user = (req as any).user;
    if (!user) throw new UnauthorizedException();

    const run = this.stateManager.getRun(runId);
    if (!run || run.userId !== user.id) throw new ForbiddenException();

    const ok = this.stateManager.pause(runId);
    return { success: ok, state: run.state };
  }

  /**
   * 恢复运行
   */
  @Post(':runId/resume')
  resume(@Param('runId') runId: string, @Req() req: Request) {
    const user = (req as any).user;
    if (!user) throw new UnauthorizedException();

    const run = this.stateManager.getRun(runId);
    if (!run || run.userId !== user.id) throw new ForbiddenException();

    const ok = this.stateManager.resume(runId);
    return { success: ok, state: run.state };
  }

  /**
   * 取消运行
   */
  @Post(':runId/cancel')
  cancel(@Param('runId') runId: string, @Req() req: Request) {
    const user = (req as any).user;
    if (!user) throw new UnauthorizedException();

    const run = this.stateManager.getRun(runId);
    if (!run || run.userId !== user.id) throw new ForbiddenException();

    const ok = this.stateManager.cancel(runId);
    return { success: ok, state: run.state };
  }

  /**
   * 列出当前用户的所有运行
   */
  @Get()
  listRuns(@Req() req: Request) {
    const user = (req as any).user;
    if (!user) throw new UnauthorizedException();

    return this.stateManager.listUserRuns(user.id).map(r => ({
      runId: r.runId,
      conversationId: r.conversationId,
      state: r.state,
      currentStep: r.currentStep,
      maxSteps: r.maxSteps,
      startedAt: r.startedAt,
    }));
  }

  /**
   * 沙箱代码执行
   */
  @Post('sandbox/execute')
  async executeSandbox(
    @Body() body: { code: string; language: 'python' | 'javascript' | 'bash' },
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    if (!user) throw new UnauthorizedException();

    return this.sandbox.execute({
      code: body.code,
      language: body.language || 'python',
      userId: user.id,
    });
  }
}
