'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/stores/chatStore';
import { ChatInput } from '@/components/chat/ChatInput';
import { MessageList } from '@/components/chat/MessageList';
import { ConversationSidebar } from '@/components/chat/ConversationSidebar';
import { ShareDialog } from '@/components/chat/ShareDialog';
import { MobileNav } from '@/components/chat/MobileNav';
import { ThemeIconButton } from '@/components/theme/ThemeToggle';
import { Share2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

function readStoredUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function ChatPage() {
  const router = useRouter();
  const {
    messages,
    isStreaming,
    conversations,
    currentConversationId,
    sendMessage,
    loadConversations,
    createConversation,
    switchConversation,
    deleteConversation,
    renameConversation,
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = readStoredUser();
    if (!token) {
      router.replace('/login');
      return;
    }
    apiClient.setToken(token);
    setUser(storedUser);
    setAuthChecked(true);
    loadConversations();
  }, [router, loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    apiClient.setToken(null);
    useChatStore.getState().clearChat();
    router.replace('/login');
  }, [router]);

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        加载中...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <div className="hidden md:block">
        <ConversationSidebar
          conversations={conversations}
          currentId={currentConversationId}
          onNewChat={createConversation}
          onDeleteChat={deleteConversation}
          onRenameChat={renameConversation}
          onSelectChat={switchConversation}
          user={user ? { name: user.name || '用户', email: user.email } : undefined}
          onLogout={handleLogout}
        />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <ConversationSidebar
              conversations={conversations}
              currentId={currentConversationId}
              onNewChat={() => {
                createConversation();
                setSidebarOpen(false);
              }}
              onDeleteChat={deleteConversation}
              onRenameChat={renameConversation}
              onSelectChat={(id) => {
                switchConversation(id);
                setSidebarOpen(false);
              }}
              user={user ? { name: user.name || '用户', email: user.email } : undefined}
              onLogout={handleLogout}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav
          user={user}
          onMenuClick={() => setSidebarOpen((v) => !v)}
          onLogout={handleLogout}
        />

        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <h1 className="text-lg font-semibold text-foreground">HermesChat</h1>
          <div className="flex items-center gap-1.5">
            {currentConversationId && (
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Share2 className="h-3.5 w-3.5" />
                分享
              </button>
            )}
            <ThemeIconButton />
            <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              Agent
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-3xl">
            <MessageList messages={messages} />
            <div ref={messagesEndRef} />
          </div>
        </main>

        <footer className="border-t border-border p-4">
          <div className="mx-auto max-w-3xl">
            <ChatInput onSend={sendMessage} disabled={isStreaming} />
          </div>
        </footer>
      </div>

      {shareOpen && currentConversationId && (
        <ShareDialog
          conversationId={currentConversationId}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}
