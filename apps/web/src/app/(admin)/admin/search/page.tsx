'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Plus, RefreshCw } from 'lucide-react';

const API = '/admin/api/search-providers';

const TYPE_OPTIONS = [
  { value: 'tavily', label: 'Tavily（联网搜索）', hint: 'web_search / google_search 回退' },
  { value: 'google', label: 'Google / SerpAPI', hint: 'google_search' },
  { value: 'pubmed', label: 'PubMed (NCBI)', hint: 'pubmed_search · 通常免费' },
  { value: 'scholar', label: 'Google Scholar / SerpAPI', hint: 'scholar_search · google_scholar' },
  { value: 'semantic_scholar', label: 'Semantic Scholar', hint: 'scholar_search · 默认免费' },
];

const emptyForm = {
  name: '',
  providerType: 'tavily',
  apiKey: '',
  baseUrl: '',
  costPerCall: 1,
  dailyQuota: '',
  rateLimitPerMinute: 30,
  priority: 0,
  enabled: true,
};

function authHeaders(json = true): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: 'Bearer ' + localStorage.getItem('token'),
  };
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

export default function SearchProvidersPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [usage, setUsage] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pRes, uRes, sRes] = await Promise.all([
        fetch(`${API}?all=true`, { headers: authHeaders() }),
        fetch(`${API}/usage?size=15`, { headers: authHeaders() }),
        fetch(`${API}/stats?days=30`, { headers: authHeaders() }),
      ]);
      if (pRes.ok) setProviders(await pRes.json());
      if (uRes.ok) {
        const data = await uRes.json();
        setUsage(data.content || data || []);
      }
      if (sRes.ok) setStats(await sRes.json());
      if (!pRes.ok) setError('加载失败，请确认已登录管理后台且服务已启动');
    } catch {
      setError('无法连接管理后台');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      name: p.name || '',
      providerType: p.providerType || 'tavily',
      apiKey: '',
      baseUrl: p.baseUrl || '',
      costPerCall: p.costPerCall ?? 1,
      dailyQuota: p.dailyQuota == null ? '' : String(p.dailyQuota),
      rateLimitPerMinute: p.rateLimitPerMinute ?? 30,
      priority: p.priority ?? 0,
      enabled: !!p.enabled,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        providerType: form.providerType,
        baseUrl: form.baseUrl || null,
        costPerCall: Number(form.costPerCall) || 0,
        rateLimitPerMinute: Number(form.rateLimitPerMinute) || 30,
        priority: Number(form.priority) || 0,
        enabled: form.enabled,
        dailyQuota: form.dailyQuota === '' ? -1 : Number(form.dailyQuota),
      };
      // 编辑时留空 API Key 表示不修改
      if (!editId || form.apiKey) body.apiKey = form.apiKey;

      const url = editId ? `${API}/${editId}` : API;
      const res = await fetch(url, {
        method: editId ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.message || '保存失败');
        return;
      }
      setShowModal(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (p: any) => {
    await fetch(`${API}/${p.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ enabled: !p.enabled }),
    });
    load();
  };

  if (loading) return <div className="text-muted-foreground">加载中...</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Search className="h-6 w-6" /> 搜索服务
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tavily / Google / PubMed / Scholar 的 API Key、单次积分与限流；Harness Agent 工具实时读取此配置
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground hover:bg-accent"
          >
            <RefreshCw className="h-4 w-4" /> 刷新
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> 添加服务
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {stats && (
        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">近 {stats.days} 天积分消耗</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{stats.totalCredits ?? 0}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 md:col-span-2">
            <p className="text-xs text-muted-foreground">按服务调用分布</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(stats.byProvider || []).map((row: any) => (
                <span
                  key={row.providerType}
                  className="rounded bg-muted px-2 py-1 text-xs text-foreground"
                >
                  {row.providerType}: {row.calls} 次 / {row.credits || 0} 分
                </span>
              ))}
              {!(stats.byProvider || []).length && (
                <span className="text-xs text-muted-foreground">暂无调用</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {providers.map((p) => (
          <div
            key={p.id}
            className={
              'rounded-xl border p-4 ' +
              (p.enabled ? 'border-border bg-card' : 'border-border bg-card/50 opacity-60')
            }
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium text-foreground">{p.name}</h3>
              <span
                className={
                  'rounded px-2 py-0.5 text-xs ' +
                  (p.enabled ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground')
                }
              >
                {p.enabled ? '启用' : '禁用'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{p.providerType}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Key: {p.hasApiKey ? p.apiKeyMasked : '未配置'} · 单价 {p.costPerCall} 分/次
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              日配额: {p.dailyQuota == null ? '不限' : p.dailyQuota} · 限流{' '}
              {p.rateLimitPerMinute}/min
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => openEdit(p)}
                className="rounded bg-muted px-2 py-1 text-xs text-foreground hover:bg-accent"
              >
                编辑
              </button>
              <button
                type="button"
                onClick={() => handleToggle(p)}
                className="rounded bg-muted px-2 py-1 text-xs text-foreground hover:bg-accent"
              >
                {p.enabled ? '禁用' : '启用'}
              </button>
            </div>
          </div>
        ))}
        {!providers.length && (
          <div className="col-span-full rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            尚未配置搜索服务。可添加 Tavily（推荐联网搜索），或直接使用免费的 PubMed / Semantic Scholar。
          </div>
        )}
      </div>

      <h2 className="mb-3 text-lg font-semibold text-foreground">最近调用</h2>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">时间</th>
              <th className="px-3 py-2">服务</th>
              <th className="px-3 py-2">工具</th>
              <th className="px-3 py-2">查询</th>
              <th className="px-3 py-2">结果</th>
              <th className="px-3 py-2">积分</th>
              <th className="px-3 py-2">状态</th>
            </tr>
          </thead>
          <tbody>
            {usage.map((u) => (
              <tr key={u.id} className="border-b border-border/50 last:border-0">
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'}
                </td>
                <td className="px-3 py-2">{u.providerType}</td>
                <td className="px-3 py-2">{u.toolName}</td>
                <td className="max-w-[200px] truncate px-3 py-2">{u.query}</td>
                <td className="px-3 py-2">{u.resultCount}</td>
                <td className="px-3 py-2">{u.creditsCost}</td>
                <td className="px-3 py-2">
                  {u.success ? (
                    <span className="text-success">成功</span>
                  ) : (
                    <span className="text-destructive" title={u.errorMessage || ''}>
                      失败
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {!usage.length && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  暂无调用记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              {editId ? '编辑搜索服务' : '添加搜索服务'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">类型</label>
                <select
                  value={form.providerType}
                  onChange={(e) => {
                    const t = e.target.value;
                    const preset = TYPE_OPTIONS.find((o) => o.value === t);
                    const defaultCost =
                      t === 'tavily' || t === 'google' || t === 'scholar' ? 1 : 0;
                    setForm({
                      ...form,
                      providerType: t,
                      name: form.name || preset?.label || t,
                      costPerCall: editId ? form.costPerCall : defaultCost,
                    });
                  }}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground outline-none"
                >
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {TYPE_OPTIONS.find((o) => o.value === form.providerType)?.hint}
                </p>
              </div>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="显示名称"
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground outline-none"
              />
              <div>
                <input
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder={editId ? 'API Key（留空则不修改）' : 'API Key（免费源可留空）'}
                  type="password"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground outline-none"
                />
              </div>
              <input
                value={form.baseUrl}
                onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                placeholder="Base URL（可选，留空用官方默认）"
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">积分/次</label>
                  <input
                    value={form.costPerCall}
                    onChange={(e) => setForm({ ...form, costPerCall: parseInt(e.target.value) || 0 })}
                    type="number"
                    min={0}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">日配额（空=不限）</label>
                  <input
                    value={form.dailyQuota}
                    onChange={(e) => setForm({ ...form, dailyQuota: e.target.value })}
                    type="number"
                    min={0}
                    placeholder="不限"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">限流/分钟</label>
                  <input
                    value={form.rateLimitPerMinute}
                    onChange={(e) =>
                      setForm({ ...form, rateLimitPerMinute: parseInt(e.target.value) || 30 })
                    }
                    type="number"
                    min={1}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">优先级</label>
                  <input
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                    type="number"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                />
                启用
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !form.name}
                className="flex-1 rounded-lg bg-primary py-2 text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg bg-muted py-2 text-foreground hover:bg-accent"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
