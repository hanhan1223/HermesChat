'use client';

import { useState, useRef, useEffect } from 'react';
import { Code, Eye, Copy, Check, Download, Maximize2, Minimize2 } from 'lucide-react';

/**
 * HTML 预览组件
 * 渲染消息中的 HTML 代码块，支持沙箱 iframe 预览 + 源码切换
 */
export function HtmlPreview({ code, title }: { code: string; title?: string }) {
  const [mode, setMode] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = title || 'preview.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${fullscreen ? 'fixed inset-4 z-50 bg-white dark:bg-gray-900' : ''}`}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1">
          <Code className="w-4 h-4 text-orange-500" />
          <span className="text-xs font-medium">{title || 'HTML 预览'}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMode(mode === 'preview' ? 'code' : 'preview')}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {mode === 'preview' ? <Code className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {mode === 'preview' ? '源码' : '预览'}
          </button>
          <button onClick={handleCopy} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="复制">
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={handleDownload} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="下载">
            <Download className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setFullscreen(!fullscreen)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="全屏">
            {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <div className={fullscreen ? 'flex-1 overflow-hidden' : 'h-80'}>
        {mode === 'preview' ? (
          <iframe
            ref={iframeRef}
            srcDoc={code}
            sandbox="allow-scripts allow-same-origin"
            className="w-full h-full border-0"
            title={title || 'HTML Preview'}
          />
        ) : (
          <pre className="h-full overflow-auto p-3 text-xs bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
}

/**
 * Mermaid 图表预览组件
 * 渲染消息中的 Mermaid 代码块为 SVG 图表
 */
export function MermaidPreview({ code, title }: { code: string; title?: string }) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [mode, setMode] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    renderMermaid();
  }, [code]);

  const renderMermaid = async () => {
    try {
      setError('');
      // 动态加载 mermaid
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
        securityLevel: 'loose',
      });

      const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const { svg: renderedSvg } = await mermaid.render(id, code);
      setSvg(renderedSvg);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mermaid 渲染失败');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySvg = () => {
    if (!svg) return;
    navigator.clipboard.writeText(svg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSvg = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'diagram'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${fullscreen ? 'fixed inset-4 z-50 bg-white dark:bg-gray-900' : ''}`}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-300">M</span>
          </div>
          <span className="text-xs font-medium">{title || 'Mermaid 图表'}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMode(mode === 'preview' ? 'code' : 'preview')}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {mode === 'preview' ? <Code className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {mode === 'preview' ? '源码' : '预览'}
          </button>
          <button onClick={handleCopy} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="复制代码">
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {svg && (
            <button onClick={handleCopySvg} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="复制 SVG">
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}
          {svg && (
            <button onClick={handleDownloadSvg} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="下载 SVG">
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => setFullscreen(!fullscreen)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
            {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <div ref={containerRef} className={`${fullscreen ? 'flex-1 overflow-auto' : 'min-h-40 max-h-96 overflow-auto'} p-4`}>
        {mode === 'preview' ? (
          error ? (
            <div className="text-sm text-red-500 p-2">
              <p className="font-medium">渲染失败:</p>
              <pre className="mt-1 text-xs whitespace-pre-wrap">{error}</pre>
            </div>
          ) : svg ? (
            <div className="flex justify-center" dangerouslySetInnerHTML={{ __html: svg }} />
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">渲染中...</div>
          )
        ) : (
          <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded overflow-auto text-gray-700 dark:text-gray-300">
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
