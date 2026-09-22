'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/stores/chatStore';
import { ChatInput } from '@/components/chat/ChatInput';
import { MessageList } from '@/components/chat/MessageList';
import { ConversationSidebar } from '@/components/chat/ConversationSidebar';
import { ShareDialog } from '@/components/chat/ShareDialog';
import { MobileNav } from '@/components/chat/MobileNav';
import { PreviewPanel, SourceSheet } from '@/components/chat/PreviewPanel';
import { FileCloud } from '@/components/chat/FileCloud';
import { ThemeIconButton } from '@/components/theme/ThemeToggle';
import {
  Share2,
  Download,
  BookOpen,
  PanelRightClose,
  PanelRightOpen,
  FileText,
  FileJson,
  Printer,
  FolderOpen,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { CitationSource } from '@/components/chat/CitationText';
import {
  downloadMarkdown,
  downloadJSON,
  exportAsPDF,
  type ExportMessage,
} from '@/lib/export';

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
  const [rightPanelMode, setRightPanelMode] = useState<'preview' | 'files'>('preview');
  const {
    messages,
    isStreaming,
    pendingMessages,
    conversations,
    currentConversationId,
    sources,
    selectedSource,
    previewOpen,
    sendMessage,
    loadConversations,
    createConversation,
    switchConversation,
    deleteConversation,
    renameConversation,
    selectSource,
    setPreviewOpen,
    clearMessages,
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  /** 移动端抽屉侧边栏 */
  const [sidebarDrawerOpen, setSidebarDrawerOpen] = useState(false);
  /** 平板端（md-lg）可折叠侧边栏 */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  /** 导出菜单 */
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  /** 移动端来源弹层 */
  const [sourceSheetOpen, setSourceSheetOpen] = useState(false);

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

  // 点击外部关闭导出菜单
  useEffect(() => {
    if (!exportMenuOpen) return;
    const close = () => setExportMenuOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [exportMenuOpen]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    apiClient.setToken(null);
    useChatStore.getState().clearChat();
    router.replace('/login');
  }, [router]);

  /** 点击引用上标 */
  const handleCitationClick = useCallback(
    (source: CitationSource) => {
      selectSource(source);
      // 小屏弹出底部面板；大屏由 PreviewPanel 承接
      if (typeof window !== 'undefined' && window.innerWidth < 1280) {
        setSourceSheetOpen(true);
      }
    },
    [selectSource]
  );

  /** 构建导出数据 */
  const buildExportOptions = useCallback(() => {
    const conv = conversations.find((c) => c.id === currentConversationId);
    return {
      conversationTitle: conv?.title || '对话记录',
      messages: messages.map(
        (m): ExportMessage => ({
          id: m.id,
          role: m.role,
          content: m.content,
          thinking: m.thinking,
          createdAt: m.createdAt,
          sources: m.sources,
          sourceMapping: m.sourceMapping,
        })
      ),
    };
  }, [conversations, currentConversationId, messages]);

  const handleExportMarkdown = useCallback(() => {
    downloadMarkdown(buildExportOptions());
    setExportMenuOpen(false);
  }, [buildExportOptions]);

  const handleExportJSON = useCallback(() => {
    downloadJSON(buildExportOptions());
    setExportMenuOpen(false);
  }, [buildExportOptions]);

  const handleExportPDF = useCallback(() => {
    exportAsPDF(buildExportOptions());
    setExportMenuOpen(false);
  }, [buildExportOptions]);

  /** 处理输入框命令（/new /clear /export ...） */
  const handleCommand = useCallback(
    (command: string): boolean => {
      switch (command) {
        case '/new':
          createConversation();
          return true;
        case '/clear':
          clearMessages();
          return true;
        case '/export':
          downloadMarkdown(buildExportOptions());
          return true;
        case '/help':
          // 帮助：填入提示，不拦截
          return false;
        default:
          return false;
      }
    },
    [createConversation, clearMessages, buildExportOptions]
  );

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        加载中...
      </div>
    );
  }

  const sidebarProps = {
    conversations,
    currentId: currentConversationId,
    onNewChat: createConversation,
    onDeleteChat: deleteConversation,
    onRenameChat: renameConversation,
    onSelectChat: switchConversation,
    onExport: () => downloadMarkdown(buildExportOptions()),
    user: user
      ? { name: user.name || '用户', email: user.email, avatarUrl: user.avatarUrl }
      : undefined,
    onLogout: handleLogout,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ===== 左侧会话列表 ===== */}
      {/* 桌面端 ≥ md：常驻；md-lg 可折叠；移动端走抽屉 */}
      <div
        className={`hidden shrink-0 transition-all duration-200 md:block ${
          sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-64'
        }`}
      >
        <ConversationSidebar {...sidebarProps} />
      </div>

      {/* 移动端抽屉侧边栏（< md） */}
      {sidebarDrawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarDrawerOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full">
            <ConversationSidebar
              {...sidebarProps}
              onNewChat={() => {
                createConversation();
                setSidebarDrawerOpen(false);
              }}
              onSelectChat={(id) => {
                switchConversation(id);
                setSidebarDrawerOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* ===== 中间主区域 ===== */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 移动端顶栏（< md） */}
        <MobileNav
          user={user}
          onMenuClick={() => setSidebarDrawerOpen((v) => !v)}
          onLogout={handleLogout}
        />

        {/* 桌面端顶栏（≥ md） */}
        <header className="hidden h-14 shrink-0 items-center justify-between border-b border-border px-4 md:flex">
          <div className="flex items-center gap-2">
            {/* md-lg 侧边栏折叠开关 */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
              title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
            >
              {sidebarCollapsed ? (
                <PanelRightOpen className="h-4 w-4 -scale-x-100" />
              ) : (
                <PanelRightClose className="h-4 w-4 -scale-x-100" />
              )}
            </button>
            <h1 className="text-lg font-semibold text-foreground">HermesChat</h1>
          </div>
          <div className="flex items-center gap-1.5">
            {/* 引用来源入口（有 sources 且 < xl 时显示） */}
            {sources.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  selectSource(sources[0]);
                  setSourceSheetOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground xl:hidden"
              >
                <BookOpen className="h-3.5 w-3.5" />
                来源 {sources.length}
              </button>
            )}

            {/* 预览面板开关（≥ xl） */}
            <button
              type="button"
              onClick={() => setPreviewOpen(!previewOpen)}
              className="hidden rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground xl:flex xl:items-center xl:gap-1.5"
              title={previewOpen ? '收起预览面板' : '打开预览面板'}
            >
              {previewOpen ? (
                <PanelRightClose className="h-3.5 w-3.5" />
              ) : (
                <PanelRightOpen className="h-3.5 w-3.5" />
              )}
              预览
            </button>

            {/* 导出菜单 */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExportMenuOpen((v) => !v);
                }}
                disabled={messages.length === 0}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" />
                导出
              </button>
              {exportMenuOpen && (
                <div
                  className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-border bg-popover p-1 shadow-lg animate-scale-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={handleExportMarkdown}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-popover-foreground hover:bg-accent"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    导出 Markdown
                  </button>
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-popover-foreground hover:bg-accent"
                  >
                    <FileJson className="h-4 w-4 text-muted-foreground" />
                    导出 JSON
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-popover-foreground hover:bg-accent"
                  >
                    <Printer className="h-4 w-4 text-muted-foreground" />
                    导出 PDF
                  </button>
                </div>
              )}
            </div>

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

        {/* 消息列表 */}
        <main className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-3xl">
            <MessageList
              messages={messages}
              onCitationClick={handleCitationClick}
              userAvatar={user?.avatarUrl}
              userName={user?.name}
            />
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* 底部输入栏（移动端也固定在底部，由 flex 布局保证） */}
        <footer className="shrink-0 border-t border-border bg-background p-3 md:p-4">
          <div className="mx-auto max-w-3xl">
            <ChatInput
              onSend={sendMessage}
              disabled={false}
              placeholder={isStreaming ? 'AI 正在回复，输入内容可作为引导...' : '发送消息...'}
              historySuggestions={conversations.map((c) => c.title)}
              onCommand={handleCommand}
            />
          </div>
        </footer>
      </div>

      {/* ===== 右侧面板（≥ xl，可折叠）：预览 / 云盘 ===== */}
      {previewOpen && (
        <div className="hidden xl:flex w-80 shrink-0 flex-col border-l border-border bg-background">
          {/* 面板切换 Tab */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setRightPanelMode('preview')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                rightPanelMode === 'preview'
                  ? 'text-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BookOpen className="inline w-3.5 h-3.5 mr-1" />
              来源预览
            </button>
            <button
              onClick={() => setRightPanelMode('files')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                rightPanelMode === 'files'
                  ? 'text-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FolderOpen className="inline w-3.5 h-3.5 mr-1" />
              会话云盘
            </button>
            <button
              onClick={() => setPreviewOpen(false)}
              className="px-3 py-2 text-muted-foreground hover:text-foreground"
            >
              <PanelRightClose className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* 面板内容 */}
          <div className="flex-1 overflow-hidden">
            {rightPanelMode === 'preview' ? (
              <PreviewPanel
                open={true}
                onClose={() => setPreviewOpen(false)}
                sources={sources}
                selectedSource={selectedSource}
                onSelectSource={selectSource}
              />
            ) : (
              <FileCloud conversationId={currentConversationId} />
            )}
          </div>
        </div>
      )}

      {/* 移动端/平板端来源弹层 */}
      <SourceSheet
        open={sourceSheetOpen}
        sources={sources}
        selectedSource={selectedSource}
        onSelectSource={selectSource}
        onClose={() => setSourceSheetOpen(false)}
      />

      {shareOpen && currentConversationId && (
        <ShareDialog
          conversationId={currentConversationId}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}
