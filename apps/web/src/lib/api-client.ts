/**
 * API 客户端 - 统一封装后端请求
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (this.token) {
      headers['Authorization'] = 'Bearer ' + this.token;
    }

    const res = await fetch(API_BASE + path, { ...options, headers });
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: '请求失败' }));
      throw new Error(error.message || '请求失败');
    }

    return res.json();
  }

  // ==================== 认证 ====================
  login(email: string, password: string) {
    return request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // ==================== 对话 ====================
  getConversations() {
    return this.request<any[]>('/conversations');
  }

  createConversation(data: { title?: string; modelId: string }) {
    return this.request<any>('/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getMessages(conversationId: string) {
    return this.request<any[]>('/messages/' + conversationId);
  }

  shareConversation(conversationId: string) {
    return this.request<any>('/conversations/' + conversationId + '/share', { method: 'POST' });
  }

  // ==================== 短链 ====================
  createShortLink(url: string) {
    return this.request<any>('/short-links', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  // ==================== Skill ====================
  getSkills() {
    return this.request<any[]>('/skills');
  }

  createSkill(data: any) {
    return this.request<any>('/skills', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== MCP ====================
  getMcpServers() {
    return this.request<any[]>('/mcp');
  }

  connectMcp(id: string) {
    return this.request<any>('/mcp/' + id + '/connect', { method: 'POST' });
  }

  // ==================== 模型 ====================
  getModels() {
    return this.request<any[]>('/models');
  }
}

// 全局单例
export const apiClient = new ApiClient();

// 兼容旧代码
function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiClient.request<T>(path, options);
}