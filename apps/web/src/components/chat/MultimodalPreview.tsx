'use client';

import { useState } from 'react';
import { ImageIcon, FileText, X, Video, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Attachment {
  id?: string;
  name: string;
  type: 'image' | 'video' | 'file';
  url?: string;
  preview?: string;
  size?: number;
}

interface MultimodalPreviewProps {
  attachments: Attachment[];
  onRemove?: (index: number) => void;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 多模态预览组件 - 增强版
 * 展示图片、视频和文件附件
 * 支持：预览放大、移除、尺寸调整
 */
export function MultimodalPreview({
  attachments,
  onRemove,
  size = 'md',
}: MultimodalPreviewProps) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (!attachments || attachments.length === 0) return null;

  const sizeClasses = {
    sm: { container: 'h-12 w-12', icon: 'h-5 w-5' },
    md: { container: 'h-20 w-20', icon: 'h-8 w-8' },
    lg: { container: 'h-28 w-28', icon: 'h-10 w-10' },
  };

  const s = sizeClasses[size];

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {attachments.map((att, i) => (
          <div
            key={att.id || i}
            className={cn(
              'group relative overflow-hidden rounded-lg border border-border bg-muted/50 transition-all hover:border-border/80',
              s.container
            )}
          >
            {att.type === 'image' && (
              <>
                <img
                  src={att.url || att.preview}
                  alt={att.name}
                  className="h-full w-full cursor-pointer object-cover"
                  onClick={() => setExpanded(i)}
                />
              </>
            )}
            {att.type === 'video' && (
              <div
                className="relative flex h-full w-full cursor-pointer items-center justify-center bg-black/5"
                onClick={() => setExpanded(i)}
              >
                {att.preview ? (
                  <video src={att.preview} className="h-full w-full object-cover" />
                ) : (
                  <Video className={cn(s.icon, 'text-muted-foreground')} />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="rounded-full bg-white/90 p-1.5">
                    <Play className="h-3 w-3 text-black" />
                  </div>
                </div>
              </div>
            )}
            {att.type === 'file' && (
              <div className="flex h-full w-full flex-col items-center justify-center p-1">
                <FileText className={cn(s.icon, 'text-muted-foreground')} />
                <span className="mt-0.5 w-full truncate text-center text-[8px] text-muted-foreground">
                  {att.name.split('.').pop()?.toUpperCase()}
                </span>
              </div>
            )}

            {/* Remove Button */}
            {onRemove && (
              <button
                onClick={() => onRemove(i)}
                className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            )}

            {/* File Name Tooltip */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1 py-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <p className="truncate text-[8px] text-white">{att.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Expanded Image/Video Modal */}
      {expanded !== null && attachments[expanded] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in"
          onClick={() => setExpanded(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            {attachments[expanded].type === 'image' && (
              <img
                src={attachments[expanded].url || attachments[expanded].preview}
                alt={attachments[expanded].name}
                className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
              />
            )}
            {attachments[expanded].type === 'video' && (
              <video
                src={attachments[expanded].url || attachments[expanded].preview}
                controls
                autoPlay
                className="max-h-[90vh] max-w-[90vw] rounded-lg"
              />
            )}
            <button
              onClick={() => setExpanded(null)}
              className="absolute -right-2 -top-2 rounded-full bg-white p-1 text-black shadow-lg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
