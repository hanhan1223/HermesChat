'use client';

import { useState, useRef } from 'react';
import { Send, Paperclip, Image, Mic } from 'lucide-react';

/**
 * 聊天输入组件
 * 支持：文本输入、文件上传、图片上传、语音输入（预留）
 */
export function ChatInput({ onSend, disabled }: { onSend: (content: string, files?: File[]) => void; disabled?: boolean }) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && attachments.length === 0) return;
    onSend(input.trim(), attachments);
    setInput('');
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      {/* 附件预览 */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((file, i) => (
            <div key={i} className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1 text-xs text-slate-300">
              <span>{file.name}</span>
              <button
                type="button"
                onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                className="text-slate-500 hover:text-red-400"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 输入框 */}
      <div className="flex items-end gap-2 rounded-2xl border border-slate-700 bg-slate-800 p-2">
        {/* 工具按钮 */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            <Image className="h-5 w-5" />
          </button>
        </div>

        {/* 文本输入 */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
          disabled={disabled}
          rows={1}
          className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent py-2 text-sm text-white placeholder-slate-500 outline-none"
        />

        {/* 发送按钮 */}
        <button
          type="submit"
          disabled={disabled || (!input.trim() && attachments.length === 0)}
          className="rounded-xl bg-blue-600 p-2 text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {/* 隐藏的文件输入 */}
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => {
        if (e.target.files) setAttachments([...attachments, ...Array.from(e.target.files)]);
      }} />
      <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
        if (e.target.files) setAttachments([...attachments, ...Array.from(e.target.files)]);
      }} />
    </form>
  );
}