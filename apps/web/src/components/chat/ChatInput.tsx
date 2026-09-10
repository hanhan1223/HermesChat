'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Send,
  Paperclip,
  Image,
  Video,
  FileText,
  X,
  Mic,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Attachment {
  id: string;
  file: File;
  type: 'image' | 'video' | 'file';
  preview?: string;
}

interface ChatInputProps {
  onSend: (content: string, files?: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
  /** 快捷建议 */
  suggestions?: string[];
}

/**
 * 增强版聊天输入组件
 * 支持：文字、图片、视频、文件多模态输入
 * 特性：附件预览、拖拽上传、快捷键、建议提示
 */
export function ChatInput({
  onSend,
  disabled,
  placeholder = '发送消息...',
  suggestions,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // 自动调整 textarea 高度
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustTextareaHeight();
    setShowSuggestions(e.target.value === '' && !!suggestions && suggestions.length > 0);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && attachments.length === 0) || disabled) return;
    onSend(input.trim(), attachments.map((a) => a.file));
    setInput('');
    setAttachments([]);
    setShowSuggestions(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // 文件处理
  const processFiles = (files: FileList | null) => {
    if (!files) return;
    const newAttachments: Attachment[] = Array.from(files).map((file) => {
      let type: 'image' | 'video' | 'file' = 'file';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';

      const attachment: Attachment = {
        id: Math.random().toString(36).slice(2, 9),
        file,
        type,
      };

      // 生成预览
      if (type === 'image' || type === 'video') {
        attachment.preview = URL.createObjectURL(file);
      }

      return attachment;
    });
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const att = prev.find((a) => a.id === id);
      if (att?.preview) URL.revokeObjectURL(att.preview);
      return prev.filter((a) => a.id !== id);
    });
  };

  // 拖拽处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  // 粘贴处理
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      processFiles(dt.files);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setInput(suggestion);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  const isImageOnly = attachments.every((a) => a.type === 'image');
  const isVideoOnly = attachments.every((a) => a.type === 'video');

  return (
    <div className="relative">
      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions && suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-border bg-card p-2 shadow-elevated animate-scale-in">
          <div className="mb-1.5 flex items-center gap-1.5 px-2 text-[11px] font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            建议提示
          </div>
          {suggestions.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => selectSuggestion(suggestion)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-card-foreground transition-colors hover:bg-muted"
            >
              <span className="flex-1">{suggestion}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Input Area */}
      <form
        onSubmit={handleSubmit}
        className={cn(
          'relative rounded-2xl border bg-card shadow-card transition-all',
          isDragging
            ? 'border-info ring-2 ring-info/20 bg-info/5'
            : 'border-border hover:border-border/80 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-info/5 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2 text-info">
              <div className="rounded-full bg-info/10 p-3">
                <Paperclip className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium">拖放文件到此处上传</span>
              <span className="text-xs text-info/70">支持图片、视频、文件</span>
            </div>
          </div>
        )}

        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 pb-0">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="group relative overflow-hidden rounded-lg border border-border bg-muted/50"
              >
                {att.type === 'image' && att.preview && (
                  <img
                    src={att.preview}
                    alt={att.file.name}
                    className="h-16 w-16 object-cover"
                  />
                )}
                {att.type === 'video' && att.preview && (
                  <div className="relative h-16 w-16">
                    <video
                      src={att.preview}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Video className="h-5 w-5 text-white" />
                    </div>
                  </div>
                )}
                {att.type === 'file' && (
                  <div className="flex h-16 w-16 flex-col items-center justify-center p-1">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                    <span className="mt-0.5 w-full truncate text-center text-[9px] text-muted-foreground">
                      {att.file.name.split('.').pop()?.toUpperCase()}
                    </span>
                  </div>
                )}
                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
                {/* File Size Badge */}
                <div className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[8px] text-white">
                  {formatFileSize(att.file.size)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Text Input */}
        <div className="flex items-end gap-1 p-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="max-h-[200px] min-h-[44px] flex-1 resize-none bg-transparent py-2.5 pl-2 text-sm text-card-foreground placeholder-muted-foreground outline-none scrollbar-hidden"
          />
        </div>

        {/* Bottom Toolbar */}
        <div className="flex items-center justify-between border-t border-border/50 px-2 py-1.5">
          {/* Left: Upload Buttons */}
          <div className="flex items-center gap-0.5">
            {/* Image Upload */}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-card-foreground"
              title="上传图片"
            >
              <Image className="h-4 w-4" />
            </button>
            {/* Video Upload */}
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-card-foreground"
              title="上传视频"
            >
              <Video className="h-4 w-4" />
            </button>
            {/* File Upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-card-foreground"
              title="上传文件"
            >
              <Paperclip className="h-4 w-4" />
            </button>
          </div>

          {/* Right: Send Button */}
          <div className="flex items-center gap-2">
            {/* Attachment Count */}
            {attachments.length > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {attachments.length} 个附件
              </span>
            )}
            {/* Character Count */}
            {input.length > 0 && (
              <span className="text-[11px] text-muted-foreground">
                {input.length}
              </span>
            )}
            {/* Send Button */}
            <button
              type="submit"
              disabled={disabled || (!input.trim() && attachments.length === 0)}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg transition-all',
                input.trim() || attachments.length > 0
                  ? 'bg-primary text-primary-foreground shadow-sm hover:opacity-90 active:scale-95'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {disabled ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Hidden File Inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => processFiles(e.target.files)}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={(e) => processFiles(e.target.files)}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => processFiles(e.target.files)}
        />
      </form>

      {/* Helper Text */}
      <div className="mt-1.5 flex items-center justify-center gap-1 text-[11px] text-muted-foreground/60">
        <span>Enter 发送</span>
        <span>-</span>
        <span>Shift+Enter 换行</span>
        <span>-</span>
        <span>支持拖拽上传</span>
      </div>
    </div>
  );
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + 'KB';
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}
