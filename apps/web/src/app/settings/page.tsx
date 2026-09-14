'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Key, Bell, Palette, LogOut, Save } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'apikeys' | 'preferences'>('profile');

  // Profile
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  // API Keys
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }
    const stored = localStorage.getItem('user');
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      setName(u.name || '');
    }
    loadApiKeys();
  }, [router]);

  const loadApiKeys = async () => {
    try {
      const keys = await apiClient.getApiKeys();
      setApiKeys(keys);
    } catch {}
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const updated = { ...user, name };
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    try {
      const result = await apiClient.createApiKey(newKeyName);
      setNewKeyValue(result.key);
      setNewKeyName('');
      loadApiKeys();
    } catch (e: any) {
      alert(e.message || '创建失败');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm('确定要吊销这个 API Key 吗？')) return;
    try {
      await apiClient.revokeApiKey(id);
      loadApiKeys();
    } catch {}
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('guest_mode');
    apiClient.setToken(null);
    router.push('/login');
  };

  const tabs = [
    { id: 'profile' as const, label: '个人资料', icon: User },
    { id: 'apikeys' as const, label: 'API Key', icon: Key },
    { id: 'preferences' as const, label: '偏好设置', icon: Palette },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">设置</h1>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* 侧边栏 */}
          <nav className="w-48 space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>

          {/* 内容区 */}
          <div className="flex-1">
            {activeTab === 'profile' && (
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="mb-4 text-lg font-semibold text-foreground">个人资料</h2>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm text-muted-foreground">邮箱</label>
                    <input
                      value={user?.email || ''}
                      disabled
                      className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-muted-foreground">昵称</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-muted-foreground">角色</label>
                    <input
                      value={user?.role || 'USER'}
                      disabled
                      className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
                    />
                  </div>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'apikeys' && (
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="mb-4 text-lg font-semibold text-foreground">API Key 管理</h2>

                {newKeyValue && (
                  <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                    <p className="mb-2 text-sm font-medium text-foreground">请立即保存你的 API Key（仅显示一次）：</p>
                    <code className="block rounded bg-muted px-3 py-2 text-xs text-foreground break-all">
                      {newKeyValue}
                    </code>
                    <button
                      onClick={() => setNewKeyValue(null)}
                      className="mt-2 text-xs text-primary hover:underline"
                    >
                      我已保存
                    </button>
                  </div>
                )}

                <div className="mb-4 flex gap-2">
                  <input
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Key 名称"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                  <button
                    onClick={handleCreateKey}
                    disabled={creatingKey || !newKeyName.trim()}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {creatingKey ? '创建中...' : '创建'}
                  </button>
                </div>

                <div className="space-y-2">
                  {apiKeys.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">暂无 API Key</p>
                  ) : (
                    apiKeys.map(key => (
                      <div
                        key={key.id}
                        className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                      >
                        <div>
                          <div className="text-sm font-medium text-foreground">{key.name}</div>
                          <div className="text-xs text-muted-foreground">{key.keyPrefix}</div>
                        </div>
                        <button
                          onClick={() => handleRevokeKey(key.id)}
                          className="text-xs text-destructive hover:underline"
                        >
                          吊销
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="mb-4 text-lg font-semibold text-foreground">偏好设置</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-foreground">主题</div>
                      <div className="text-xs text-muted-foreground">切换亮色/暗色模式</div>
                    </div>
                    <ThemeToggle />
                  </div>
                  <div className="border-t border-border pt-4">
                    <div className="text-sm text-muted-foreground">
                      更多偏好设置（语言、默认模型、通知等）即将上线。
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
