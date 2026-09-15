'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiClient.login(email, password);
      const token = data.token;
      const user = data.user;

      if (!token) {
        throw new Error('登录响应缺少 token');
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user || {}));
      apiClient.setToken(token);

      if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
        router.push('/admin');
      } else {
        router.push('/chat');
      }
    } catch (e: any) {
      setError(e.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = () => {
    // 标记为游客模式，跳转到游客对话页
    localStorage.setItem('guest_mode', 'true');
    router.push('/guest');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">HermesChat</h1>
          <p className="mt-2 text-muted-foreground">登录到您的账户</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm text-muted-foreground">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground outline-none focus:border-ring"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted-foreground">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground outline-none focus:border-ring"
              placeholder="********"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="mt-6 space-y-3">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">或</span>
            </div>
          </div>

          <button
            onClick={handleGuestMode}
            className="w-full rounded-lg border border-border py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            免登录试用（10 条免费消息）
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          还没有账号？{' '}
          <Link href="/register" className="text-primary hover:underline">
            立即注册
          </Link>
        </div>
      </div>
    </div>
  );
}
