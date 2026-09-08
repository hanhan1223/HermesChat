'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Wrench, CheckCircle, XCircle, Loader2 } from 'lucide-react';

/**
 * 工具执行可视化组件
 * 展示工具调用的参数、执行状态和结果
 */
export function ToolCallCard({ toolCall }: { toolCall: ToolCallRecord }) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig = {
    pending: { icon: Loader2, color: 'text-slate-400', bg: 'bg-slate-500/10', label: '等待中' },
    running: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/10', label: '执行中' },
    success: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: '成功' },
    error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: '失败' },
  };

  const config = statusConfig[toolCall.status];
  const Icon = config.icon;

  return (
    <div className="mb-2 rounded-xl border border-slate-700 bg-slate-800/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-slate-700/50"
      >
        <Wrench className="h-4 w-4 text-slate-400" />
        <span className="flex-1 truncate text-sm font-medium text-slate-200">
          {toolCall.name}
        </span>
        <span className={lex items-center gap-1 text-xs }>
          <Icon className={h-3 w-3 } />
          {config.label}
        </span>
        {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-slate-700 px-4 py-3">
          {/* 参数 */}
          <div>
            <span className="text-xs font-medium text-slate-400">参数</span>
            <pre className="mt-1 overflow-x-auto rounded bg-slate-900 p-2 text-xs text-slate-300">
              {JSON.stringify(toolCall.arguments, null, 2)}
            </pre>
          </div>

          {/* 结果 */}
          {toolCall.result && (
            <div>
              <span className="text-xs font-medium text-emerald-400">结果</span>
              <pre className="mt-1 overflow-x-auto rounded bg-slate-900 p-2 text-xs text-slate-300">
                {JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}

          {/* 错误 */}
          {toolCall.error && (
            <div>
              <span className="text-xs font-medium text-red-400">错误</span>
              <pre className="mt-1 overflow-x-auto rounded bg-red-900/20 p-2 text-xs text-red-300">
                {toolCall.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ToolCallRecord {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  status: 'pending' | 'running' | 'success' | 'error';
}