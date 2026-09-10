'use client';

import { cn } from '@/lib/utils';
import { ThinkingBlock } from '@/components/chat/ThinkingBlock';
import { ToolCallCard, type ToolCallRecord } from '@/components/chat/ToolCallCard';

export interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';
  content: string;
  thinking?: string;
  toolCalls?: ToolCallRecord[];
  attachments?: any[];
  createdAt: string;
}

export function MessageList({ messages }: { messages: Message[] }) {
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
        <MessageItem key={msg.id} message={msg} />
      ))}
    </div>
  );
}

function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === 'USER';

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
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </p>
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
