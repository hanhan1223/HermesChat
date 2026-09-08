'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Copy,
  Check,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Volume2,
  MoreHorizontal,
  User,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThinkingBlock } from './ThinkingBlock';
import { ToolCallCard } from './ToolCallCard';

/**
 * 消息列表组件 - 增强版
 * 支持：消息操作（复制、重新生成、点赞/踩）、流式光标、多模态内容展示
 */
export function MessageList({
  messages,
  isStreaming,
}: {
  messages: Message[];
  isStreaming?: boolean;
}) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      {messages.map((msg, index) => (
        <MessageItem
          key={msg.id}
          message={msg}
          isLast={index === messages.length - 1}
          isStreaming={isStreaming && index === messages.length - 1}
        />
      ))}
    </div>
  );
}

/**
 * 单条消息组件
 */
function MessageItem({
  message,
  isLast,
  isStreaming,
}: {
  message: Message;
  isLast: boolean;
  isStreaming?: boolean;
}) {
  const isUser = message.role === 'USER';
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [showActions, setShowActions] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'group relative rounded-xl px-4 py-3 transition-colors',
        isUser ? 'bg-chat-bubble-user' : 'bg-chat-bubble-assistant hover:bg-chat-bubble-assistant/80'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="shrink-0">
          {isUser ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
              <User className="h-4 w-4" />
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <Bot className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Role Label */}
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {isUser ? '你' : 'Hermes'}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {formatTime(message.createdAt)}
            </span>
          </div>

          {/* Thinking Process */}
          {message.thinking && (
            <ThinkingBlock content={message.thinking} />
          )}

          {/* Tool Calls */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mb-3 space-y-2">
              {message.toolCalls.map((tc) => (
                <ToolCallCard key={tc.id} toolCall={tc} />
              ))}
            </div>
          )}

          {/* Text Content */}
          {message.content && (
            <div className="prose prose-sm prose-invert max-w-none">
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground/90">
                {message.content}
                {isStreaming && isLast && (
                  <span className="ml-0.5 inline-block h-4 w-1.5 animate-blink rounded-sm bg-foreground/70" />
                )}
              </p>
            </div>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.attachments.map((att, i) => (
                <AttachmentPreview key={i} attachment={att} />
              ))}
            </div>
          )}

          {/* Message Actions - Show on Hover (Assistant only) */}
          {!isUser && showActions && (
            <div className="mt-2 flex items-center gap-0.5 animate-fade-in">
              <button
                onClick={handleCopy}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="复制"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="重新生成"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setLiked(liked === true ? null : true)}
                className={cn(
                  'rounded-md p-1.5 transition-colors hover:bg-muted',
                  liked === true ? 'text-success' : 'text-muted-foreground hover:text-foreground'
                )}
                title="有帮助"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setLiked(liked === false ? null : false)}
                className={cn(
                  'rounded-md p-1.5 transition-colors hover:bg-muted',
                  liked === false ? 'text-error' : 'text-muted-foreground hover:text-foreground'
                )}
                title="无帮助"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </button>
              <button
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="朗读"
              >
                <Volume2 className="h-3.5 w-3.5" />
              </button>
              <button
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="分享"
              >
                <Share2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 附件预览组件
 */
function AttachmentPreview({ attachment }: { attachment: any }) {
  if (attachment.type === 'image') {
    return (
      <div className="relative overflow-hidden rounded-lg border border-border">
        <img
          src={attachment.url || attachment.preview}
          alt={attachment.name}
          className="max-h-48 max-w-[200px] object-cover"
        />
      </div>
    );
  }

  if (attachment.type === 'video') {
    return (
      <div className="relative overflow-hidden rounded-lg border border-border">
        <video
          src={attachment.url || attachment.preview}
          controls
          className="max-h-48 max-w-[280px]"
        />
      </div>
    );
  }

  // File
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
        <FileText className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-foreground">
          {attachment.name}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {attachment.size ? formatFileSize(attachment.size) : '文件'}
        </p>
      </div>
    </div>
  );
}

function FileText(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}

/**
 * 格式化时间
 */
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';

  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + 'KB';
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}

export interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';
  content: string;
  thinking?: string;
  toolCalls?: ToolCallRecord[];
  attachments?: AttachmentItem[];
  createdAt: string;
}

export interface ToolCallRecord {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  status: 'pending' | 'running' | 'success' | 'error';
}

export interface AttachmentItem {
  name: string;
  type: 'image' | 'video' | 'file';
  url?: string;
  preview?: string;
  size?: number;
}
