'use client';

import { useState } from 'react';
import { Share2, Copy, Check, Link, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 对话分享组件 - 增强版
 * 生成短链接分享对话
 */
export function ShareDialog({
  conversationId,
  onClose,
}: {
  conversationId: string;
  onClose: () => void;
}) {
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateLink = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/short-links/share/' + conversationId, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + (localStorage.getItem('token') || ''),
        },
      });
      if (res.ok) {
        const data = await res.json();
        setShortUrl(data.shortUrl);
      }
    } catch {
      // Handle error
    }
    setLoading(false);
  };

  const handleCopy = async () => {
    if (!shortUrl) return;
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Handle error
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elevated animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Share2 className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-card-foreground">分享对话</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-card-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          生成一个短链接，分享给其他人查看此对话。
        </p>

        {shortUrl ? (
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
              <Link className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-sm text-card-foreground">
                {shortUrl}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg transition-all',
                copied
                  ? 'bg-success text-white'
                  : 'bg-primary text-primary-foreground hover:opacity-90'
              )}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={generateLink}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                生成分享链接
              </>
            )}
          </button>
        )}

        <button
          onClick={onClose}
          className="mt-3 w-full rounded-lg border border-border py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-card-foreground"
        >
          关闭
        </button>
      </div>
    </div>
  );
}
