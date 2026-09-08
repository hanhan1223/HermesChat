'use client';

import { cn } from '@/lib/utils';

/**
 * 消息列表组件
 */
export function MessageList({ messages }: { messages: Message[] }) {
  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">开始对话</h2>
          <p className="mt-2 text-slate-400">有任何问题，都可以问我</p>
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

/**
 * 单条消息组件
 */
function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === 'USER';

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* 头像 */}
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium',
        isUser ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
      )}>
        {isUser ? 'U' : 'A'}
      </div>

      {/* 消息内容 */}
      <div className={cn('max-w-[80%]', isUser ? 'items-end' : 'items-start')}>
        {/* 思考过程 */}
        {message.thinking && <ThinkingBlock content={message.thinking} />}

        {/* 工具调用 */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-2">
            {message.toolCalls.map((tc) => (
              <ToolCallCard key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {/* 文本内容 */}
        {message.content && (
          <div className={cn(
            'rounded-2xl px-4 py-3',
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-100'
          )}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </p>
          </div>
        )}

        {/* 附件 */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments.map((att, i) => (
              <div key={i} className="rounded-lg bg-slate-800 px-3 py-1 text-xs text-slate-300">
                {att.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';
  content: string;
  thinking?: string;
  toolCalls?: ToolCallRecord[];
  attachments?: any[];
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