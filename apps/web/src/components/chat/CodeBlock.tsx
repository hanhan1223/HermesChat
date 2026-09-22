'use client';

import { useState, type ReactNode } from 'react';
import { Check, Copy, Download, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

async function copyText(text: string, setCopied: (v: boolean) => void) {
  try {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  } catch {
    // ignore
  }
}

function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** 代码块：语言标签 + 复制 / 下载 */
export function CodeBlock({
  code,
  lang,
  children,
}: {
  code: string;
  lang?: string;
  children?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const body = code ?? '';

  return (
    <div className="group relative my-2 overflow-hidden rounded-xl border border-border bg-muted/40">
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/50 px-3 py-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {lang || 'code'}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => copyText(body, setCopied)}
            title="复制代码"
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                已复制
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                复制
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() =>
              downloadBlob(body, `snippet.${lang || 'txt'}`, 'text/plain;charset=utf-8')
            }
            title="下载代码"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <pre className="overflow-x-auto px-3 py-2.5 font-mono text-[12.5px] leading-relaxed text-foreground">
        {children ?? <code>{body}</code>}
      </pre>
    </div>
  );
}

/** 图片：预览 + 复制图片 / 下载 */
export function ImageBlock({
  src,
  alt,
  name,
  className,
}: {
  src: string;
  alt?: string;
  name?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const filename = name || alt || 'image';

  const handleCopyImage = async () => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const type = blob.type.startsWith('image/') ? blob.type : 'image/png';
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ [type]: blob }),
        ]);
      } else {
        await navigator.clipboard.writeText(src);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      try {
        await navigator.clipboard.writeText(src);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      } catch {
        // ignore
      }
    }
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      downloadBlob(blob, filename.includes('.') ? filename : `${filename}.png`, blob.type);
    } catch {
      const a = document.createElement('a');
      a.href = src;
      a.download = filename;
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.click();
    }
  };

  return (
    <figure className={cn('group/img my-2 max-w-full overflow-hidden rounded-xl border border-border', className)}>
      {failed ? (
        <div className="flex h-32 items-center justify-center bg-muted text-xs text-muted-foreground">
          <ImageIcon className="mr-1 h-4 w-4" /> 图片加载失败
        </div>
      ) : (
        <img
          src={src}
          alt={alt || filename}
          onError={() => setFailed(true)}
          className="max-h-[420px] w-full bg-muted/30 object-contain"
        />
      )}
      <figcaption className="flex items-center gap-1 border-t border-border/60 bg-muted/40 px-2 py-1">
        <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
          {filename}
        </span>
        <button
          type="button"
          onClick={handleCopyImage}
          title="复制图片"
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-600" />
              已复制
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              复制
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          title="下载图片"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        >
          <Download className="h-3 w-3" />
        </button>
      </figcaption>
    </figure>
  );
}

/** 纯文本复制小按钮（消息级已有，可复用） */
export function CopyButton({
  text,
  className,
  label,
}: {
  text: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => copyText(text, setCopied)}
      title={label || '复制'}
      className={cn(
        'flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        className,
      )}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-600" />
          已复制
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          {label || '复制'}
        </>
      )}
    </button>
  );
}
