'use client';

import { cn } from '@/lib/utils';
import { ThinkingBlock } from '@/components/chat/ThinkingBlock';
import { ToolCallCard, type ToolCallRecord } from '@/components/chat/ToolCallCard';
import { RichContent } from '@/components/chat/RichContent';
import {
  CitationText,
  type CitationSource,
} from '@/components/chat/CitationText';

export interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';
  content: string;
  thinking?: string;
  toolCalls?: ToolCallRecord[];
  attachments?: any[];
  createdAt: string;
  /** 本条消息引用的来源 */
  sources?: CitationSource[];
  /** doc_id → 展示序号 */
  sourceMapping?: Record<string, number>;
}

interface MessageListProps {
  messages: Message[];
  /** 点击引用上标时回调 */
  onCitationClick?: (source: CitationSource) => void;
}

export function MessageList({ messages, onCitationClick }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center py-24">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">开始对话</h2>
          <p className="mt-2 text-muted-foreground">有任何问题，都可以问我</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {messages.map((msg) => (
        <MessageItem
          key={msg.id}
          message={msg}
          onCitationClick={onCitationClick}
        />
      ))}
    </div>
  );
}

function MessageItem({
  message,
  onCitationClick,
}: {
  message: Message;
  onCitationClick?: (source: CitationSource) => void;
}) {
  const isUser = message.role === 'USER';
  const hasCitations =
    !isUser &&
    (message.sourceMapping && Object.keys(message.sourceMapping).length > 0 ||
      /\[\[ID:\s*[^\]]+\]\]/.test(message.content || ''));

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-emerald-600 text-white'
        )}
      >
        {isUser ? 'U' : 'A'}
      </div>

      <div className={cn('max-w-[85%]', isUser ? 'items-end' : 'items-start')}>
        {message.thinking && <ThinkingBlock content={message.thinking} />}

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-2">
            {message.toolCalls.map((tc) => (
              <ToolCallCard key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {message.content && (
          <div
            className={cn(
              'rounded-3xl px-4 py-3',
              isUser
                ? 'bg-chat-bubble-user text-foreground'
                : 'bg-transparent text-foreground'
            )}
          >
            <RichContent
              content={message.content}
              sourceMapping={message.sourceMapping}
              sources={message.sources}
              onCitationClick={onCitationClick}
            />
          </div>
        )}

        {/* 引用来源角标列表（助手消息） */}
        {hasCitations && message.sources && message.sources.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {message.sources.map((src, i) => (
              <button
                key={src.id}
                type="button"
                onClick={() => onCitationClick?.(src)}
                title={src.title || src.id}
                className="flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-info/40 hover:bg-info/10 hover:text-info"
              >
                <span className="font-medium text-info">
                  {(message.sourceMapping?.[src.id] ?? i + 1)}
                </span>
                <span className="max-w-[120px] truncate">
                  {src.title || src.id}
                </span>
              </button>
            ))}
          </div>
        )}

        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments.map((att, i) => (
              <div
                key={i}
                className="rounded-lg bg-muted px-3 py-1 text-xs text-muted-foreground"
              >
                {att.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
