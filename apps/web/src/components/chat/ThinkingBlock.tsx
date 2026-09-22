'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 思考过程 — Codex 风格：轻量折叠，不抢正文
 */
export function ThinkingBlock({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const text = (content || '').trim();
  if (!text) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-1.5 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <Brain className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 font-medium">思考过程</span>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        )}
      </button>

      {expanded && (
        <p className="mt-2 border-t border-border/50 pt-2 text-xs leading-relaxed text-muted-foreground">
          <span className="whitespace-pre-wrap">{text}</span>
        </p>
      )}
    </div>
  );
}
