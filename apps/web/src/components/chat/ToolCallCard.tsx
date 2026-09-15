'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Wrench, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export interface ToolCallRecord {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  status: 'pending' | 'running' | 'success' | 'error';
}

/**
 * 工具执行可视化组件
 */
export function ToolCallCard({ toolCall }: { toolCall: ToolCallRecord }) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig = {
    pending: { icon: Loader2, color: 'text-muted-foreground', label: '等待中' },
    running: { icon: Loader2, color: 'text-info', label: '执行中' },
    success: { icon: CheckCircle, color: 'text-success', label: '成功' },
    error: { icon: XCircle, color: 'text-destructive', label: '失败' },
  };

  const config = statusConfig[toolCall.status] ?? statusConfig.pending;
  const Icon = config.icon;

  return (
    <div className="mb-2 overflow-hidden rounded-xl border border-border bg-tool">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-muted/60"
      >
        <Wrench className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 truncate text-sm font-medium text-foreground">
          {toolCall.name}
        </span>
        <span className={`flex items-center gap-1 text-xs ${config.color}`}>
          <Icon className={`h-3 w-3 ${toolCall.status === 'running' ? 'animate-spin' : ''}`} />
          {config.label}
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-border px-4 py-3">
          <div>
            <span className="text-xs font-medium text-muted-foreground">参数</span>
            <pre className="mt-1 overflow-x-auto rounded-lg bg-muted p-2 text-xs text-foreground">
              {JSON.stringify(toolCall.arguments, null, 2)}
            </pre>
          </div>

          {toolCall.result && (
            <div>
              <span className="text-xs font-medium text-success">结果</span>
              <pre className="mt-1 overflow-x-auto rounded-lg bg-muted p-2 text-xs text-foreground">
                {JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}

          {toolCall.error && (
            <div>
              <span className="text-xs font-medium text-destructive">错误</span>
              <pre className="mt-1 overflow-x-auto rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                {toolCall.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
