'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users, CreditCard, Brain, Cpu, BarChart3, Link as LinkIcon, Search, Settings2, ShoppingCart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

const navItems = [
  { href: '/admin', label: '概览', icon: BarChart3 },
  { href: '/admin/users', label: '用户管理', icon: Users },
  { href: '/admin/credits', label: '积分管理', icon: CreditCard },
  { href: '/admin/billing', label: '计费设置', icon: Settings2 },
  { href: '/admin/purchases', label: '购买申请', icon: ShoppingCart },
  { href: '/admin/models', label: '模型池', icon: Cpu },
  { href: '/admin/search', label: '搜索服务', icon: Search },
  { href: '/admin/skills', label: 'Skill 管理', icon: Brain },
  { href: '/admin/tokens', label: 'Token 统计', icon: BarChart3 },
  { href: '/admin/mcp', label: 'MCP 管理', icon: LinkIcon },
];

export default function AdminSidebar({ user }: { user: any }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-sidebar">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-xl font-bold text-foreground">HermesChat</h1>
        <p className="text-xs text-muted-foreground">管理后台</p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-sidebar-active text-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 px-4 py-3">
        <ThemeToggle className="w-full justify-center" />
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="flex-1 truncate">
            <p className="truncate text-sm text-foreground">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
