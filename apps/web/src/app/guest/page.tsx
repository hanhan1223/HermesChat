'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Send, LogIn, Sparkles } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

interface GuestMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function GuestChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState(10);
  const [limitReached, setLimitReached] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRemaining();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchRemaining = async () => {
    try {
      const res = await fetch(`${API_BASE}/guest/remaining`);
      if (res.ok) {
        const data = await res.json();
        setRemaining(data.remaining);
        setLimit(data.limit);
        if (data.remaining <= 0) setLimitReached(true);
      }
    } catch {
      setRemaining(10);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading || limitReached) return;

    const userMsg: GuestMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: input.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/guest/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMsg.content }),
      });

      if (res.status === 403) {
        setLimitReached(true);
        setRemaining(0);
        setMessages((prev) => [
          ...prev,
          {
            id: `a_${Date.now()}`,
            role: 'assistant',
            content: '免费对话次数已用完。注册账号即可无限对话，还能保存历史记录。',
          },
        ]);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setRemaining(data.remaining);
        // 游客模式下暂时返回限流信息，真正的流式回复需要接 SSE
        setMessages((prev) => [
          ...prev,
          {
            id: `a_${Date.now()}`,
            role: 'assistant',
            content: `已收到你的消息（剩余 ${data.remaining} 条免费额度）。\n\n游客模式下回复功能需要后端 SSE 支持，注册后可获得完整对话体验。`,
          },
        ]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: '网络错误，请稍后重试。',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* 顶栏 */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">HermesChat</span>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600">
            游客模式
          </span>
        </div>
        <div className="flex items-center gap-3">
          {remaining !== null && (
            <span className="text-xs text-muted-foreground">
              剩余 {remaining}/{limit} 条
            </span>
          )}
          <ThemeToggle />
          <Link
            href="/login"
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            <LogIn className="h-3.5 w-3.5" />
            登录
          </Link>
        </div>
      </header>

      {/* 消息区 */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Sparkles className="mb-4 h-12 w-12 text-primary/30" />
            <h2 className="text-xl font-bold text-foreground">免费试用</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              无需注册即可体验 {limit} 条免费对话。注册后可无限对话、保存历史、使用更多功能。
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                  思考中...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 输入区 */}
      <div className="border-t border-border px-4 py-4">
        <div className="mx-auto max-w-2xl">
          {limitReached ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-center">
              <p className="text-sm text-foreground">免费次数已用完</p>
              <div className="mt-3 flex justify-center gap-3">
                <Link
                  href="/register"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  注册继续对话
                </Link>
                <Link
                  href="/login"
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                >
                  已有账号？登录
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="输入消息..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="rounded-xl bg-primary p-3 text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
