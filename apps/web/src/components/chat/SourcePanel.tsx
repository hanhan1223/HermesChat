'use client';

import {
  X,
  ExternalLink,
  FileText,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CitationSource } from '@/components/chat/CitationText';

interface SourcePanelProps {
  /** 当前展示的来源详情；null 时展示来源列表 */
  selectedSource: CitationSource | null;
  /** 全部来源列表 */
  sources: CitationSource[];
  /** 选中某条来源 */
  onSelect: (source: CitationSource | null) => void;
  /** 关闭面板 */
  onClose: () => void;
  className?: string;
}

/**
 * 右侧来源详情面板
 * - 无选中时：展示当前回答引用的全部来源列表
 * - 有选中时：展示单条来源的标题、摘要、链接
 */
export function SourcePanel({
  selectedSource,
  sources,
  onSelect,
  onClose,
  className,
}: SourcePanelProps) {
  return (
    <aside
      className={cn(
        'flex h-full w-full flex-col border-l border-border bg-sidebar text-sidebar-foreground',
        className
      )}
    >
      {/* 头部 */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-info" />
          <span className="text-sm font-medium text-foreground">
            {selectedSource ? '来源详情' : '引用来源'}
          </span>
          {!selectedSource && sources.length > 0 && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {sources.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="关闭面板"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {selectedSource ? (
          <SourceDetail source={selectedSource} onBack={() => onSelect(null)} />
        ) : (
          <SourceList sources={sources} onSelect={onSelect} />
        )}
      </div>
    </aside>
  );
}

/** 来源列表 */
function SourceList({
  sources,
  onSelect,
}: {
  sources: CitationSource[];
  onSelect: (s: CitationSource) => void;
}) {
  if (sources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="mb-3 h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">暂无引用来源</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          提问时引用知识库内容后，来源会显示在这里
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2">
      {sources.map((src, i) => {
        const snippet = src.snippet || src.content || '';
        const shortSnippet =
          snippet.length > 80 ? snippet.slice(0, 80) + '...' : snippet;

        return (
          <button
            key={src.id}
            type="button"
            onClick={() => onSelect(src)}
            className="group flex w-full items-start gap-2 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-sidebar-hover"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-info/15 text-[11px] font-medium text-info">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {src.title || src.id}
              </p>
              {shortSnippet && (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {shortSnippet}
                </p>
              )}
              {typeof src.score === 'number' && (
                <p className="mt-1 text-[10px] text-muted-foreground/60">
                  相关度 {(src.score * 100).toFixed(0)}%
                </p>
              )}
            </div>
            <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground" />
          </button>
        );
      })}
    </div>
  );
}

/** 单条来源详情 */
function SourceDetail({
  source,
  onBack,
}: {
  source: CitationSource;
  onBack: () => void;
}) {
  const fullText = source.content || source.snippet || '';

  return (
    <div className="p-3">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronRight className="h-3 w-3 rotate-180" />
        返回列表
      </button>

      <h3 className="text-sm font-semibold text-foreground">
        {source.title || source.id}
      </h3>

      {typeof source.score === 'number' && (
        <span className="mt-1 inline-block rounded-full bg-info/10 px-2 py-0.5 text-[10px] text-info">
          相关度 {(source.score * 100).toFixed(0)}%
        </span>
      )}

      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center gap-1 text-xs text-info hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          <span className="truncate">{source.url}</span>
        </a>
      )}

      {fullText && (
        <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
            {fullText}
          </p>
        </div>
      )}

      {source.metadata && Object.keys(source.metadata).length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-[11px] font-medium text-muted-foreground">
            元数据
          </p>
          <pre className="overflow-x-auto rounded-lg bg-muted p-2 text-[11px] text-foreground">
            {JSON.stringify(source.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
