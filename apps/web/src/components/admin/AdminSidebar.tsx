'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users, CreditCard, Brain, Cpu, BarChart3, Link as LinkIcon, Settings
} from 'lucide-react';

const navItems = [
  { href: '/admin', label: '概览', icon: BarChart3 },
  { href: '/admin/users', label: '用户管理', icon: Users },
  { href: '/admin/credits', label: '积分管理', icon: CreditCard },
  { href: '/admin/models', label: '模型池', icon: Cpu },
  { href: '/admin/skills', label: 'Skill 管理', icon: Brain },
  { href: '/admin/tokens', label: 'Token 统计', icon: BarChart3 },
  { href: '/admin/mcp', label: 'MCP 管理', icon: LinkIcon },
];

/**
 * 管理后台侧边栏
 */
export default function AdminSidebar({ user }: { user: any }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-900">
      {/* Logo */}
      <div className="border-b border-slate-800 px-6 py-4">
        <h1 className="text-xl font-bold text-white">HermesChat</h1>
        <p className="text-xs text-slate-400">管理后台</p>
      </div>

      {/* 导航 */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={lex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 用户信息 */}
      <div className="border-t border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="flex-1 truncate">
            <p className="truncate text-sm text-white">{user?.name}</p>
            <p className="truncate text-xs text-slate-400">{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}