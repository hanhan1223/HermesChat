'use client';

import { useState } from 'react';
import { HtmlPreview, MermaidPreview } from './CodePreview';
import { CitationText, type CitationSource } from './CitationText';

/**
 * 富内容渲染组件
 * 自动检测消息中的代码块：
 * - ```html → HTML 预览
 * - ```mermaid → Mermaid 图表预览
 * - 其他代码块 → 普通代码展示
 * - 引用标记 → 可点击上标
 */
export function RichContent({
  content,
  sourceMapping,
  sources,
  onCitationClick,
}: {
  content: string;
  sourceMapping?: Record<string, number>;
  sources?: CitationSource[];
  onCitationClick?: (source: CitationSource) => void;
}) {
  const segments = parseContent(content);

  return (
    <div className="space-y-3">
      {segments.map((seg, i) => {
        if (seg.type === 'html') {
          return <HtmlPreview key={i} code={seg.content} title={seg.title} />;
        }
        if (seg.type === 'mermaid') {
          return <MermaidPreview key={i} code={seg.content} title={seg.title} />;
        }
        if (seg.type === 'code') {
          return (
            <pre key={i} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 overflow-x-auto text-xs">
              <code>{seg.content}</code>
            </pre>
          );
        }
        // 普通文本（含引用标记）
        return (
          <div key={i} className="whitespace-pre-wrap text-sm leading-relaxed">
            <CitationText
              content={seg.content}
              sourceMapping={sourceMapping}
              sources={sources}
              onCitationClick={onCitationClick}
            />
          </div>
        );
      })}
    </div>
  );
}

// ==================== 内容解析 ====================

interface ContentSegment {
  type: 'text' | 'code' | 'html' | 'mermaid';
  content: string;
  title?: string;
}

/**
 * 解析消息内容，按代码块分段
 */
function parseContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  // 匹配 ```lang\n...\n``` 代码块
  const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // 代码块前的文本
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore.trim()) {
      segments.push({ type: 'text', content: textBefore });
    }

    const lang = (match[1] || '').toLowerCase();
    const code = match[2];

    if (lang === 'html' || lang === 'htm') {
      segments.push({ type: 'html', content: code, title: 'HTML 预览' });
    } else if (lang === 'mermaid') {
      segments.push({ type: 'mermaid', content: code, title: 'Mermaid 图表' });
    } else {
      segments.push({ type: 'code', content: code, title: lang || undefined });
    }

    lastIndex = match.index + match[0].length;
  }

  // 最后的文本
  const remaining = content.substring(lastIndex);
  if (remaining.trim()) {
    segments.push({ type: 'text', content: remaining });
  }

  // 如果没有代码块，整段作为文本
  if (segments.length === 0 && content.trim()) {
    segments.push({ type: 'text', content });
  }

  return segments;
}
