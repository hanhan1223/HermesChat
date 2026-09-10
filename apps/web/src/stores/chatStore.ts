import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';

export interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';
  content: string;
  thinking?: string;
  toolCalls?: any[];
  attachments?: any[];
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
}

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  currentConversationId: string | null;
  conversations: ConversationSummary[];

  sendMessage: (content: string, files?: File[]) => Promise<void>;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  appendToMessage: (id: string, content: string) => void;
  setStreaming: (streaming: boolean) => void;
  createConversation: () => Promise<void>;
  loadConversations: () => Promise<void>;
  switchConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  clearMessages: () => void;
  clearChat: () => void;
}

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isStreaming: false,
  currentConversationId: null,
  conversations: [],

  sendMessage: async (content: string, files?: File[]) => {
    const { currentConversationId, messages, isStreaming } = get();
    if (isStreaming || !content.trim()) return;

    let conversationId = currentConversationId;

    // 自动创建会话
    if (!conversationId) {
      try {
        const created = await apiClient.createConversation({
          title: content.slice(0, 30) || '新对话',
          modelId: 'default',
        });
        conversationId = created?.id || created?.conversation?.id || null;
        if (conversationId) {
          set({ currentConversationId: conversationId });
          await get().loadConversations();
        }
      } catch {
        // 后端不可用时继续用本地会话
      }
    }

    const userMessage: ChatMessage = {
      id: uid('msg'),
      role: 'USER',
      content,
      attachments: files?.map((f) => ({ name: f.name, type: f.type })),
      createdAt: new Date().toISOString(),
    };

    const aiMessage: ChatMessage = {
      id: uid('msg'),
      role: 'ASSISTANT',
      content: '',
      thinking: '',
      toolCalls: [],
      createdAt: new Date().toISOString(),
    };

    set({
      messages: [...messages, userMessage, aiMessage],
      isStreaming: true,
    });

    try {
      const token = apiClient.getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/agent/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            conversationId,
            modelId: 'default',
            content,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`请求失败 (${response.status})`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6));
                handleStreamEvent(event, aiMessage.id, set);
              } catch {
                // ignore malformed SSE chunk
              }
            }
          }
        }
      }
    } catch (error: any) {
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === aiMessage.id
            ? {
                ...m,
                content: `抱歉，发生了错误：${error?.message || '请重试'}`,
              }
            : m
        ),
      }));
    } finally {
      set({ isStreaming: false });
    }
  },

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),

  appendToMessage: (id, content) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + content } : m
      ),
    })),

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  createConversation: async () => {
    set({ currentConversationId: null, messages: [] });
  },

  loadConversations: async () => {
    try {
      const data: any = await apiClient.getConversations();
      const list = Array.isArray(data) ? data : data?.items || data?.content || [];
      set({
        conversations: list.map((c: any) => ({
          id: c.id,
          title: c.title || '未命名对话',
          updatedAt: c.updatedAt || c.createdAt || new Date().toISOString(),
          messageCount: c.messageCount || 0,
        })),
      });
    } catch {
      set({ conversations: [] });
    }
  },

  switchConversation: async (id: string) => {
    set({ currentConversationId: id, messages: [] });
    try {
      const data: any = await apiClient.getMessages(id);
      const list = Array.isArray(data) ? data : data?.items || [];
      set({
        messages: list.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content || '',
          thinking: m.thinking,
          toolCalls: m.toolCalls || [],
          attachments: m.attachments || [],
          createdAt: m.createdAt || new Date().toISOString(),
        })),
      });
    } catch {
      // keep empty messages on failure
    }
  },

  deleteConversation: async (id: string) => {
    const { currentConversationId } = get();
    try {
      await apiClient.deleteConversation(id);
    } catch {
      // still remove locally
    }
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      ...(currentConversationId === id
        ? { currentConversationId: null, messages: [] }
        : {}),
    }));
  },

  renameConversation: async (id: string, title: string) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, title } : c
      ),
    }));
    try {
      await apiClient.renameConversation(id, title);
    } catch {
      // ignore
    }
  },

  clearMessages: () => set({ messages: [] }),

  clearChat: () =>
    set({
      messages: [],
      isStreaming: false,
      currentConversationId: null,
      conversations: [],
    }),
}));

function handleStreamEvent(event: any, messageId: string, set: any) {
  switch (event.type) {
    case 'thinking':
      set((state: ChatState) => ({
        messages: state.messages.map((m) =>
          m.id === messageId
            ? { ...m, thinking: (m.thinking || '') + (event.content || '') }
            : m
        ),
      }));
      break;
    case 'message':
    case 'content':
    case 'delta':
      set((state: ChatState) => ({
        messages: state.messages.map((m) =>
          m.id === messageId
            ? { ...m, content: m.content + (event.content || event.delta || '') }
            : m
        ),
      }));
      break;
    case 'tool_start':
      set((state: ChatState) => ({
        messages: state.messages.map((m) =>
          m.id === messageId
            ? {
                ...m,
                toolCalls: [
                  ...(m.toolCalls || []),
                  {
                    id: uid('tc'),
                    name: event.tool,
                    arguments: event.args || {},
                    status: 'running',
                  },
                ],
              }
            : m
        ),
      }));
      break;
    case 'tool_result':
      set((state: ChatState) => ({
        messages: state.messages.map((m) =>
          m.id === messageId
            ? {
                ...m,
                toolCalls: (m.toolCalls || []).map((tc: any) =>
                  tc.name === event.tool && tc.status === 'running'
                    ? { ...tc, result: event.result, status: 'success' }
                    : tc
                ),
              }
            : m
        ),
      }));
      break;
    case 'tool_error':
      set((state: ChatState) => ({
        messages: state.messages.map((m) =>
          m.id === messageId
            ? {
                ...m,
                toolCalls: (m.toolCalls || []).map((tc: any) =>
                  tc.name === event.tool && tc.status === 'running'
                    ? { ...tc, error: event.error, status: 'error' }
                    : tc
                ),
              }
            : m
        ),
      }));
      break;
    case 'error':
      set((state: ChatState) => ({
        messages: state.messages.map((m) =>
          m.id === messageId
            ? {
                ...m,
                content:
                  m.content ||
                  `抱歉，发生了错误：${event.content || event.error || '请重试'}`,
              }
            : m
        ),
      }));
      break;
  }
}
