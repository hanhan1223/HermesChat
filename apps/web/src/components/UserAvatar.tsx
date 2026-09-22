'use client';

import { useState } from 'react';
import { resolveAvatarUrl } from '@/lib/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  /** 原始 avatarUrl（外链或 /users/:id/avatar） */
  avatarUrl?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-12 w-12 text-base',
  lg: 'h-20 w-20 text-2xl',
};

/**
 * 用户头像：有图显图，无图回落首字母
 */
export function UserAvatar({ avatarUrl, name, size = 'md', className }: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const url = failed ? null : resolveAvatarUrl(avatarUrl);
  const initial = (name || 'U').charAt(0).toUpperCase();

  if (url) {
    return (
      <img
        src={url}
        alt={name || '用户头像'}
        onError={() => setFailed(true)}
        className={cn(
          'shrink-0 rounded-full object-cover',
          sizeMap[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 font-medium text-white',
        sizeMap[size],
        className
      )}
    >
      {initial}
    </div>
  );
}
