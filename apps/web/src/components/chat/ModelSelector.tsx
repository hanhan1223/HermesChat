'use client';

import { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Check,
  Sparkles,
  Zap,
  Brain,
  Code,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Model {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  contextLength?: string;
  isNew?: boolean;
  isPro?: boolean;
}

interface ModelSelectorProps {
  selectedModel: string;
  onSelect: (modelId: string) => void;
}

const models: Model[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: '最强大的模型，适合复杂任务',
    icon: <Sparkles className="h-4 w-4" />,
    contextLength: '128K',
    isNew: true,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o mini',
    description: '快速响应，日常对话首选',
    icon: <Zap className="h-4 w-4" />,
    contextLength: '128K',
  },
  {
    id: 'claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    description: '深度推理，创意写作',
    icon: <Brain className="h-4 w-4" />,
    contextLength: '200K',
  },
  {
    id: 'deepseek-coder',
    name: 'DeepSeek Coder',
    description: '专业代码生成与调试',
    icon: <Code className="h-4 w-4" />,
    contextLength: '64K',
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    description: '多模态理解，支持图片/视频',
    icon: <Globe className="h-4 w-4" />,
    contextLength: '1M',
    isPro: true,
  },
];

/**
 * 模型选择器 - 顶部下拉选择
 */
export function ModelSelector({ selectedModel, onSelect }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentModel = models.find((m) => m.id === selectedModel) || models[0];

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-all',
          open
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <span className="text-foreground">{currentModel.icon}</span>
        <span className="font-medium">{currentModel.name}</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border border-border bg-card p-1.5 shadow-elevated animate-scale-in">
          <div className="mb-1 px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            选择模型
          </div>
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                onSelect(model.id);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors',
                selectedModel === model.id
                  ? 'bg-primary/10 text-foreground'
                  : 'text-card-foreground hover:bg-muted'
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg',
                  selectedModel === model.id
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {model.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">{model.name}</span>
                  {model.isNew && (
                    <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[9px] font-medium text-success">
                      NEW
                    </span>
                  )}
                  {model.isPro && (
                    <span className="rounded-full bg-warning/10 px-1.5 py-0.5 text-[9px] font-medium text-warning">
                      PRO
                    </span>
                  )}
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {model.description}
                </p>
              </div>
              {selectedModel === model.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
