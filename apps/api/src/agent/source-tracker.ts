import { Injectable } from '@nestjs/common';

/**
 * 引用来源追踪器
 *
 * 在 Agent 执行过程中为每个知识库检索结果 / 联网搜索结果分配 `doc_x` ID。
 * LLM 回复中的引用以 `[[ID: doc_x]]` 标记推送给前端。
 * 最终通过 `stream-end` 事件下发完整的 `source_id_to_number` 映射。
 *
 * 流程:
 *   1. 工具执行时 registerSource() → 得到 doc_x
 *   2. 注入到 LLM prompt，让模型在回复中输出 [[ID: doc_x]]
 *   3. 流结束时 buildMapping() → { doc_1: 1, doc_2: 2, ... }
 *   4. 前端将 [[ID: doc_x]] 替换为 [N] 上标
 */
@Injectable()
export class SourceTracker {
  private sources = new Map<string, SourceEntry>();
  private counter = 0;

  /**
   * 注册一个引用来源，返回 doc_x ID
   */
  registerSource(entry: Omit<SourceEntry, 'id' | 'number'>): string {
    this.counter += 1;
    const id = `doc_${this.counter}`;
    this.sources.set(id, {
      id,
      number: this.counter,
      ...entry,
    });
    return id;
  }

  /**
   * 批量注册（知识库检索返回多条结果）
   */
  registerBatch(entries: Omit<SourceEntry, 'id' | 'number'>[]): string[] {
    return entries.map((e) => this.registerSource(e));
  }

  /**
   * 获取单个来源
   */
  getSource(id: string): SourceEntry | undefined {
    return this.sources.get(id);
  }

  /**
   * 获取全部来源
   */
  getAllSources(): SourceEntry[] {
    return Array.from(this.sources.values());
  }

  /**
   * 构建 doc_x → 显示编号 的映射（用于 stream-end 事件）
   */
  buildMapping(): Record<string, number> {
    const mapping: Record<string, number> = {};
    for (const [id, entry] of this.sources) {
      mapping[id] = entry.number;
    }
    return mapping;
  }

  /**
   * 构建完整的来源列表（用于 stream-end 事件）
   */
  buildSourceList(): SourceEntry[] {
    return this.getAllSources().sort((a, b) => a.number - b.number);
  }

  /**
   * 构建注入 LLM prompt 的来源上下文
   * 告诉模型可用的引用 ID 及其内容
   */
  buildPromptContext(): string {
    if (this.sources.size === 0) return '';
    const parts = ['\n## 可引用的来源（在回复中使用 [[ID: doc_x]] 标记引用）:'];
    for (const entry of this.sources.values()) {
      parts.push(`\n[[ID: ${entry.id}]] ${entry.title}`);
      if (entry.snippet) {
        parts.push(`  摘要: ${entry.snippet.substring(0, 200)}`);
      }
      if (entry.url) {
        parts.push(`  链接: ${entry.url}`);
      }
    }
    parts.push('\n回复中引用来源时，请使用 [[ID: doc_x]] 格式，例如: 根据研究 [[ID: doc_1]]，...');
    return parts.join('\n');
  }

  /**
   * 重置（每个对话/请求重置）
   */
  reset(): void {
    this.sources.clear();
    this.counter = 0;
  }
}

export interface SourceEntry {
  id: string;
  number: number;
  title: string;
  url?: string;
  snippet?: string;
  type: 'knowledge' | 'web' | 'document';
  score?: number;
  metadata?: Record<string, unknown>;
}
