'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Plus,
  MessageSquare,
  Search,
  Settings,
  LogOut,
  User,
  Trash2,
  Edit3,
  Check,
  X,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentId: string | null;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, title: string) => void;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

/**
 * 对话侧边栏 - ChatGPT 风格
 * 支持：新建对话、历史列表、搜索、重命名、删除、用户菜单
 */
export function ConversationSidebar({
  conversations,
  currentId,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  user,
}: ConversationSidebarProps) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 按日期分组
  const grouped = groupByDate(filteredConversations);

  const handleStartRename = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleConfirmRename = () => {
    if (editingId && editTitle.trim()) {
      onRenameChat(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditTitle('');
  };

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar border-r-sidebar-border">
      {/* Header - New Chat Button */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="flex w-full items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-all hover:bg-sidebar-foreground/10 hover:border-sidebar-foreground/20 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>新建对话</span>
          <Sparkles className="ml-auto h-3.5 w-3.5 text-info opacity-60" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索对话..."
            className="w-full rounded-md bg-muted/50 py-2 pl-8 pr-3 text-xs text-sidebar-foreground placeholder-muted-foreground outline-none ring-1 ring-transparent transition-all focus:bg-muted focus:ring-ring"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-1">
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group} className="mb-2">
            <div className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
              {group}
            </div>
            <div className="space-y-0.5">
              {items.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    'group relative flex items-center rounded-lg px-2 py-2 text-sm transition-all',
                    currentId === conv.id
                      ? 'bg-sidebar-foreground/10 text-sidebar-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground'
                  )}
                >
                  {editingId === conv.id ? (
                    // Edit Mode
                    <div className="flex flex-1 items-center gap-1">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleConfirmRename();
                          if (e.key === 'Escape') handleCancelRename();
                        }}
                        autoFocus
                        className="flex-1 rounded bg-muted px-1.5 py-0.5 text-xs text-sidebar-foreground outline-none ring-1 ring-ring"
                      />
                      <button
                        onClick={handleConfirmRename}
                        className="rounded p-0.5 text-success hover:bg-success/10"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        onClick={handleCancelRename}
                        className="rounded p-0.5 text-muted-foreground hover:bg-muted"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    // Display Mode
                    <>
                      <Link
                        href={/chat/}
                        className="flex flex-1 items-center gap-2 truncate"
                      >
                        <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                        <span className="truncate text-[13px]">{conv.title}</span>
                      </Link>
                      {/* Actions - Show on Hover */}
                      <div className="absolute right-1 hidden items-center gap-0.5 rounded-md bg-sidebar p-0.5 group-hover:flex">
                        <button
                          onClick={() => handleStartRename(conv)}
                          className="rounded p-1 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-foreground/10"
                          title="重命名"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => onDeleteChat(conv.id)}
                          className="rounded p-1 text-muted-foreground hover:text-error hover:bg-error/10"
                          title="删除"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredConversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground/50">
              {searchQuery ? '未找到匹配的对话' : '暂无对话记录'}
            </p>
          </div>
        )}
      </div>

      {/* User Section */}
      <div className="border-t border-sidebar-border p-2">
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-sidebar-foreground/5"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-medium text-white">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 truncate">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {user?.name || '用户'}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {user?.email || 'user@hermes.chat'}
              </p>
            </div>
            <ChevronDown className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              userMenuOpen && 'rotate-180'
            )} />
          </button>

          {/* User Menu Dropdown */}
          {userMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-sidebar-border bg-sidebar p-1 shadow-elevated animate-scale-in">
              <Link
                href="/settings"
                className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-foreground/5"
              >
                <Settings className="h-4 w-4" />
                设置
              </Link>
              <button
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-error hover:bg-error/10"
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

/**
 * 按日期分组对话
 */
function groupByDate(conversations: Conversation[]): Record<string, Conversation[]> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const sevenDaysAgo = new Date(today.getTime() - 7 * 86400000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000);

  const groups: Record<string, Conversation[]> = {};

  conversations.forEach((conv) => {
    const date = new Date(conv.updatedAt);
    let group: string;

    if (date >= today) {
      group = '今天';
    } else if (date >= yesterday) {
      group = '昨天';
    } else if (date >= sevenDaysAgo) {
      group = '最近 7 天';
    } else if (date >= thirtyDaysAgo) {
      group = '最近 30 天';
    } else {
      group = '更早';
    }

    if (!groups[group]) groups[group] = [];
    groups[group].push(conv);
  });

  return groups;
}
