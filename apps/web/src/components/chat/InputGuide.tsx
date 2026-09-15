'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  FileText,
  Clock,
  Command,
  AtSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';

/** 引导项类型 */
export type GuideItemType = 'command' | 'knowledge' | 'history';

/** 引导项 */
export interface GuideItem {
  id: string;
  type: GuideItemType;
  label: string;
  description?: string;
  /** 实际插入/执行的值 */
  value: string;
  icon?: React.ReactNode;
}

/** 内置命令列表 */
export const BUILTIN_COMMANDS: GuideItem[] = [
  {
    id: 'cmd_new',
    type: 'command',
    label: '/new',
    description: '新建对话',
    value: '/new',
  },
  {
    id: 'cmd_clear',
    type: 'command',
    label: '/clear',
    description: '清空当前对话',
    value: '/clear',
  },
  {
    id: 'cmd_export',
    type: 'command',
    label: '/export',
    description: '导出对话记录',
    value: '/export',
  },
  {
    id: 'cmd_help',
    type: 'command',
    label: '/help',
    description: '查看帮助',
    value: '/help',
  },
];

/** 历史对话记录项（本地存储） */
export interface HistoryEntry {
  text: string;
  at: number;
}

const HISTORY_KEY = 'hermes_input_history';
const HISTORY_MAX = 50;
const DEBOUNCE_MS = 300;

/**
 * 读取本地输入历史
 */
export function loadInputHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

/**
 * 追加一条输入历史
 */
export function pushInputHistory(text: string): void {
  if (!text.trim() || typeof window === 'undefined') return;
  try {
    const list = loadInputHistory().filter((h) => h.text !== text.trim());
    list.unshift({ text: text.trim(), at: Date.now() });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX)));
  } catch {
    // ignore quota errors
  }
}

interface InputGuideProps {
  /** 当前输入值 */
  value: string;
  /** 输入框是否聚焦 */
  focused: boolean;
  /** 选中某项 */
  onSelect: (item: GuideItem) => void;
  /** 关闭引导 */
  onClose: () => void;
  /** 额外的历史匹配（来自会话列表） */
  historySuggestions?: string[];
  /** 拦截按键的 textarea ref（方向键/Tab/Enter 补全） */
  interceptKeysOn?: React.RefObject<HTMLTextAreaElement | null>;
}

/**
 * 输入引导组件
 * - 输入 `/` 显示命令列表
 * - 输入 `@` 显示知识库文档列表
 * - 普通输入时显示历史对话匹配（防抖 300ms）
 * - 支持键盘上下键选择、Tab/Enter 补全
 */
