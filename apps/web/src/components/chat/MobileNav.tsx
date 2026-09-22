'use client';

import { Menu, LogOut } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';

export function MobileNav({
  user,
  onMenuClick,
  onLogout,
}: {
  user: any;
  onMenuClick?: () => void;
  onLogout?: () => void;
}) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4 md:hidden">
      <button
        type="button"
        onClick={onMenuClick}
        className="text-foreground"
        aria-label="打开菜单"
      >
        <Menu className="h-6 w-6" />
      </button>
      <h1 className="text-lg font-semibold text-foreground">HermesChat</h1>
      <div className="flex items-center gap-2">
        <UserAvatar
          avatarUrl={user?.avatarUrl}
          name={user?.name}
          size="sm"
        />
        <button
          type="button"
          onClick={onLogout}
          className="text-muted-foreground hover:text-foreground"
          aria-label="退出登录"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
