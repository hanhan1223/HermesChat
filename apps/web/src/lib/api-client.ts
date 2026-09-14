/**
 * API 客户端 - 统一封装后端请求
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken() {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: '请求失败' }));
      throw new Error(error.message || `请求失败 (${res.status})`);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return res.json();
  }

  // ==================== 认证 ====================
  login(email: string, password: string) {
    return this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  register(email: string, password: string, name?: string) {
    return this.request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
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

  deleteConversation(id: string) {
    return this.request<void>(`/conversations/${id}`, { method: 'DELETE' });
  }

  renameConversation(id: string, title: string) {
    return this.request<any>(`/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  }

  getMessages(conversationId: string) {
    return this.request<any[]>(`/messages/${conversationId}`);
  }

  shareConversation(conversationId: string) {
    return this.request<any>(`/conversations/${conversationId}/share`, {
      method: 'POST',
    });
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
    return this.request<any>(`/mcp/${id}/connect`, { method: 'POST' });
  }

  // ==================== 模型 ====================
  getModels() {
    return this.request<any[]>('/models');
  }

  // ==================== API Key ====================
  getApiKeys() {
    return this.request<any[]>('/api-keys');
  }

  createApiKey(name: string, expiresInDays?: number) {
    return this.request<{ id: string; key: string; prefix: string }>('/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name, expiresInDays }),
    });
  }

  revokeApiKey(id: string) {
    return this.request<void>(`/api-keys/${id}`, { method: 'DELETE' });
  }

  // ==================== 知识库 ====================
  getKnowledgeDatasets() {
    return this.request<any[]>('/knowledge/datasets');
  }

  createKnowledgeDataset(name: string, description?: string) {
    return this.request<any>('/knowledge/datasets', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  // ==================== 成本 ====================
  getCostStats(days?: number) {
    return this.request<any>(`/traces/cost?days=${days || 30}`);
  }
}

// 全局单例
export const apiClient = new ApiClient();
