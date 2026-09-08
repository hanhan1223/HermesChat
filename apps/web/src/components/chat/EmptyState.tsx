'use client';

import {
  MessageSquare,
  Code,
  Image,
  FileText,
  Lightbulb,
  Sparkles,
  Video,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuggestionCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  prompt: string;
}

interface EmptyStateProps {
  onSelectPrompt?: (prompt: string) => void;
}

/**
 * 空状态组件 - 无消息时的欢迎界面
 * 展示：品牌、能力介绍、建议提示词、多模态支持说明
 */
export function EmptyState({ onSelectPrompt }: EmptyStateProps) {
  const suggestions: SuggestionCard[] = [
    {
      icon: <Code className="h-4 w-4" />,
      title: '代码助手',
      description: '帮你编写、调试和优化代码',
      prompt: '帮我写一个 Python 脚本来处理 CSV 文件',
    },
    {
      icon: <Image className="h-4 w-4" />,
      title: '图片理解',
      description: '上传图片，我来帮你分析',
      prompt: '请分析这张图片的内容和构图',
    },
    {
      icon: <FileText className="h-4 w-4" />,
      title: '文档处理',
      description: '上传文件，提取信息和总结',
      prompt: '请帮我总结这份文档的要点',
    },
    {
      icon: <Video className="h-4 w-4" />,
      title: '视频分析',
      description: '上传视频，理解内容',
      prompt: '请分析这段视频的主要内容',
    },
  ];

  const capabilities = [
    { icon: <MessageSquare className="h-3.5 w-3.5" />, label: '自然语言对话' },
    { icon: <Image className="h-3.5 w-3.5" />, label: '图片理解' },
    { icon: <Video className="h-3.5 w-3.5" />, label: '视频分析' },
    { icon: <FileText className="h-3.5 w-3.5" />, label: '文件处理' },
    { icon: <Code className="h-3.5 w-3.5" />, label: '代码生成' },
    { icon: <Lightbulb className="h-3.5 w-3.5" />, label: '思维推理' },
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-8 animate-fade-in">
      {/* Logo & Title */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 ring-1 ring-white/10">
          <Sparkles className="h-8 w-8 text-blue-400" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          欢迎使用 <span className="gradient-text">HermesChat</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          企业级 AI Agent 平台，支持多模态输入与智能推理
        </p>
      </div>

      {/* Capabilities */}
      <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
        {capabilities.map((cap, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground"
          >
            {cap.icon}
            {cap.label}
          </div>
        ))}
      </div>

      {/* Suggestion Cards */}
      <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        {suggestions.map((suggestion, i) => (
          <button
            key={i}
            onClick={() => onSelectPrompt?.(suggestion.prompt)}
            className="group flex items-start gap-3 rounded-xl border border-border bg-card/50 p-4 text-left transition-all hover:border-border/80 hover:bg-card hover:shadow-elevated active:scale-[0.98]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
              {suggestion.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-card-foreground">
                {suggestion.title}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {suggestion.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Upload Hint */}
      <div className="mt-6 flex items-center gap-2 rounded-lg bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
        <Upload className="h-3.5 w-3.5" />
        <span>支持拖拽或点击上传图片、视频、文件</span>
      </div>
    </div>
  );
}

/**
 * 打字指示器 - AI 正在生成回复时的动画
 */
export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-1 rounded-xl bg-chat-bubble-assistant px-4 py-3">
        <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-typing-1" />
        <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-typing-2" />
        <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-typing-3" />
      </div>
    </div>
  );
}
