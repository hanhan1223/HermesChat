'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen, FileText, Image, Code, Download, Trash2,
  Upload, RefreshCw, File, Film, Music, Archive, Eye,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

/**
 * 云盘组件 — 会话级文件管理
 * 展示当前会话的所有文件（用户上传 + 系统生成）
 */
export function FileCloud({ conversationId }: { conversationId: string | null }) {
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<CloudFile | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadFiles = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const data = await apiClient.listFiles(conversationId);
      setFiles(Array.isArray(data) ? data : []);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversationId) return;
    setUploading(true);
    try {
      await apiClient.uploadFile(conversationId, file);
      await loadFiles();
    } catch {
      alert('上传失败');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (file: CloudFile) => {
    if (!confirm(`确定删除 ${file.filename}？`)) return;
    try {
      await apiClient.deleteFile(file.objectPath);
      await loadFiles();
    } catch {
      alert('删除失败');
    }
  };

  const handleDownload = (file: CloudFile) => {
    const a = document.createElement('a');
    a.href = file.downloadUrl;
    a.download = file.filename;
    a.target = '_blank';
    a.click();
  };

  const getFileIcon = (contentType: string, filename: string) => {
    if (contentType?.startsWith('image/')) return <Image className="w-5 h-5 text-green-500" />;
    if (contentType?.startsWith('video/')) return <Film className="w-5 h-5 text-purple-500" />;
    if (contentType?.startsWith('audio/')) return <Music className="w-5 h-5 text-pink-500" />;
    if (contentType?.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (contentType?.includes('html') || filename?.endsWith('.html')) return <Code className="w-5 h-5 text-orange-500" />;
    if (filename?.match(/\.(zip|rar|7z|tar|gz)$/i)) return <Archive className="w-5 h-5 text-yellow-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isPreviewable = (file: CloudFile) => {
    return file.contentType?.startsWith('image/') ||
           file.contentType?.includes('html') ||
           file.contentType?.includes('pdf') ||
           file.contentType?.startsWith('text/') ||
           file.filename?.endsWith('.html') ||
           file.filename?.endsWith('.md');
  };

  if (!conversationId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <FolderOpen className="w-12 h-12 mb-3" />
        <p className="text-sm">选择一个会话后查看文件</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium">会话文件</span>
          <span className="text-xs text-gray-400">({files.length})</span>
        </div>
        <div className="flex gap-1">
          <label className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">
            <Upload className="w-4 h-4" />
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
          <button onClick={loadFiles} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 文件列表 */}
      <div className="flex-1 overflow-y-auto p-2">
        {uploading && (
          <div className="text-center py-2 text-sm text-blue-500">上传中...</div>
        )}
        {files.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <File className="w-8 h-8 mb-2" />
            <p className="text-xs">暂无文件</p>
          </div>
        )}
        {files.map((file) => (
          <div
            key={file.objectPath}
            className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {getFileIcon(file.contentType, file.filename)}
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{file.filename}</p>
              <p className="text-xs text-gray-400">
                {formatSize(file.size)}
                {file.isGenerated && (
                  <span className="ml-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded text-[10px]">
                    系统生成
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {isPreviewable(file) && (
                <button
                  onClick={() => setPreviewFile(file)}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                  title="预览"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => handleDownload(file)}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                title="下载"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(file)}
                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-500"
                title="删除"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 预览弹窗 */}
      {previewFile && (
        <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </div>
  );
}

/** 文件预览弹窗 */
function FilePreviewModal({ file, onClose }: { file: CloudFile; onClose: () => void }) {
  const isImage = file.contentType?.startsWith('image/');
  const isHtml = file.contentType?.includes('html') || file.filename?.endsWith('.html');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-[90vw] h-[85vh] bg-white dark:bg-gray-900 rounded-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm font-medium truncate">{file.filename}</span>
          <div className="flex gap-2">
            <button onClick={() => window.open(file.downloadUrl, '_blank')} className="text-sm text-blue-500 hover:underline">
              下载
            </button>
            <button onClick={onClose} className="text-sm text-gray-500 hover:underline">关闭</button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {isImage && (
            <img src={file.downloadUrl} alt={file.filename} className="w-full h-full object-contain" />
          )}
          {isHtml && (
            <iframe src={file.downloadUrl} className="w-full h-full border-0" sandbox="allow-scripts" />
          )}
          {!isImage && !isHtml && (
            <iframe src={file.downloadUrl} className="w-full h-full border-0" />
          )}
        </div>
      </div>
    </div>
  );
}

interface CloudFile {
  objectPath: string;
  filename: string;
  size: number;
  contentType: string;
  downloadUrl: string;
  uploadedAt: string;
  isGenerated?: boolean;
}
