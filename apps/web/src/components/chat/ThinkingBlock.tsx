'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Brain } from 'lucide-react';

/**
 * 思考过程展示组件
 * 可折叠展示 Agent 的思考/推理过程
 */
export function ThinkingBlock({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-2 rounded-xl border border-amber-500/20 bg-amber-500/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-amber-400 hover:bg-amber-500/10"
      >
        <Brain className="h-4 w-4" />
        <span className="flex-1 font-medium">思考过程</span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div className="border-t border-amber-500/20 px-4 py-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
            {content}
          </p>
        </div>
      )}
    </div>
  );
}