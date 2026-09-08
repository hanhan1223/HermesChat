'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 登录页面 - 现代设计
 * 参考 ChatGPT & Codex 登录页风格
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || '登录失败');
      }

      const { token, user } = await res.json();
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // 根据角色跳转
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        router.push('/admin');
      } else {
        router.push('/chat');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding */}
      <div className="hidden flex-1 items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-12 lg:flex">
        <div className="max-w-md">
          {/* Logo */}
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-glow">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">HermesChat</h1>
              <p className="text-xs text-slate-400">AI Agent Platform</p>
            </div>
          </div>

          {/* Tagline */}
          <h2 className="mb-4 text-3xl font-bold leading-tight text-white">
            与 AI 协作
              <br />
            创造无限可能
            </h2>
          <p className="mb-8 text-sm text-slate-400">
            企业级 AI Agent 平台，支持多模态对话、自定义 Skill 与 MCP 工具。
            让 AI 成为你的得力助手。
          </p>

          {/* Features */}
          <div className="space-y-3">
            {[
              { label: '多模态输入', desc: '文字、图片、视频、文件' },
              { label: '智能推理', desc: '深度思考，逐步分析' },
              { label: '工具调用', desc: 'MCP 协议，无限扩展' },
            ].map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-xs font-medium text-blue-400">
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{feature.label}</p>
                  <p className="text-[11px] text-slate-400">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-foreground">HermesChat</h1>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-foreground">欢迎回来</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              登录到您的账户继续使用
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-error/10 px-4 py-2.5 text-sm text-error animate-slide-up">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                邮箱
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-card-foreground outline-none transition-all focus:border-ring focus:ring-2 focus:ring-ring/20"
                  placeholder="admin@hermes.chat"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-10 text-sm text-card-foreground outline-none transition-all focus:border-ring focus:ring-2 focus:ring-ring/20"
                  placeholder="输入密码"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border bg-card accent-primary"
                />
                记住我
              </label>
              <button type="button" className="text-sm text-primary hover:underline">
                忘记密码？
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
              ) : (
                <>
                  登录
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">或者</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Register Link */}
          <p className="text-center text-sm text-muted-foreground">
            还没有账户？{' '}
            <button className="font-medium text-primary hover:underline">
              立即注册
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
