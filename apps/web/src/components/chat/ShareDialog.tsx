'use client';

import { useState } from 'react';
import { Share2, Copy, Check, Link } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';

/**
 * 对话分享组件
 * 生成短链分享对话
 */
export function ShareDialog({ conversationId, onClose }: { conversationId: string; onClose: () => void }) {
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateLink = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/short-links/share/' + conversationId, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') || '' },
      });
      if (res.ok) {
        const data = await res.json();
        setShortUrl(data.shortUrl);
      }
    } catch {}
    setLoading(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Share2 className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">分享对话</h3>
        </div>

        <p className="mb-4 text-sm text-slate-400">
          生成一个短链接，分享给其他人查看此对话。
        </p>

        {shortUrl ? (
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2">
              <Link className="h-4 w-4 text-slate-400" />
              <span className="flex-1 truncate text-sm text-white">{shortUrl}</span>
            </div>
            <button
              onClick={handleCopy}
              className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-500"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        ) : (
          <button
            onClick={generateLink}
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? '生成中...' : '生成分享链接'}
          </button>
        )}

        <button
          onClick={onClose}
          className="mt-3 w-full rounded-lg bg-slate-700 py-2 text-white hover:bg-slate-600"
        >
          关闭
        </button>
      </div>
    </div>
  );
}