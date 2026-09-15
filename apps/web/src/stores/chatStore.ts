import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';

/** 引用来源（知识库检索结果） */
export interface CitationSource {
  id: string;
  title?: string;
  content?: string;
  snippet?: string;
  url?: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';
  content: string;
  thinking?: string;
  toolCalls?: any[];
  attachments?: any[];
  createdAt: string;
  /** 本条消息引用的来源列表 */
  sources?: CitationSource[];
  /** doc_id → 展示序号 */
  sourceMapping?: Record<string, number>;
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

  /** 最近一次回答的全部引用来源 */
  sources: CitationSource[];
  /** 最近一次回答的 doc_id → 序号映射 */
  sourceMapping: Record<string, number>;
  /** 右侧预览面板中选中的来源 */
  selectedSource: CitationSource | null;
  /** 预览面板是否打开 */
  previewOpen: boolean;

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
  /** 选中/取消选中引用来源（点击上标时调用） */
  selectSource: (source: CitationSource | null) => void;
  /** 打开/关闭预览面板 */
  setPreviewOpen: (open: boolean) => void;
  /** 消息队列（流式输出时用户输入的消息排队等待） */
  pendingMessages: string[];
  /** 将消息加入队列 */
  enqueueMessage: (content: string) => void;
  /** 处理队列中的下一条消息 */
  processQueue: () => Promise<void>;
}

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isStreaming: false,
  currentConversationId: null,
  conversations: [],
  sources: [],
  sourceMapping: {},
  selectedSource: null,
  previewOpen: false,
  pendingMessages: [],

  sendMessage: async (content: string, files?: File[]) => {
    const { currentConversationId, messages, isStreaming } = get();
    if (!content.trim()) return;

    // 流式输出中：作为引导消息发送给正在运行的 Agent
    if (isStreaming && currentConversationId) {
      // 显示引导消息在聊天中
      const guidanceMsg: ChatMessage = {
        id: uid('msg'),
        role: 'USER',
        content: `[引导] ${content}`,
        createdAt: new Date().toISOString(),
      };
      set((state) => ({ messages: [...state.messages, guidanceMsg] }));

      // 发送到后端注入正在运行的 Agent
      try {
        const token = apiClient.getToken();
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/agent/guidance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            conversationId: currentConversationId,
            content,
          }),
        });
      } catch {
        // 静默失败，引导消息可能来不及注入
      }
      return;
    }

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

  setStreaming: (streaming) => {
    set({ isStreaming: streaming });
    // 流式输出结束时，自动处理队列中的消息
    if (!streaming) {
      setTimeout(() => { get().processQueue(); }, 100);
    }
  },

  enqueueMessage: (content: string) => {
    set((state) => ({ pendingMessages: [...state.pendingMessages, content] }));
  },

  processQueue: async () => {
    const { pendingMessages, isStreaming } = get();
    if (isStreaming || pendingMessages.length === 0) return;

    const [next, ...rest] = pendingMessages;
    set({ pendingMessages: rest });
    await get().sendMessage(next);
  },

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
    set({
      currentConversationId: id,
      messages: [],
      sources: [],
      sourceMapping: {},
      selectedSource: null,
    });
    try {
      const data: any = await apiClient.getMessages(id);
      const list = Array.isArray(data) ? data : data?.items || [];
      const messages: ChatMessage[] = list.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content || '',
        thinking: m.thinking,
        toolCalls: m.toolCalls || [],
        attachments: m.attachments || [],
        createdAt: m.createdAt || new Date().toISOString(),
        sources: m.sources || undefined,
        sourceMapping: m.sourceMapping || undefined,
      }));
      // 取最后一条带 sources 的消息，恢复全局引用状态
      const lastWithSources = [...messages]
        .reverse()
        .find((m) => m.sources && m.sources.length > 0);
      set({
        messages,
        sources: lastWithSources?.sources || [],
        sourceMapping: lastWithSources?.sourceMapping || {},
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
      sources: [],
      sourceMapping: {},
      selectedSource: null,
      previewOpen: false,
    }),

  selectSource: (source) =>
    set({
      selectedSource: source,
      // 选中来源时自动打开预览面板
      previewOpen: source ? true : get().previewOpen,
    }),

  setPreviewOpen: (open) =>
    set({
      previewOpen: open,
      ...(open ? {} : { selectedSource: null }),
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
    case 'guidance_received':
      // Agent 已消费引导消息，在消息中显示反馈
      set((state: ChatState) => ({
        messages: state.messages.map((m) =>
          m.id === messageId
            ? {
                ...m,
                content: m.content + `\n\n> 💡 已收到引导：${event.content}`,
              }
            : m
        ),
      }));
      break;
    case 'stream_end': {
      // 流结束：携带 sources 与 sourceMapping，写入消息并同步到全局
      const sources: CitationSource[] = Array.isArray(event.sources)
        ? event.sources
        : [];
      const sourceMapping: Record<string, number> = event.sourceMapping || {};
      set((state: ChatState) => ({
        messages: state.messages.map((m) =>
          m.id === messageId
            ? { ...m, sources, sourceMapping }
            : m
        ),
        sources,
        sourceMapping,
      }));
      break;
    }
    case 'sources':
      // 兼容：部分后端在 content 阶段就推送 sources
      if (Array.isArray(event.sources)) {
        set((state: ChatState) => ({
          sources: event.sources,
          sourceMapping: event.sourceMapping || state.sourceMapping,
        }));
      }
      break;
  }
}
