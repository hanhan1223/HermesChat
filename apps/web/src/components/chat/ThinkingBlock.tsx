'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Brain, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 思考过程展示组件 - 增强版
 * 可折叠展示 Agent 的思考/推理过程
 * 支持：流式展示、动画、完成状态
 */
export function ThinkingBlock({
  content,
  isStreaming = false,
}: {
  content: string;
  isStreaming?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-thinking-border bg-thinking">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-thinking-foreground/5"
      >
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-thinking-foreground/10">
          {isStreaming ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-thinking-foreground" />
          ) : (
            <Brain className="h-3.5 w-3.5 text-thinking-foreground" />
          )}
        </div>
        <span className="flex-1 text-xs font-medium text-thinking-foreground">
          {isStreaming ? '正在思考...' : '思考完成'}
        </span>
        <span className="text-[10px] text-thinking-foreground/60">
          {content.length} 字
        </span>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-thinking-foreground/60" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-thinking-foreground/60" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-thinking-border px-4 py-3">
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/70">
            {content}
            {isStreaming && (
              <span className="ml-0.5 inline-block h-3.5 w-1 animate-blink rounded-sm bg-thinking-foreground/70" />
            )}
          </p>
        </div>
      )}
    </div>
  );
}
