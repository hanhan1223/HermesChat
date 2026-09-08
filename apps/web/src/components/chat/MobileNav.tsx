'use client';

import { useState } from 'react';
import { Menu, X, MessageSquare, Settings, User, LogOut, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * 移动端导航栏 - 增强版
 */
export function MobileNav({ user }: { user: any }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex h-12 items-center justify-between border-b border-border bg-background/80 px-3 backdrop-blur-sm lg:hidden">
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">HermesChat</span>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-[10px] font-medium text-white">
          {user?.name?.charAt(0) || 'U'}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {open && (
        <div
          className="fixed inset-0 top-12 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-card transition-transform duration-300 lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-card-foreground">HermesChat</h1>
                <p className="text-[10px] text-muted-foreground">AI Agent Platform</p>
              </div>
            </div>
          </div>

          {/* New Chat */}
          <div className="p-3">
            <button
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium text-card-foreground transition-all hover:bg-muted"
            >
              <MessageSquare className="h-4 w-4" />
              新建对话
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
            <Link
              href="/chat"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-card-foreground"
            >
              <MessageSquare className="h-4 w-4" />
              对话
            </Link>
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-card-foreground"
            >
              <Settings className="h-4 w-4" />
              管理
            </Link>
          </nav>

          {/* User Section */}
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-medium text-white">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 truncate">
                <p className="truncate text-sm font-medium text-card-foreground">
                  {user?.name || '用户'}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {user?.email || 'user@hermes.chat'}
                </p>
              </div>
            </div>
            <button className="mt-2 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-error transition-colors hover:bg-error/10">
              <LogOut className="h-4 w-4" />
              退出登录
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
