/**
 * 头像 URL 解析
 *
 * avatarUrl 三种形态：
 * - 外链 / data: —— 直接使用
 * - /users/{id}/avatar —— 拼上 API 前缀（上传头像的稳定路径）
 */
import { API_BASE } from './api-client';

export function resolveAvatarUrl(avatarUrl?: string | null): string | null {
  if (!avatarUrl) return null;
  if (
    avatarUrl.startsWith('http://') ||
    avatarUrl.startsWith('https://') ||
    avatarUrl.startsWith('data:image/')
  ) {
    return avatarUrl;
  }
  const path = avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`;
  return `${API_BASE}${path}`;
}
