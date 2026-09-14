import { Injectable, Logger } from '@nestjs/common';
import { Tool, ToolContext } from '../tool.interface';

/**
 * 代码解释器工具 - 执行 Python/JS 代码
 */
@Injectable()
export class CodeInterpreterTool implements Tool {
  readonly name = 'code_interpreter';
  readonly description = '执行 Python 代码进行数据分析、计算、可视化等';
  readonly parameters = {
    type: 'object',
    properties: {
      code: { type: 'string', description: '要执行的代码' },
      language: { type: 'string', description: '编程语言', default: 'python' },
    },
    required: ['code'],
  };

  private readonly logger = new Logger(CodeInterpreterTool.name);

  async execute(args: Record<string, unknown>, _context: ToolContext) {
    const code = args.code as string;
    const language = (args.language as string) || 'python';

    this.logger.log(`执行 ${language} 代码 (${code.length} 字符)`);

    // 实际实现中可接入 Docker 沙箱 / Jupyter Kernel / E2B 等
    return {
      stdout: `代码执行成功 (${code.length} 字符)`,
      stderr: '',
      result: null,
      language,
    };
  }
}