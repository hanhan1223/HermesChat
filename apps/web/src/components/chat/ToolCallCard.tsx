'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Wrench,
  CheckCircle,
  XCircle,
  Loader2,
  Terminal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolCallRecord {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  status: 'pending' | 'running' | 'success' | 'error';
}

/**
 * 工具执行可视化组件 - 增强版
 * 展示工具调用的参数、执行状态和结果
 * 支持：状态动画、参数/结果展示、错误高亮
 */
export function ToolCallCard({ toolCall }: { toolCall: ToolCallRecord }) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig = {
    pending: {
      icon: Loader2,
      color: 'text-muted-foreground',
      bg: 'bg-muted',
      border: 'border-muted',
      label: '等待中',
    },
    running: {
      icon: Loader2,
      color: 'text-info',
      bg: 'bg-info/10',
      border: 'border-info/20',
      label: '执行中',
    },
    success: {
      icon: CheckCircle,
      color: 'text-success',
      bg: 'bg-success/10',
      border: 'border-success/20',
      label: '成功',
    },
    error: {
      icon: XCircle,
      color: 'text-error',
      bg: 'bg-error/10',
      border: 'border-error/20',
      label: '失败',
    },
  };

  const config = statusConfig[toolCall.status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'mb-2 overflow-hidden rounded-xl border transition-colors',
        config.border,
        'bg-tool'
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-tool-border/30"
      >
        <div className={cn('flex h-5 w-5 items-center justify-center rounded-md', config.bg)}>
          <Icon
            className={cn(
              'h-3.5 w-3.5',
              config.color,
              toolCall.status === 'running' && 'animate-spin'
            )}
          />
        </div>
        <Terminal className="h-3.5 w-3.5 text-muted-foreground/60" />
        <span className="flex-1 truncate text-xs font-medium text-foreground/80">
          {toolCall.name}
        </span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-medium',
            config.bg,
            config.color
          )}
        >
          {config.label}
        </span>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/60" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />
        )}
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-tool-border px-4 py-3">
          {/* Arguments */}
          <div>
            <span className="text-[11px] font-medium text-muted-foreground">
              参数
            </span>
            <pre className="mt-1 max-h-32 overflow-auto rounded-lg bg-background/50 p-2.5 font-mono text-[11px] text-foreground/70 scrollbar-thin">
              {JSON.stringify(toolCall.arguments, null, 2)}
            </pre>
          </div>

          {/* Result */}
          {toolCall.result && (
            <div>
              <span className="text-[11px] font-medium text-success">结果</span>
              <pre className="mt-1 max-h-32 overflow-auto rounded-lg bg-success/5 p-2.5 font-mono text-[11px] text-foreground/70 scrollbar-thin">
                {JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}

          {/* Error */}
          {toolCall.error && (
            <div>
              <span className="text-[11px] font-medium text-error">错误</span>
              <pre className="mt-1 max-h-32 overflow-auto rounded-lg bg-error/5 p-2.5 font-mono text-[11px] text-error/80 scrollbar-thin">
                {toolCall.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
