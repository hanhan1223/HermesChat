'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  CreditCard,
  Brain,
  Cpu,
  BarChart3,
  Link as LinkIcon,
  Settings,
  Home,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
 * 管理后台侧边栏 - 增强版
 */
export default function AdminSidebar({ user }: { user: any }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="border-b border-border px-5 py-4">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <span className="text-sm font-bold text-white">H</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-card-foreground">HermesChat</h1>
            <p className="text-[10px] text-muted-foreground">管理后台</p>
          </div>
        </Link>
      </div>

      {/* Quick Links */}
      <div className="px-3 py-2">
        <Link
          href="/chat"
          className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-card-foreground"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          返回对话
          <ChevronRight className="ml-auto h-3 w-3" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto scrollbar-thin px-3 py-2">
        <div className="mb-2 px-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
          管理菜单
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-all',
                active
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-card-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-medium text-white">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="flex-1 truncate">
            <p className="truncate text-sm font-medium text-card-foreground">
              {user?.name || 'Admin'}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {user?.role || 'SUPER_ADMIN'}
            </p>
          </div>
          <button className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-card-foreground">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
