'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Brain } from 'lucide-react';

/**
 * 思考过程展示组件
 */
export function ThinkingBlock({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-2 overflow-hidden rounded-xl border border-thinking-border bg-thinking">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-thinking-foreground hover:opacity-90"
      >
        <Brain className="h-4 w-4" />
        <span className="flex-1 font-medium">思考过程</span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div className="border-t border-thinking-border px-4 py-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {content}
          </p>
        </div>
      )}
    </div>
  );
}
