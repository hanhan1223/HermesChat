'use client';

import { useState } from 'react';
import { Share2, Copy, Check, Link } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';

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
  const [error, setError] = useState<string | null>(null);

  const generateLink = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.shareConversation(conversationId);
      const url =
        data.shortUrl ||
        data.url ||
        data.shareUrl ||
        (data.sharedId
          ? `${window.location.origin}/share/${data.sharedId}`
          : null);
      if (url) {
        setShortUrl(url);
      } else {
        setError('生成分享链接失败');
      }
    } catch (e: any) {
      setError(e.message || '生成分享链接失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shortUrl) return;
    const success = await copyToClipboard(shortUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-2">
          <Share2 className="h-5 w-5 text-info" />
          <h3 className="text-lg font-semibold text-foreground">分享对话</h3>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          生成一个短链接，分享给其他人查看此对话。
        </p>

        {error && (
          <div className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {shortUrl ? (
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2">
              <Link className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate text-sm text-foreground">{shortUrl}</span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg bg-primary p-2 text-primary-foreground hover:opacity-90"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={generateLink}
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2 text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading ? '生成中...' : '生成分享链接'}
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-lg bg-muted py-2 text-foreground hover:bg-accent"
        >
          关闭
        </button>
      </div>
    </div>
  );
}
