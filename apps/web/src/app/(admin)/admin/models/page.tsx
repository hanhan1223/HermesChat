'use client';

import { useState, useEffect } from 'react';

export default function ModelsPage() {
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editModel, setEditModel] = useState<any>(null);
  const [form, setForm] = useState({ name: '', provider: 'openai', modelId: '', apiKey: '', maxTokens: 4096, priority: 0 });

  useEffect(() => { fetchModels(); }, []);

  const fetchModels = async () => {
    try {
      const res = await fetch('/admin/api/models?all=true', {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
      });
      if (res.ok) setModels(await res.json());
    } catch {} finally { setLoading(false); }
  };

  const handleSave = async () => {
    const url = editModel ? '/admin/api/models/' + editModel.id : '/admin/api/models';
    const method = editModel ? 'PUT' : 'POST';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token') },
      body: JSON.stringify(form),
    });
    setShowModal(false);
    fetchModels();
  };

  const handleToggle = async (model: any) => {
    await fetch('/admin/api/models/' + model.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token') },
      body: JSON.stringify({ enabled: !model.enabled }),
    });
    fetchModels();
  };

  if (loading) return <div className="text-muted-foreground">加载中...</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">模型池</h1>
        <button
          type="button"
          onClick={() => {
            setEditModel(null);
            setForm({ name: '', provider: 'openai', modelId: '', apiKey: '', maxTokens: 4096, priority: 0 });
            setShowModal(true);
          }}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
        >
          + 添加模型
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {models.map((model) => (
          <div
            key={model.id}
            className={
              'rounded-xl border p-4 ' +
              (model.enabled ? 'border-border bg-card' : 'border-border bg-card/50 opacity-60')
            }
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium text-foreground">{model.name}</h3>
              <span className={'rounded px-2 py-0.5 text-xs ' + (model.enabled ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground')}>
                {model.enabled ? '启用' : '禁用'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{model.provider} / {model.modelId}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              优先级: {model.priority} | 最大 Token: {model.maxTokens}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => { setEditModel(model); setForm(model); setShowModal(true); }}
                className="rounded bg-muted px-2 py-1 text-xs text-foreground hover:bg-accent"
              >
                编辑
              </button>
              <button
                type="button"
                onClick={() => handleToggle(model)}
                className="rounded bg-muted px-2 py-1 text-xs text-foreground hover:bg-accent"
              >
                {model.enabled ? '禁用' : '启用'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              {editModel ? '编辑模型' : '添加模型'}
            </h3>
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="名称" className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground outline-none" />
              <select value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground outline-none">
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="google">Google</option>
                <option value="local">本地模型</option>
              </select>
              <input value={form.modelId} onChange={e => setForm({ ...form, modelId: e.target.value })} placeholder="模型 ID" className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground outline-none" />
              <input value={form.apiKey} onChange={e => setForm({ ...form, apiKey: e.target.value })} placeholder="API Key" type="password" className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground outline-none" />
              <div className="flex gap-2">
                <input value={form.maxTokens} onChange={e => setForm({ ...form, maxTokens: parseInt(e.target.value) })} placeholder="最大 Token" type="number" className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-foreground outline-none" />
                <input value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) })} placeholder="优先级" type="number" className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-foreground outline-none" />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={handleSave} className="flex-1 rounded-lg bg-primary py-2 text-primary-foreground hover:opacity-90">保存</button>
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-lg bg-muted py-2 text-foreground hover:bg-accent">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
