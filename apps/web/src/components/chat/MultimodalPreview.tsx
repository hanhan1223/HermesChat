'use client';

import { useState } from 'react';
import { ImageIcon, FileText, X } from 'lucide-react';

/**
 * 多模态预览组件
 * 展示图片和文件附件
 */
export function MultimodalPreview({ attachments, onRemove }: { attachments: any[]; onRemove?: (index: number) => void }) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((att, i) => (
        <div key={i} className="relative rounded-lg border border-slate-700 bg-slate-800">
          {att.type === 'image' ? (
            <img src={att.url} alt={att.name} className="h-20 w-20 rounded-lg object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
          )}
          {onRemove && (
            <button
              onClick={() => onRemove(i)}
              className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}