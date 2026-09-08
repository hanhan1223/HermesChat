import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 模型路由器 - 统一 LLM 调用接口
 * 支持 OpenAI / Anthropic / Google / 本地模型
 * 通过适配器模式屏蔽不同 Provider 的差异
 */
@Injectable()
export class ModelRouter {
  private readonly logger = new Logger(ModelRouter.name);
  private openaiClient: OpenAI | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 统一聊天接口
   */
  async chat(params: ChatParams): Promise<ChatResponse> {
    const model = await this.prisma.model.findUnique({ where: { id: params.model } });
    if (!model || !model.enabled) {
      throw new Error(模型不可用: );
    }

    switch (model.provider) {
      case 'openai':
        return this.chatOpenAI(params, model);
      case 'anthropic':
        return this.chatAnthropic(params, model);
      case 'google':
        return this.chatGoogle(params, model);
      default:
        return this.chatOpenAI(params, model); // 默认走 OpenAI 兼容
    }
  }

  private async chatOpenAI(params: ChatParams, model: any): Promise<ChatResponse> {
    if (!this.openaiClient) {
      this.openaiClient = new OpenAI({
        apiKey: model.apiKey,
        baseURL: model.endpoint || undefined,
      });
    }

    const response = await this.openaiClient.chat.completions.create({
      model: model.modelId,
      messages: params.messages as any,
      tools: (params.tools as any) || undefined,
      temperature: params.temperature || 0.7,
      max_tokens: params.maxTokens || model.maxTokens,
    });

    const choice = response.choices[0];
    return {
      content: choice.message.content || '',
      toolCalls: choice.message.tool_calls?.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments || '{}'),
      })),
      usage: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
      },
    };
  }

  private async chatAnthropic(params: ChatParams, model: any): Promise<ChatResponse> {
    // Anthropic SDK 调用
    const Anthropic = await import('@anthropic-ai/sdk');
    const client = new Anthropic.default({ apiKey: model.apiKey });

    const response = await client.messages.create({
      model: model.modelId,
      max_tokens: params.maxTokens || model.maxTokens,
      system: params.messages.find(m => m.role === 'system')?.content as string,
      messages: params.messages.filter(m => m.role !== 'system') as any,
      tools: params.tools as any,
    });

    const content = response.content
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('');

    const toolUse = response.content.find((c: any) => c.type === 'tool_use');

    return {
      content,
      toolCalls: toolUse ? [{
        id: toolUse.id,
        name: toolUse.name,
        arguments: toolUse.input as Record<string, unknown>,
      }] : [],
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  private async chatGoogle(params: ChatParams, model: any): Promise<ChatResponse> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(model.apiKey);
    const genModel = genAI.getGenerativeModel({ model: model.modelId });

    const prompt = params.messages.map(m => ${m.role}: ).join('\n');
    const result = await genModel.generateContent(prompt);

    return {
      content: result.response.text(),
      toolCalls: [],
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }
}

export interface ChatParams {
  model: string;
  messages: { role: string; content: string }[];
  tools?: any[];
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content: string;
  toolCalls: { id: string; name: string; arguments: Record<string, unknown> }[];
  usage: { inputTokens: number; outputTokens: number; };
}