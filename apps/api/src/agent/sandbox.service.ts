import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuid } from 'uuid';

const execAsync = promisify(exec);

/**
 * 沙箱代码执行服务 — OpenHands 式隔离执行
 *
 * 安全策略:
 * 1. 每次执行创建独立临时目录
 * 2. 超时强制终止（默认 30s）
 * 3. 输出长度限制（防止 OOM）
 * 4. 执行后清理临时文件
 * 5. 支持 Python / Node.js / Bash
 */
@Injectable()
export class SandboxService {
  private readonly logger = new Logger(SandboxService.name);
  private readonly timeoutMs: number;
  private readonly maxOutputBytes: number;
  private readonly sandboxBaseDir: string;

  constructor(private readonly config: ConfigService) {
    this.timeoutMs = parseInt(this.config.get('SANDBOX_TIMEOUT_MS', '30000'), 10);
    this.maxOutputBytes = parseInt(this.config.get('SANDBOX_MAX_OUTPUT', '65536'), 10);
    this.sandboxBaseDir = path.join(os.tmpdir(), 'hermes-sandbox');
  }

  /**
   * 在沙箱中执行代码
   */
  async execute(params: {
    code: string;
    language: 'python' | 'javascript' | 'bash';
    userId: string;
  }): Promise<SandboxResult> {
    const execId = uuid().substring(0, 8);
    const workDir = path.join(this.sandboxBaseDir, `${params.userId}-${execId}`);

    try {
      await fs.mkdir(workDir, { recursive: true });

      let command: string;
      let args: string[];
      let filePath: string;

      switch (params.language) {
        case 'python':
          filePath = path.join(workDir, 'main.py');
          await fs.writeFile(filePath, params.code, 'utf-8');
          command = 'python';
          args = [filePath];
          break;
        case 'javascript':
          filePath = path.join(workDir, 'main.js');
          await fs.writeFile(filePath, params.code, 'utf-8');
          command = 'node';
          args = [filePath];
          break;
        case 'bash':
          filePath = path.join(workDir, 'main.sh');
          await fs.writeFile(filePath, params.code, 'utf-8');
          command = 'bash';
          args = [filePath];
          break;
        default:
          throw new Error(`Unsupported language: ${params.language}`);
      }

      this.logger.log(`Sandbox exec [${execId}]: ${params.language} (${params.code.length} chars)`);

      const result = await this.runProcess(command, args, workDir);

      return {
        execId,
        language: params.language,
        stdout: this.truncate(result.stdout),
        stderr: this.truncate(result.stderr),
        exitCode: result.exitCode,
        durationMs: result.durationMs,
        timedOut: result.timedOut,
      };
    } catch (error) {
      return {
        execId,
        language: params.language,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: 1,
        durationMs: 0,
        timedOut: false,
      };
    } finally {
      // 清理临时目录
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  /**
   * 运行子进程（带超时和输出限制）
   */
  private runProcess(
    command: string,
    args: string[],
    cwd: string,
  ): Promise<{ stdout: string; stderr: string; exitCode: number; durationMs: number; timedOut: boolean }> {
    return new Promise((resolve) => {
      const start = Date.now();
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const proc = spawn(command, args, {
        cwd,
        timeout: this.timeoutMs,
        killSignal: 'SIGKILL',
        env: {
          PATH: process.env.PATH,
          HOME: cwd,
          // 不继承其他环境变量（防止泄露密钥）
        },
      });

      proc.stdout.on('data', (data: Buffer) => {
        if (stdout.length < this.maxOutputBytes) {
          stdout += data.toString('utf-8');
        }
      });

      proc.stderr.on('data', (data: Buffer) => {
        if (stderr.length < this.maxOutputBytes) {
          stderr += data.toString('utf-8');
        }
      });

      proc.on('close', (code) => {
        resolve({
          stdout,
          stderr,
          exitCode: code ?? -1,
          durationMs: Date.now() - start,
          timedOut,
        });
      });

      proc.on('error', (err) => {
        resolve({
          stdout,
          stderr: stderr || err.message,
          exitCode: -1,
          durationMs: Date.now() - start,
          timedOut: false,
        });
      });

      // 超时保护
      const timer = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGKILL');
      }, this.timeoutMs);
      timer.unref?.();
    });
  }

  private truncate(text: string): string {
    if (text.length <= this.maxOutputBytes) return text;
    return text.substring(0, this.maxOutputBytes) + '\n... [output truncated]';
  }
}

export interface SandboxResult {
  execId: string;
  language: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  timedOut: boolean;
}
