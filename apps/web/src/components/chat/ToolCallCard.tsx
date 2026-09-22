'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Wrench,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToolCallRecord {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  status: 'pending' | 'running' | 'success' | 'error';
}

/**
 * 工具调用卡片 — Codex 风格：紧凑单行状态 + 可展开详情
 */
export function ToolCallCard({ toolCall }: { toolCall: ToolCallRecord }) {
  const [expanded, setExpanded] = useState(false);

  const statusMap = {
    pending: { icon: Loader2, label: '等待中', cls: 'text-muted-foreground' },
    running: { icon: Loader2, label: '执行中', cls: 'text-foreground' },
    success: { icon: CheckCircle2, label: '成功', cls: 'text-emerald-600' },
    error: { icon: XCircle, label: '失败', cls: 'text-destructive' },
  };

  const s = statusMap[toolCall.status] ?? statusMap.pending;
  const Icon = s.icon;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/40"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted">
          <Wrench className="h-3 w-3 text-muted-foreground" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
          {toolCall.name}
        </span>
        <span className={cn('flex shrink-0 items-center gap-1 text-[11px]', s.cls)}>
          <Icon
            className={cn(
              'h-3 w-3',
              toolCall.status === 'running' || toolCall.status === 'pending'
                ? 'animate-spin'
                : '',
            )}
          />
          {s.label}
        </span>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-border bg-muted/20 px-3 py-2.5">
          <div>
            <div className="mb-1 text-[11px] font-medium text-muted-foreground">参数</div>
            <pre className="max-h-48 overflow-auto rounded-lg bg-muted/60 p-2 text-[11px] leading-relaxed text-foreground">
              {JSON.stringify(toolCall.arguments, null, 2)}
            </pre>
          </div>
          {toolCall.result && (
            <div>
              <div className="mb-1 text-[11px] font-medium text-muted-foreground">结果</div>
              <pre className="max-h-48 overflow-auto rounded-lg bg-muted/60 p-2 text-[11px] leading-relaxed text-foreground">
                {JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}
          {toolCall.error && (
            <div>
              <div className="mb-1 text-[11px] font-medium text-destructive">错误</div>
              <pre className="max-h-48 overflow-auto rounded-lg bg-destructive/10 p-2 text-[11px] text-destructive">
                {toolCall.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
