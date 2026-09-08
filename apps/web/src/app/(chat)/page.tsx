'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';
import { EmptyState, TypingIndicator } from './EmptyState';
import { ModelSelector } from './ModelSelector';
import { ConversationSidebar } from './ConversationSidebar';
import { Menu, Sidebar as SidebarIcon, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 对话页面 - 用户侧核心交互
 * 参考 ChatGPT & Codex 设计
 * 支持：流式对话、思考展示、工具执行可视化、多模态输入、对话历史
 */
export default function ChatPage() {
  const { messages, isStreaming, sendMessage, conversations, currentConversationId, createConversation } = useChatStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 处理建议提示词选择
  const handleSelectPrompt = useCallback(
    (prompt: string) => {
      sendMessage(prompt);
    },
    [sendMessage]
  );

  // 新建对话
  const handleNewChat = useCallback(() => {
    createConversation();
  }, [createConversation]);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Desktop */}
      <div
        className={cn(
          'hidden border-r border-border bg-sidebar transition-all duration-300 lg:block',
          sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
        )}
      >
        <ConversationSidebar
          conversations={conversations}
          currentId={currentConversationId}
          onNewChat={handleNewChat}
          onDeleteChat={(id) => {
            // TODO: 实现删除
            console.log('Delete:', id);
          }}
          onRenameChat={(id, title) => {
            // TODO: 实现重命名
            console.log('Rename:', id, title);
          }}
          user={{
            name: '用户',
            email: 'user@hermes.chat',
          }}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <ConversationSidebar
          conversations={conversations}
          currentId={currentConversationId}
          onNewChat={handleNewChat}
          onDeleteChat={(id) => console.log('Delete:', id)}
          onRenameChat={(id, title) => console.log('Rename:', id, title)}
          user={{
            name: '用户',
            email: 'user@hermes.chat',
          }}
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col" ref={mainRef}>
        {/* Header */}
        <header className="flex h-12 items-center justify-between border-b border-border bg-background/80 px-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            {/* Sidebar Toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {sidebarOpen ? (
                <SidebarIcon className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </button>

            {/* Model Selector */}
            <ModelSelector
              selectedModel={selectedModel}
              onSelect={setSelectedModel}
            />
          </div>

          <div className="flex items-center gap-2">
            {/* New Chat Button (Mobile) */}
            <button
              onClick={handleNewChat}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
            >
              <Plus className="h-4 w-4" />
            </button>

            {/* User Avatar */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-medium text-white">
              U
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {messages.length === 0 ? (
            <EmptyState onSelectPrompt={handleSelectPrompt} />
          ) : (
            <div className="mx-auto max-w-chat px-4 py-6">
              <MessageList messages={messages} isStreaming={isStreaming} />
              {isStreaming && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Input Area */}
        <footer className="border-t border-border bg-background/80 px-4 py-3 backdrop-blur-sm">
          <div className="mx-auto max-w-chat">
            <ChatInput
              onSend={sendMessage}
              disabled={isStreaming}
              placeholder="发送消息给 Hermes..."
              suggestions={[
                '帮我写一个 Python 爬虫',
                '解释量子计算的基本原理',
                '帮我优化这段代码',
                '总结今天的会议记录',
              ]}
            />
          </div>
        </footer>
      </div>
    </div>
  );
}
