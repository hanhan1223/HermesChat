'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ThemeIconButton } from '@/components/theme/ThemeToggle';

export default function SharePage() {
  const params = useParams<{ id: string }>();
  const shareId = params?.id;
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareId) {
      setError('无效的分享链接');
      setLoading(false);
      return;
    }
    fetchSharedConversation(shareId);
  }, [shareId]);

  const fetchSharedConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}/shared`);
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">无法访问</h1>
          <p className="mt-2 text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">分享的对话</h1>
          <ThemeIconButton />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="space-y-4">
          {messages.map((msg: any) => (
            <div
              key={msg.id}
              className={
                'rounded-2xl px-4 py-3 ' +
                (msg.role === 'USER'
                  ? 'ml-12 bg-chat-bubble-user text-foreground'
                  : 'mr-12 bg-transparent text-foreground')
              }
            >
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">暂无消息</p>
          )}
        </div>
      </main>
    </div>
  );
}
