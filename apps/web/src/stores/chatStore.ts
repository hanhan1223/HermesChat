import { create } from 'zustand';

/**
 * 聊天状态管理 - 增强版
 * 支持：对话历史、模型选择、多模态消息
 */
interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  currentConversationId: string | null;
  conversations: ConversationSummary[];
  selectedModel: string;

  // Actions
  sendMessage: (content: string, files?: any[]) => Promise<void>;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  appendToMessage: (id: string, content: string) => void;
  setStreaming: (streaming: boolean) => void;
  createConversation: () => void;
  loadConversations: () => Promise<void>;
  clearMessages: () => void;
  setSelectedModel: (model: string) => void;
}

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

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isStreaming: false,
  currentConversationId: null,
  conversations: [],
  selectedModel: 'gpt-4o',

  sendMessage: async (content: string, files?: any[]) => {
    const { currentConversationId, messages } = get();

    // 添加用户消息
    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'USER',
      content,
      attachments: files?.map((f) => ({
        name: f.name,
        type: f.type,
        size: f.size,
      })),
      createdAt: new Date().toISOString(),
    };
    set({ messages: [...messages, userMessage], isStreaming: true });

    // 创建 AI 消息占位
    const aiMessage: ChatMessage = {
      id: 'msg_' + (Date.now() + 1),
      role: 'ASSISTANT',
      content: '',
      thinking: '',
      toolCalls: [],
      createdAt: new Date().toISOString(),
    };
    set({ messages: [...get().messages, aiMessage] });

    try {
      // 调用 API
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: currentConversationId,
          modelId: get().selectedModel,
          content,
        }),
      });

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
                handleStreamEvent(event, aiMessage.id, set, get);
              } catch {}
            }
          }
        }
      }
    } catch (error) {
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === aiMessage.id
            ? { ...m, content: '抱歉，发生了错误，请重试。' }
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
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),

  appendToMessage: (id, content) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + content } : m
      ),
    })),

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  createConversation: () => {
    set({
      currentConversationId: 'conv_' + Date.now(),
      messages: [],
    });
  },

  loadConversations: async () => {
    // TODO: 从 API 加载
    set({ conversations: [] });
  },

  clearMessages: () => set({ messages: [] }),

  setSelectedModel: (model) => set({ selectedModel: model }),
}));

/**
 * 处理流式事件
 */
function handleStreamEvent(
  event: any,
  messageId: string,
  set: any,
  get: any
) {
  switch (event.type) {
    case 'thinking':
      set((state: ChatState) => ({
        messages: state.messages.map((m) =>
          m.id === messageId
            ? { ...m, thinking: (m.thinking || '') + event.content }
            : m
        ),
      }));
      break;
    case 'message':
      set((state: ChatState) => ({
        messages: state.messages.map((m) =>
          m.id === messageId
            ? { ...m, content: m.content + event.content }
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
                    id: 'tc_' + Date.now(),
                    name: event.tool,
                    arguments: event.args,
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
                  tc.name === event.tool
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
                  tc.name === event.tool
                    ? { ...tc, error: event.error, status: 'error' }
                    : tc
                ),
              }
            : m
        ),
      }));
      break;
  }
}
