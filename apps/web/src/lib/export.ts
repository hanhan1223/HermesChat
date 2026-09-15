/**
 * 消息导出工具
 * 支持 Markdown / JSON / PDF（浏览器打印）三种格式
 */

/** 导出用的消息结构 */
export interface ExportMessage {
  id: string;
  role: string;
  content: string;
  thinking?: string;
  createdAt: string;
  sources?: ExportSource[];
  sourceMapping?: Record<string, number>;
}

/** 导出用的引用来源结构 */
export interface ExportSource {
  id: string;
  title?: string;
  content?: string;
  snippet?: string;
  url?: string;
  score?: number;
}

export interface ExportOptions {
  conversationTitle: string;
  messages: ExportMessage[];
  exportedAt?: string;
}

/**
 * 将消息内容中的 [[ID: doc_x]] 替换为 [N] 上标形式
 */
function replaceCitations(
  content: string,
  sourceMapping?: Record<string, number>
): string {
  if (!sourceMapping) return content;
  return content.replace(/\[\[ID:\s*([^\]]+?)\]\]/g, (match, docId: string) => {
    const n = sourceMapping[docId];
    return typeof n === 'number' ? `[${n}]` : match;
  });
}

/**
 * 收集整个对话中出现过的全部引用（去重，按首次出现顺序）
 */
function collectAllSources(messages: ExportMessage[]): ExportSource[] {
  const seen = new Map<string, ExportSource>();
  const order: string[] = [];

  for (const msg of messages) {
    if (!msg.sources?.length) continue;
    for (const src of msg.sources) {
      if (!seen.has(src.id)) {
        seen.set(src.id, src);
        order.push(src.id);
      }
    }
  }

  return order.map((id) => seen.get(id)!);
}

// ==================== Markdown ====================

/**
 * 生成 Markdown 格式的对话导出
 */
export function exportAsMarkdown(options: ExportOptions): string {
  const { conversationTitle, messages, exportedAt } = options;
  const lines: string[] = [];

  lines.push(`# ${conversationTitle || '对话记录'}`);
  lines.push('');
  lines.push(
    `> 导出时间：${exportedAt || new Date().toLocaleString('zh-CN')}`
  );
  lines.push('');

  for (const msg of messages) {
    const roleLabel =
      msg.role === 'USER'
        ? '用户'
        : msg.role === 'ASSISTANT'
          ? '助手'
          : msg.role === 'SYSTEM'
            ? '系统'
            : '工具';

    lines.push(`## ${roleLabel}`);
    lines.push('');
    lines.push(
      replaceCitations(msg.content || '', msg.sourceMapping) || '*（空消息）*'
    );
    lines.push('');

    if (msg.thinking) {
      lines.push('<details><summary>思考过程</summary>');
      lines.push('');
      lines.push(msg.thinking);
      lines.push('');
      lines.push('</details>');
      lines.push('');
    }
  }

  // 引用列表
  const allSources = collectAllSources(messages);
  if (allSources.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## 引用来源');
    lines.push('');
    allSources.forEach((src, i) => {
      const n = i + 1;
      const title = src.title || src.id;
      const link = src.url ? ` — [链接](${src.url})` : '';
      lines.push(`${n}. **${title}**${link}`);
      const snippet = src.snippet || src.content;
      if (snippet) {
        const short =
          snippet.length > 200 ? snippet.slice(0, 200) + '...' : snippet;
        lines.push(`   > ${short.replace(/\n/g, '\n   > ')}`);
      }
      lines.push('');
    });
  }

  return lines.join('\n');
}

// ==================== JSON ====================

/**
 * 生成 JSON 格式的对话导出
 */
export function exportAsJSON(options: ExportOptions): string {
  const { conversationTitle, messages, exportedAt } = options;
  return JSON.stringify(
    {
      title: conversationTitle || '对话记录',
      exportedAt: exportedAt || new Date().toISOString(),
      messageCount: messages.length,
      sources: collectAllSources(messages),
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        // 将引用标记替换为可读的 [N]
        contentWithCitations: replaceCitations(m.content, m.sourceMapping),
        thinking: m.thinking || undefined,
        sourceMapping: m.sourceMapping,
        sources: m.sources,
        createdAt: m.createdAt,
      })),
    },
    null,
    2
  );
}

// ==================== PDF / 打印 ====================

/**
 * 构建用于打印/PDF 的 HTML 文档
 */
