'use client';

import * as React from 'react';
import { HtmlPreview, MermaidPreview } from './CodePreview';
import { CodeBlock, ImageBlock } from './CodeBlock';
import { CitationText, type CitationSource } from './CitationText';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

/**
 * 消息正文：代码块切分 + Markdown 渲染 + 引用角标
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
    <div className="md-content space-y-3">
      {segments.map((seg, i) => {
        if (seg.type === 'html') {
          return <HtmlPreview key={i} code={seg.content} title={seg.title} />;
        }
        if (seg.type === 'mermaid') {
          return <MermaidPreview key={i} code={seg.content} title={seg.title} />;
        }
        if (seg.type === 'code') {
          return <CodeBlock key={i} code={seg.content} lang={seg.title} />;
        }
        return (
          <MarkdownText
            key={i}
            content={seg.content}
            sourceMapping={sourceMapping}
            sources={sources}
            onCitationClick={onCitationClick}
          />
        );
      })}
    </div>
  );
}

function MarkdownText({
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
  const withCitations = (text: string) => (
    <CitationText
      content={text}
      sourceMapping={sourceMapping}
      sources={sources}
      onCitationClick={(s: any, n: any) => onCitationClick?.(s)}
    />
  );

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="my-2 text-[0.95rem] leading-[1.75] text-foreground first:mt-0 last:mb-0">
            {typeof children === 'string'
              ? withCitations(children)
              : mapChildren(children, withCitations)}
          </p>
        ),
        h1: ({ children }) => (
          <h1 className="mb-2 mt-4 text-[1.35rem] font-semibold tracking-tight text-foreground first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="mb-2 mt-4 text-[1.15rem] font-semibold tracking-tight text-foreground first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-1.5 mt-3 text-[1.02rem] font-semibold text-foreground first:mt-0">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="mb-1 mt-3 text-[0.98rem] font-semibold text-foreground first:mt-0">
            {children}
          </h4>
        ),
        ul: ({ children }) => (
          <ul className="my-2 list-disc space-y-1 pl-5 text-[0.95rem] leading-[1.7] text-foreground marker:text-muted-foreground">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 list-decimal space-y-1 pl-5 text-[0.95rem] leading-[1.7] text-foreground marker:text-muted-foreground">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="pl-0.5">{children}</li>,
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-2 hover:opacity-80"
          >
            {children}
          </a>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        hr: () => <hr className="my-4 border-border" />,
        blockquote: ({ children }) => (
          <blockquote className="my-2 border-l-2 border-border pl-3 text-muted-foreground">
            {children}
          </blockquote>
        ),
        code: ({ className, children, ...props }) => {
          const isBlock = String(className || '').includes('language-');
          if (isBlock) {
            return (
              <code className={cn('font-mono text-[12.5px]', className)} {...props}>
                {children}
              </code>
            );
          }
          return (
            <code
              className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground"
              {...props}
            >
              {children}
            </code>
          );
        },
        pre: ({ children }) => {
          // 提取代码文本，换成带复制按钮的 CodeBlock
          let codeText = '';
          let lang = '';
          const walk = (node: unknown) => {
            if (node == null) return;
            if (typeof node === 'string' || typeof node === 'number') {
              codeText += String(node);
              return;
            }
            if (Array.isArray(node)) {
              node.forEach(walk);
              return;
            }
            if (React.isValidElement(node)) {
              const cls = (node.props as any)?.className;
              if (typeof cls === 'string') {
                const m = cls.match(/language-([\w+-]+)/);
                if (m) lang = m[1];
              }
              walk((node.props as any)?.children);
            }
          };
          walk(children);
          return <CodeBlock code={codeText} lang={lang || 'code'} />;
        },
        img: (props) => (
          <ImageBlock src={String(props.src || '')} alt={props.alt} name={props.alt} />
        ),
        table: ({ children }) => (
          <div className="my-2 w-full overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-full border-collapse text-left text-[0.88rem]">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted/60 text-muted-foreground">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="border-b border-border px-3 py-2 font-semibold">{children}</th>
        ),
        td: ({ children }) => (
          <td className="border-b border-border/60 px-3 py-2 align-top last:border-b-0">
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

/** 递归处理 children 中的字符串节点，插入引用角标 */
function mapChildren(
  children: React.ReactNode,
  renderText: (text: string) => React.ReactNode,
): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === 'string') return renderText(child);
    if (React.isValidElement(child)) {
      const el = child as React.ReactElement<any>;
      return React.cloneElement(el, {
        children: mapChildren(el.props?.children, renderText),
      });
    }
    return child;
  });
}

interface ContentSegment {
  type: 'text' | 'code' | 'html' | 'mermaid';
  content: string;
  title?: string;
}

/** 按围栏代码块切分 */
function parseContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
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

  const remaining = content.substring(lastIndex);
  if (remaining.trim()) {
    segments.push({ type: 'text', content: remaining });
  }

  if (segments.length === 0 && content.trim()) {
    segments.push({ type: 'text', content });
  }

  return segments;
}
