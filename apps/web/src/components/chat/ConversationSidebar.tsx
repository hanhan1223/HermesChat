'use client';

import { useState } from 'react';
import {
  Plus,
  MessageSquare,
  Search,
  LogOut,
  Trash2,
  Edit3,
  Check,
  X,
  ChevronDown,
  Sparkles,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { SearchBar } from './SearchBar';

export interface Conversation {
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
  onSelectChat?: (id: string) => void;
  /** 导出当前对话 */
  onExport?: () => void;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  onLogout?: () => void;
}

export function ConversationSidebar({
  conversations,
  currentId,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  onSelectChat,
  onExport,
  user,
  onLogout,
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    <aside className="flex h-full w-64 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="p-3">
        <button
          type="button"
          onClick={onNewChat}
          className="flex w-full items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-sidebar-hover active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>新建对话</span>
          <Sparkles className="ml-auto h-3.5 w-3.5 text-info opacity-60" />
        </button>
      </div>

      <div className="px-3 pb-2">
        <SearchBar
          onNavigateToMessage={(conversationId) => {
            onSelectChat?.(conversationId);
          }}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1 scrollbar-thin">
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group} className="mb-2">
            <div className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {group}
            </div>
            <div className="space-y-0.5">
              {items.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    'group relative flex items-center rounded-lg px-2 py-2 text-sm transition-all',
                    currentId === conv.id
                      ? 'bg-sidebar-active text-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground'
                  )}
                >
                  {editingId === conv.id ? (
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
                        className="flex-1 rounded bg-background px-1.5 py-0.5 text-xs text-foreground outline-none ring-1 ring-ring"
                      />
                      <button
                        type="button"
                        onClick={handleConfirmRename}
                        className="rounded p-0.5 text-success hover:bg-success/10"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelRename}
                        className="rounded p-0.5 text-muted-foreground hover:bg-muted"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onSelectChat?.(conv.id)}
                        className="flex flex-1 items-center gap-2 truncate text-left"
                      >
                        <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                        <span className="truncate text-[13px]">{conv.title}</span>
                      </button>
                      <div className="absolute right-1 hidden items-center gap-0.5 rounded-md bg-sidebar p-0.5 group-hover:flex">
                        <button
                          type="button"
                          onClick={() => handleStartRename(conv)}
                          className="rounded p-1 text-muted-foreground hover:bg-sidebar-active hover:text-foreground"
                          title="重命名"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteChat(conv.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
            <MessageSquare className="mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">
              {searchQuery ? '未找到匹配的对话' : '暂无对话记录'}
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-border p-2">
        <div className="px-1 pb-2">
          <ThemeToggle className="w-full justify-between" />
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-sidebar-hover"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-medium text-white">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 truncate">
              <p className="truncate text-sm font-medium text-foreground">
                {user?.name || '用户'}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {user?.email || 'user@hermes.chat'}
              </p>
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform',
                userMenuOpen && 'rotate-180'
              )}
            />
          </button>

          {userMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 rounded-xl border border-border bg-popover p-1 shadow-lg animate-scale-in">
              {onExport && (
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    onExport();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-popover-foreground hover:bg-accent"
                >
                  <Download className="h-4 w-4" />
                  导出当前对话
                </button>
              )}
              <button
                type="button"
                onClick={() => onLogout?.()}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-destructive hover:bg-destructive/10"
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
