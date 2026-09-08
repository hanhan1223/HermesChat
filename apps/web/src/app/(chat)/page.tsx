'use client';

import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { ThinkingBlock } from './ThinkingBlock';
import { ToolCallCard } from './ToolCallCard';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';

/**
 * 对话页面 - 用户侧核心交互
 * 支持：流式对话、思考展示、工具执行可视化、多模态输入
 */
export default function ChatPage() {
  const { messages, isStreaming, sendMessage } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex h-screen flex-col bg-slate-950">
      {/* 顶部栏 */}
      <header className="flex h-14 items-center justify-between border-b border-slate-800 px-4">
        <h1 className="text-lg font-semibold text-white">HermesChat</h1>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
            GPT-4o
          </span>
        </div>
      </header>

      {/* 消息列表 */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl">
          <MessageList messages={messages} />
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* 输入区域 */}
      <footer className="border-t border-slate-800 p-4">
        <div className="mx-auto max-w-3xl">
          <ChatInput onSend={sendMessage} disabled={isStreaming} />
        </div>
      </footer>
    </div>
  );
}