export function buildPrintHTML(options: ExportOptions): string {
  const { conversationTitle, messages, exportedAt } = options;
  const allSources = collectAllSources(messages);

  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const msgHtml = messages
    .map((msg) => {
      const roleLabel =
        msg.role === 'USER'
          ? '用户'
          : msg.role === 'ASSISTANT'
            ? '助手'
            : msg.role === 'SYSTEM'
              ? '系统'
              : '工具';
      const isUser = msg.role === 'USER';
      const body = escapeHtml(
        replaceCitations(msg.content || '', msg.sourceMapping)
      ).replace(/\n/g, '<br/>');

      return `
        <div class="msg ${isUser ? 'user' : 'assistant'}">
          <div class="role">${roleLabel}</div>
          <div class="body">${body || '（空消息）'}</div>
          <div class="time">${new Date(msg.createdAt).toLocaleString('zh-CN')}</div>
        </div>`;
    })
    .join('\n');

  const sourcesHtml =
    allSources.length > 0
      ? `<h2>引用来源</h2><ol class="sources">${allSources
          .map((src) => {
            const title = escapeHtml(src.title || src.id);
            const link = src.url
              ? ` <a href="${escapeHtml(src.url)}">${escapeHtml(src.url)}</a>`
              : '';
            const snippet = src.snippet || src.content || '';
            return `<li><strong>${title}</strong>${link}${
              snippet
                ? `<br/><span class="snippet">${escapeHtml(
                    snippet.slice(0, 300)
                  )}</span>`
                : ''
            }</li>`;
          })
          .join('')}</ol>`
      : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(conversationTitle || '对话记录')}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
      "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    max-width: 720px; margin: 0 auto; padding: 32px 20px; color: #1a1a1a;
    line-height: 1.6;
  }
  h1 { font-size: 22px; border-bottom: 2px solid #e5e5e5; padding-bottom: 12px; }
  h2 { font-size: 16px; margin-top: 28px; color: #444; }
  .meta { color: #888; font-size: 12px; margin-bottom: 24px; }
  .msg { margin-bottom: 16px; padding: 12px 16px; border-radius: 10px; }
  .msg.user { background: #eef2ff; }
  .msg.assistant { background: #f7f7f7; }
  .msg .role { font-size: 12px; font-weight: 600; color: #666; margin-bottom: 4px; }
  .msg .body { font-size: 14px; white-space: pre-wrap; word-break: break-word; }
  .msg .time { font-size: 11px; color: #999; margin-top: 6px; }
  .sources { font-size: 13px; }
  .sources li { margin-bottom: 8px; }
  .sources .snippet { color: #666; font-size: 12px; }
  .sources a { color: #2563eb; word-break: break-all; }
  @media print {
    body { padding: 0; }
    .msg { break-inside: avoid; }
  }
</style>
</head>
<body>
  <h1>${escapeHtml(conversationTitle || '对话记录')}</h1>
  <div class="meta">导出时间：${escapeHtml(
    exportedAt || new Date().toLocaleString('zh-CN')
  )} · 共 ${messages.length} 条消息</div>
  ${msgHtml}
  ${sourcesHtml}
</body>
</html>`;
}

/**
 * 通过浏览器打印导出 PDF（打开新窗口并触发 print）
 */
export function exportAsPDF(options: ExportOptions): boolean {
  if (typeof window === 'undefined') return false;
  const html = buildPrintHTML(options);
  const win = window.open('', '_blank', 'width=800,height=600');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  // 等待渲染完成后再打印
  win.onload = () => {
    win.focus();
    win.print();
  };
  return true;
}

// ==================== 下载工具 ====================

/**
 * 触发浏览器下载
 */
export function downloadFile(
  content: string,
  filename: string,
  mime = 'text/plain;charset=utf-8'
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 生成安全的导出文件名
 */
export function buildExportFilename(
  title: string,
  ext: string
): string {
  const safe =
    (title || '对话记录')
      .replace(/[\\/:*?"<>|]/g, '_')
      .slice(0, 50)
      .trim() || '对话记录';
  const ts = new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, '-');
  return `${safe}_${ts}.${ext}`;
}

/**
 * 一键导出 Markdown
 */
export function downloadMarkdown(options: ExportOptions): void {
  const md = exportAsMarkdown(options);
  downloadFile(
    md,
    buildExportFilename(options.conversationTitle, 'md'),
    'text/markdown;charset=utf-8'
  );
}

/**
 * 一键导出 JSON
 */
export function downloadJSON(options: ExportOptions): void {
  const json = exportAsJSON(options);
  downloadFile(
    json,
    buildExportFilename(options.conversationTitle, 'json'),
    'application/json;charset=utf-8'
  );
}
