'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ThinkingBlock } from '@/components/chat/ThinkingBlock';
import { ToolCallCard, type ToolCallRecord } from '@/components/chat/ToolCallCard';
import { RichContent } from '@/components/chat/RichContent';
import { ImageBlock, CopyButton } from '@/components/chat/CodeBlock';
import {
  CitationText,
  type CitationSource,
} from '@/components/chat/CitationText';
import { Check, Copy, Sparkles } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';

export interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';
  content: string;
  thinking?: string;
  toolCalls?: ToolCallRecord[];
  attachments?: any[];
  createdAt: string;
  sources?: CitationSource[];
  sourceMapping?: Record<string, number>;
}

interface MessageListProps {
  messages: Message[];
  onCitationClick?: (source: CitationSource) => void;
  /** 当前用户头像 */
  userAvatar?: string | null;
  userName?: string | null;
}

/**
 * 对话消息区 — Codex / ChatGPT 风格
 * 用户：右侧浅灰气泡；AI：左侧标识 + 正文，无厚重边框
 */
export function MessageList({ messages, onCitationClick, userAvatar, userName }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background">
            <Sparkles className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">开始对话</h2>
          <p className="text-sm text-muted-foreground">有任何问题，都可以问我</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-1 py-2">
      {messages.map((msg) => (
        <MessageItem
          key={msg.id}
          message={msg}
          onCitationClick={onCitationClick}
          userAvatar={userAvatar}
          userName={userName}
        />
      ))}
    </div>
  );
}

function MessageItem({
  message,
  onCitationClick,
  userAvatar,
  userName,
}: {
  message: Message;
  onCitationClick?: (source: CitationSource) => void;
  userAvatar?: string | null;
  userName?: string | null;
}) {
  const isUser = message.role === 'USER';
  const [copied, setCopied] = useState(false);

  const hasCitations =
    !isUser &&
    ((message.sourceMapping && Object.keys(message.sourceMapping).length > 0) ||
      /\[\[ID:\s*[^\]]+\]\]/.test(message.content || ''));

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(message.content || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  // 用户：右对齐气泡 + 头像
  if (isUser) {
    return (
      <div className="flex items-start justify-end gap-2.5">
        <div className="flex max-w-[85%] flex-col items-end gap-1">
          <div className="rounded-3xl rounded-br-lg bg-muted px-4 py-2.5 text-[0.95rem] leading-relaxed text-foreground">
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          </div>
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex max-w-full flex-col items-end gap-1.5">
              {message.attachments.map((att, i) => {
                const isImg =
                  att.type === 'image' ||
                  /\.(png|jpe?g|gif|webp|svg)$/i.test(att.name || att.url || '');
                if (isImg && (att.url || att.path)) {
                  return (
                    <ImageBlock
                      key={i}
                      src={att.url || att.path}
                      alt={att.name}
                      name={att.name}
                      className="max-w-[280px]"
                    />
                  );
                }
                return (
                  <span
                    key={i}
                    className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-muted-foreground"
                  >
                    {att.name}
                  </span>
                );
              })}
            </div>
          )}
          {message.createdAt && (
            <span className="pr-1 text-[11px] text-muted-foreground/70">
              {formatTime(message.createdAt)}
            </span>
          )}
        </div>
        <UserAvatar
          avatarUrl={userAvatar}
          name={userName}
          size="sm"
          className="mt-0.5"
        />
      </div>
    );
  }

  // AI：左对齐，标识 + 正文
  return (
    <div className="group flex gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
        <Sparkles className="h-3.5 w-3.5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-[13px] font-semibold text-foreground">Agent</span>
          {message.createdAt && (
            <span className="text-[11px] text-muted-foreground/70">
              {formatTime(message.createdAt)}
            </span>
          )}
          <button
            type="button"
            onClick={copyText}
            title="复制全文"
            className="ml-auto rounded-md p-1 text-muted-foreground/50 opacity-0 transition hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 sm:opacity-60"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {message.thinking && (
          <div className="mb-3">
            <ThinkingBlock content={message.thinking} />
          </div>
        )}

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-3 space-y-2">
            {message.toolCalls.map((tc) => (
              <ToolCallCard key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {message.content && (
          <div className="min-w-0 break-words text-foreground">
            <RichContent
              content={message.content}
              sourceMapping={message.sourceMapping}
              sources={message.sources}
              onCitationClick={onCitationClick}
            />
          </div>
        )}

        {hasCitations && message.sources && message.sources.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {message.sources.map((src, i) => (
              <button
                key={src.id}
                type="button"
                onClick={() => onCitationClick?.(src)}
                title={src.title || src.id}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                <span className="font-medium text-foreground/70">
                  {message.sourceMapping?.[src.id] ?? i + 1}
                </span>
                <span className="max-w-[140px] truncate">
                  {src.title || src.id}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}
