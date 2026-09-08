'use client';

import { useEffect, useState } from 'react';

/**
 * 对话分享页面 - 通过分享 ID 访问的公开对话
 */
export default function SharePage({ params }: { params: { id: string } }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSharedConversation(params.id);
  }, [params.id]);

  const fetchSharedConversation = async (id: string) => {
    try {
      const res = await fetch('/api/conversations/' + id + '/shared');
      if (!res.ok) throw new Error('对话不存在或已过期');
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-slate-400">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">无法访问</h1>
          <p className="mt-2 text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 px-4 py-3">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-lg font-semibold text-white">分享的对话</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="space-y-4">
          {messages.map((msg: any) => (
            <div
              key={msg.id}
              className={'rounded-2xl px-4 py-3 ' + (msg.role === 'USER' ? 'ml-12 bg-blue-600 text-white' : 'mr-12 bg-slate-800 text-slate-100')}
            >
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}