export function InputGuide({
  value,
  focused,
  onSelect,
  onClose,
  historySuggestions,
  interceptKeysOn,
}: InputGuideProps) {
  const [knowledgeDocs, setKnowledgeDocs] = useState<GuideItem[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);
  const itemsRef = useRef<GuideItem[]>([]);
  const activeIndexRef = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;

  // 防抖更新查询词
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(value);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);

  // 懒加载知识库文档（仅首次输入 @ 时请求）
  const isMentionMode = value.startsWith('@') || /(^|\s)@[^\s]*$/.test(value);
  useEffect(() => {
    if (!isMentionMode || loadedRef.current) return;
    loadedRef.current = true;
    (async () => {
      try {
        const data: any = await apiClient.getKnowledgeDatasets();
        const list = Array.isArray(data) ? data : data?.items || [];
        setKnowledgeDocs(
          list.map((d: any) => ({
            id: `kb_${d.id}`,
            type: 'knowledge' as const,
            label: d.name || d.title || '未命名文档',
            description: d.description || undefined,
            value: `@${d.name || d.title || d.id}`,
          }))
        );
      } catch {
        // 知识库不可用时静默失败
      }
    })();
  }, [isMentionMode]);

  // 根据输入模式计算候选列表
  const items = useMemo(() => {
    // 命令模式
    if (value.startsWith('/')) {
      const q = value.slice(1).toLowerCase();
      return BUILTIN_COMMANDS.filter(
        (c) =>
          c.label.slice(1).toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q)
      );
    }

    // @ 知识库模式
    if (isMentionMode) {
      // 取最后一个 @ 后面的关键词
      const atIdx = value.lastIndexOf('@');
      const q = value.slice(atIdx + 1).toLowerCase().trim();
      return knowledgeDocs.filter(
        (d) =>
          d.label.toLowerCase().includes(q) ||
          (d.description || '').toLowerCase().includes(q)
      );
    }

    // 历史匹配模式（需要有实际输入）
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return [];

    const results: GuideItem[] = [];
    const seen = new Set<string>();

    // 本地历史
    for (const h of loadInputHistory()) {
      if (results.length >= 6) break;
      if (h.text.toLowerCase().includes(q) && !seen.has(h.text)) {
        seen.add(h.text);
        results.push({
          id: `hist_${h.at}`,
          type: 'history',
          label: h.text,
          description: '历史输入',
          value: h.text,
        });
      }
    }

    // 外部传入的历史（如会话标题）
    for (const s of historySuggestions || []) {
      if (results.length >= 8) break;
      if (s.toLowerCase().includes(q) && !seen.has(s)) {
        seen.add(s);
        results.push({
          id: `sug_${s}`,
          type: 'history',
          label: s,
          description: '相关对话',
          value: s,
        });
      }
    }

    return results;
  }, [value, debouncedQuery, isMentionMode, knowledgeDocs, historySuggestions]);

  // 同步 items / activeIndex 到 ref，供事件监听使用
  itemsRef.current = items;
  activeIndexRef.current = activeIndex;

  // 重置高亮索引
  useEffect(() => {
    setActiveIndex(0);
  }, [value, items.length]);

  // 滚动到高亮项
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // 在 textarea 上捕获方向键 / Tab / Enter（命令与 @ 模式），实现键盘选择与补全
  // 普通历史匹配时 Enter 仍由 ChatInput 发送，避免误触
  useEffect(() => {
    const el = interceptKeysOn?.current;
    if (!el) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const list = itemsRef.current;
      if (!focused || list.length === 0) return;

      // 是否处于命令 / @ 提及模式（这两种模式下 Enter 用于补全）
      const v = valueRef.current;
      const isCommandOrMention =
        v.startsWith('/') || /(^|\s)@[^\s]*$/.test(v);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setActiveIndex((i) => (i + 1) % list.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setActiveIndex((i) => (i - 1 + list.length) % list.length);
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        onSelect(list[activeIndexRef.current]);
        return;
      }
      // 命令 / 提及模式下 Enter 补全（普通输入 Enter 发送消息）
      if (e.key === 'Enter' && !e.shiftKey && isCommandOrMention) {
        e.preventDefault();
        e.stopPropagation();
        onSelect(list[activeIndexRef.current]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    // 使用捕获阶段，优先于 React 的 onKeyDown
    el.addEventListener('keydown', onKeyDown, true);
    return () => el.removeEventListener('keydown', onKeyDown, true);
  }, [focused, interceptKeysOn, onSelect, onClose]);

  if (!focused || items.length === 0) return null;

  const groupIcon = (type: GuideItemType) => {
    switch (type) {
      case 'command':
        return <Command className="h-3 w-3" />;
      case 'knowledge':
        return <FileText className="h-3 w-3" />;
      case 'history':
        return <Clock className="h-3 w-3" />;
    }
  };

  const groupLabel = (type: GuideItemType) => {
    switch (type) {
      case 'command':
        return '命令';
      case 'knowledge':
        return '知识库';
      case 'history':
        return '历史';
    }
  };

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-0 right-0 z-20 mb-2 max-h-64 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-lg animate-scale-in"
    >
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          data-index={i}
          onMouseEnter={() => setActiveIndex(i)}
          onClick={() => onSelect(item)}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors',
            i === activeIndex
              ? 'bg-accent text-accent-foreground'
              : 'text-popover-foreground hover:bg-accent/60'
          )}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            {item.icon || groupIcon(item.type)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {item.type === 'command' ? (
                <span className="font-mono">{item.label}</span>
              ) : (
                item.label
              )}
            </p>
            {item.description && (
              <p className="truncate text-xs text-muted-foreground">
                {item.description}
              </p>
            )}
          </div>
          <span className="shrink-0 text-[10px] text-muted-foreground/60">
            {groupLabel(item.type)}
          </span>
        </button>
      ))}

      <div className="mt-1 flex items-center justify-between border-t border-border px-2.5 pt-1.5 text-[10px] text-muted-foreground/60">
        <span>↑↓ 选择 · Tab 补全 · Esc 关闭</span>
        <span className="flex items-center gap-1">
          {value.startsWith('/') ? (
            <>
              <Command className="h-2.5 w-2.5" /> 命令模式
            </>
          ) : isMentionMode ? (
            <>
              <AtSign className="h-2.5 w-2.5" /> 知识库
            </>
          ) : (
            <>
              <Search className="h-2.5 w-2.5" /> 历史匹配
            </>
          )}
        </span>
      </div>
    </div>
  );
}

/** 供外部使用：判断是否为命令并执行 */
export function matchCommand(text: string): GuideItem | null {
  const trimmed = text.trim();
  return BUILTIN_COMMANDS.find((c) => c.value === trimmed) || null;
}
