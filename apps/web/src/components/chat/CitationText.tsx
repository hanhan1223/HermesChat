'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

/** 引用来源 */
export interface CitationSource {
  id: string;
  title?: string;
  content?: string;
  snippet?: string;
  url?: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

interface CitationTextProps {
  /** 消息原文，可能包含 [[ID: doc_x]] 标记 */
  content: string;
  /** doc_id → 展示序号（1-based） */
  sourceMapping?: Record<string, number>;
  /** 按 doc_id 查找来源详情 */
  sources?: CitationSource[];
  /** 点击引用上标时回调 */
  onCitationClick?: (source: CitationSource, displayNumber: number) => void;
  className?: string;
}

/** 解析结果片段 */
type Token =
  | { type: 'text'; value: string }
  | { type: 'citation'; docId: string; displayNumber: number };

/** 匹配 [[ID: xxx]] 引用标记 */
const CITATION_RE = /\[\[ID:\s*([^\]]+?)\]\]/g;

/**
 * 解析消息内容，将引用标记拆分为文本 / 引用片段
 */
export function parseCitations(
  content: string,
  sourceMapping?: Record<string, number>
): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  let fallbackIndex = 0;

  CITATION_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = CITATION_RE.exec(content)) !== null) {
    const [full, docId] = match;
    const start = match.index;

    if (start > lastIndex) {
      tokens.push({ type: 'text', value: content.slice(lastIndex, start) });
    }

    // 优先使用 sourceMapping 中的序号；否则按出现顺序递增
    fallbackIndex += 1;
    const displayNumber =
      sourceMapping && typeof sourceMapping[docId] === 'number'
        ? sourceMapping[docId]
        : fallbackIndex;

    tokens.push({ type: 'citation', docId, displayNumber });
    lastIndex = start + full.length;
  }

  if (lastIndex < content.length) {
    tokens.push({ type: 'text', value: content.slice(lastIndex) });
  }

  return tokens;
}

/**
 * 引用文本渲染组件
 * 将消息中的 [[ID: doc_x]] 替换为可点击的上标 [N]
 */
export function CitationText({
  content,
  sourceMapping,
  sources,
  onCitationClick,
  className,
}: CitationTextProps) {
  const tokens = useMemo(
    () => parseCitations(content, sourceMapping),
    [content, sourceMapping]
  );

  // 没有引用标记时直接渲染纯文本
  if (tokens.length === 0 || (tokens.length === 1 && tokens[0].type === 'text')) {
    return (
      <span className={cn('whitespace-pre-wrap', className)}>{content}</span>
    );
  }

  return (
    <span className={cn('whitespace-pre-wrap', className)}>
      {tokens.map((token, i) => {
        if (token.type === 'text') {
          return <span key={i}>{token.value}</span>;
        }

        const source = sources?.find((s) => s.id === token.docId);
        const clickable = !!source && !!onCitationClick;

        return (
          <button
            key={i}
            type="button"
            title={source?.title || token.docId}
            disabled={!clickable}
            onClick={(e) => {
              e.stopPropagation();
              if (source && onCitationClick) {
                onCitationClick(source, token.displayNumber);
              }
            }}
            className={cn(
              'relative -top-[0.4em] mx-[1px] rounded px-[3px] text-[11px] font-medium leading-none',
              'transition-colors',
              clickable
                ? 'cursor-pointer bg-info/15 text-info hover:bg-info/25 hover:text-info'
                : 'cursor-default bg-muted text-muted-foreground'
            )}
          >
            [{token.displayNumber}]
          </button>
        );
      })}
    </span>
  );
}
