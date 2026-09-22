'use client';

import { useState } from 'react';
import { FileText, X, Copy, Check, Download } from 'lucide-react';
import { ImageBlock } from './CodeBlock';

/**
 * 多模态预览：图片带复制/下载，文件可下载
 */
export function MultimodalPreview({ attachments, onRemove }: { attachments: any[]; onRemove?: (index: number) => void }) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((att, i) => (
        <div key={i} className="relative">
          {att.type === 'image' ? (
            <ImageBlock src={att.url} alt={att.name} name={att.name} className="w-40" />
          ) : (
            <div className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-muted">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <a
                href={att.url}
                download={att.name}
                title="下载"
                className="text-[10px] text-muted-foreground underline hover:text-foreground"
              >
                下载
              </a>
            </div>
          )}
          {onRemove && (
            <button
              onClick={() => onRemove(i)}
              className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-white"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}