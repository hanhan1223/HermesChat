import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, MessageSquare, FileText } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

/**
 * 全文搜索组件
 * 支持搜索消息内容和会话标题，显示高亮结果
 */
export function SearchBar({ onNavigateToMessage }: {
  onNavigateToMessage?: (conversationId: string, messageId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'messages' | 'conversations'>('messages');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 防抖搜索
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setConversations([]);
      return;
    }

    setLoading(true);
    try {
      const [msgResults, convResults] = await Promise.allSettled([
        apiClient.searchMessages(q, { limit: 10 }),
        apiClient.searchConversations(q, { limit: 5 }),
      ]);

      if (msgResults.status === 'fulfilled') {
        setResults(Array.isArray(msgResults.value) ? msgResults.value : []);
      }
      if (convResults.status === 'fulfilled') {
        setConversations(Array.isArray(convResults.value) ? convResults.value : []);
      }
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  // 快捷键 Ctrl+K / Cmd+K 打开搜索
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const highlightHtml = (html: string) => {
    // 安全地渲染高亮（后端已用 <mark> 标记）
    return { __html: html };
  };

  return (
    <>
      {/* 搜索触发按钮 */}
      <button
        onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 100); }}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <Search className="w-4 h-4" />
        <span className="flex-1 text-left">搜索对话...</span>
        <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">⌘K</kbd>
      </button>

      {/* 搜索弹窗 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/50" onClick={() => setIsOpen(false)}>
          <div
            className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 搜索输入框 */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索消息内容或会话标题..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                autoFocus
              />
              {loading && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab 切换 */}
            <div className="flex gap-1 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('messages')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  activeTab === 'messages'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                消息 ({results.length})
              </button>
              <button
                onClick={() => setActiveTab('conversations')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  activeTab === 'conversations'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                会话 ({conversations.length})
              </button>
            </div>

            {/* 搜索结果 */}
            <div className="max-h-[50vh] overflow-y-auto">
              {activeTab === 'messages' && (
                <div className="p-2">
                  {results.length === 0 && query && !loading && (
                    <p className="text-center text-sm text-gray-400 py-8">没有找到匹配的消息</p>
                  )}
                  {results.map((r) => (
                    <button
                      key={r.messageId}
                      onClick={() => {
                        onNavigateToMessage?.(r.conversationId, r.messageId);
                        setIsOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500 truncate">{r.conversationTitle}</span>
                        <span className="text-xs text-gray-400 ml-auto">{r.role}</span>
                      </div>
                      <p
                        className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2"
                        dangerouslySetInnerHTML={highlightHtml(r.highlighted || r.content)}
                      />
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'conversations' && (
                <div className="p-2">
                  {conversations.length === 0 && query && !loading && (
                    <p className="text-center text-sm text-gray-400 py-8">没有找到匹配的会话</p>
                  )}
                  {conversations.map((c) => (
                    <button
                      key={c.conversationId}
                      onClick={() => {
                        onNavigateToMessage?.(c.conversationId, '');
                        setIsOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-3 h-3 text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{c.title}</span>
                        <span className="text-xs text-gray-400 ml-auto">{c.messageCount} 条消息</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
