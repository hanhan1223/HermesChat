'use client';

import { useState } from 'react';
import { Menu, X, MessageSquare, Settings, User, LogOut } from 'lucide-react';
import Link from 'next/link';

/**
 * 移动端导航栏
 */
export function MobileNav({ user }: { user: any }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 md:hidden">
        <button onClick={() => setOpen(!open)} className="text-white">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        <h1 className="text-lg font-semibold text-white">HermesChat</h1>
        <div className="h-8 w-8 rounded-full bg-blue-600" />
      </div>

      {open && (
        <div className="fixed inset-0 top-14 z-40 bg-slate-900/95 md:hidden">
          <nav className="space-y-1 p-4">
            <Link href="/chat" className="flex items-center gap-3 rounded-lg px-4 py-3 text-white hover:bg-slate-800">
              <MessageSquare className="h-5 w-5" /> 对话
            </Link>
            <Link href="/admin" className="flex items-center gap-3 rounded-lg px-4 py-3 text-white hover:bg-slate-800">
              <Settings className="h-5 w-5" /> 管理
            </Link>
            <button className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-red-400 hover:bg-slate-800">
              <LogOut className="h-5 w-5" /> 退出
            </button>
          </nav>
        </div>
      )}
    </>
  );
}