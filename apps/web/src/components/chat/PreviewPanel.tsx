'use client';

import { useState } from 'react';
import {
  X,
  ChevronLeft,
  BookOpen,
  Code2,
  ImageIcon,
  FileText,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { cn, copyToClipboard } from '@/lib/utils';
import { SourcePanel } from '@/components/chat/SourcePanel';
import type { CitationSource } from '@/components/chat/CitationText';

/** 预览面板展示模式 */
export type PreviewMode = 'source' | 'code' | 'image';

export interface CodePreviewData {
  language: string;
  code: string;
  title?: string;
}

export interface ImagePreviewData {
  src: string;
  alt?: string;
}

interface PreviewPanelProps {
  /** 面板是否打开 */
  open: boolean;
  /** 关闭面板 */
  onClose: () => void;
  /** 收起面板（保留状态） */
  onCollapse?: () => void;
  /** 全部引用来源 */
  sources: CitationSource[];
  /** 当前选中的来源 */
  selectedSource: CitationSource | null;
  /** 选中来源 */
  onSelectSource: (source: CitationSource | null) => void;
  /** 当前预览模式 */
  mode?: PreviewMode;
  /** 代码预览数据 */
  codePreview?: CodePreviewData | null;
  /** 图片预览数据 */
  imagePreview?: ImagePreviewData | null;
  className?: string;
}

/**
 * 右侧预览面板（桌面端 > 1280px 显示）
 * 职责：
 * 1. 展示引用来源详情（与 SourcePanel 协作）
 * 2. 展示代码块预览
 * 3. 展示图片预览
 */
export function PreviewPanel({
  open,
  onClose,
  onCollapse,
  sources,
  selectedSource,
  onSelectSource,
  mode = 'source',
  codePreview,
  imagePreview,
  className,
}: PreviewPanelProps) {
  const [activeMode, setActiveMode] = useState<PreviewMode>(mode);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleCopyCode = async () => {
    if (!codePreview?.code) return;
    const ok = await copyToClipboard(codePreview.code);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={cn(
        'hidden h-full w-[360px] shrink-0 flex-col border-l border-border bg-sidebar xl:flex',
        className
      )}
    >
      {/* 模式切换标签栏 */}
      <div className="flex h-10 shrink-0 items-center gap-0.5 border-b border-border px-2">
        <ModeTab
          active={activeMode === 'source'}
          onClick={() => setActiveMode('source')}
          icon={<BookOpen className="h-3.5 w-3.5" />}
          label="来源"
        />
        <ModeTab
          active={activeMode === 'code'}
          onClick={() => setActiveMode('code')}
          icon={<Code2 className="h-3.5 w-3.5" />}
          label="代码"
          disabled={!codePreview}
        />
        <ModeTab
          active={activeMode === 'image'}
          onClick={() => setActiveMode('image')}
          icon={<ImageIcon className="h-3.5 w-3.5" />}
          label="图片"
          disabled={!imagePreview}
        />
        <div className="flex-1" />
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="收起面板"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="关闭面板"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-hidden">
        {activeMode === 'source' && (
          <SourcePanel
            selectedSource={selectedSource}
            sources={sources}
            onSelect={onSelectSource}
            onClose={onClose}
            className="border-l-0"
          />
        )}

        {activeMode === 'code' && (
          <div className="flex h-full flex-col">
            {codePreview ? (
              <>
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-info" />
                    <span className="text-sm font-medium text-foreground">
                      {codePreview.title || codePreview.language}
                    </span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {codePreview.language}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-success" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    {copied ? '已复制' : '复制'}
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-3">
                  <pre className="whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs leading-relaxed text-foreground">
                    <code>{codePreview.code}</code>
                  </pre>
                </div>
              </>
            ) : (
              <EmptyState
                icon={<Code2 className="h-10 w-10 text-muted-foreground/30" />}
                title="暂无代码预览"
                desc="点击消息中的代码块即可预览"
              />
            )}
          </div>
        )}

        {activeMode === 'image' && (
          <div className="flex h-full flex-col">
            {imagePreview ? (
              <>
                <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                  <ImageIcon className="h-4 w-4 text-info" />
                  <span className="flex-1 truncate text-sm font-medium text-foreground">
                    {imagePreview.alt || '图片预览'}
                  </span>
                  {imagePreview.src.startsWith('http') && (
                    <a
                      href={imagePreview.src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="新窗口打开"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                <div className="flex-1 overflow-auto p-3">
                  <img
                    src={imagePreview.src}
                    alt={imagePreview.alt || '预览图片'}
                    className="mx-auto max-w-full rounded-lg border border-border"
                  />
                </div>
              </>
            ) : (
              <EmptyState
                icon={
                  <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                }
                title="暂无图片预览"
                desc="点击消息中的图片即可预览"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** 模式切换标签 */
function ModeTab({
  active,
  onClick,
  icon,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs transition-colors',
        active
          ? 'bg-muted font-medium text-foreground'
          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

/** 空状态 */
function EmptyState({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      {icon}
      <p className="mt-3 text-sm font-medium text-muted-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground/60">{desc}</p>
    </div>
  );
}

/**
 * 移动端/平板端的简易来源弹层（< xl 时使用）
 */
export function SourceSheet({
  open,
  sources,
  selectedSource,
  onSelectSource,
  onClose,
}: {
  open: boolean;
  sources: CitationSource[];
  selectedSource: CitationSource | null;
  onSelectSource: (s: CitationSource | null) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 xl:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] rounded-t-2xl border-t border-border bg-card shadow-xl">
        <SourcePanel
          selectedSource={selectedSource}
          sources={sources}
          onSelect={onSelectSource}
          onClose={onClose}
          className="max-h-[70vh] border-l-0"
        />
      </div>
    </div>
  );
}
