'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Gift, Sparkles, CreditCard } from 'lucide-react';

type BillingMode = 'FREE' | 'TRIAL_THEN_PAID';

export default function BillingPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [trialDays, setTrialDays] = useState('7');
  const [trialCredits, setTrialCredits] = useState('100');

  useEffect(() => {
    fetchConfig();
  }, []);

  const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + localStorage.getItem('token'),
  });

  const fetchConfig = async () => {
    try {
      const res = await fetch('/admin/api/billing/config', { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setTrialDays(String(data.trialDays ?? 7));
        setTrialCredits(String(data.trialCredits ?? 100));
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  /** 一键切换计费模式 */
  const setMode = async (mode: BillingMode) => {
    if (!confirm(mode === 'FREE' ? '一键将平台设为「用户免费使用」？' : '一键将平台设为「试用期后需要付费」？')) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/admin/api/billing/mode', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ mode }),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setMsg(mode === 'FREE' ? '已设为用户免费使用' : '已设为试用期后付费');
      } else {
        const err = await res.json().catch(() => ({}));
        setMsg(err.message || '设置失败');
      }
    } catch (e: any) {
      setMsg(e?.message || '设置失败');
    } finally {
      setSaving(false);
    }
  };

  const saveTrialConfig = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/admin/api/billing/config', {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({
          trialDays: parseInt(trialDays, 10),
          trialCredits: parseInt(trialCredits, 10),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setMsg('试用配置已保存');
      } else {
        const err = await res.json().catch(() => ({}));
        setMsg(err.message || '保存失败');
      }
    } catch (e: any) {
      setMsg(e?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-muted-foreground">加载中...</div>;

  const mode = config?.mode as BillingMode;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-foreground">计费设置</h1>
      <p className="mb-6 text-sm text-muted-foreground">一键切换平台计费策略：用户免费使用，或试用期结束后需要付费。</p>

      {msg && (
        <div className="mb-4 rounded-lg border border-border bg-muted px-4 py-2 text-sm text-foreground">{msg}</div>
      )}

      {/* 一键切换 */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => setMode('FREE')}
          className={`rounded-xl border-2 p-6 text-left transition ${
            mode === 'FREE'
              ? 'border-success bg-success/5'
              : 'border-border bg-card hover:border-success/50'
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-success" />
              <span className="text-lg font-semibold text-foreground">用户免费使用</span>
            </div>
            {mode === 'FREE' && <CheckCircle2 className="h-5 w-5 text-success" />}
          </div>
          <p className="text-sm text-muted-foreground">
            所有用户可直接使用，不强制试用期或购买额度。适合内测、演示或内部开放阶段。
          </p>
          <div
            className={`mt-4 inline-flex rounded-lg px-3 py-1.5 text-sm font-medium ${
              mode === 'FREE' ? 'bg-success text-white' : 'bg-primary text-primary-foreground'
            }`}
          >
            {mode === 'FREE' ? '当前模式' : '一键设为免费'}
          </div>
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => setMode('TRIAL_THEN_PAID')}
          className={`rounded-xl border-2 p-6 text-left transition ${
            mode === 'TRIAL_THEN_PAID'
              ? 'border-warning bg-warning/5'
              : 'border-border bg-card hover:border-warning/50'
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-warning" />
              <span className="text-lg font-semibold text-foreground">试用期后付费</span>
            </div>
            {mode === 'TRIAL_THEN_PAID' && <CheckCircle2 className="h-5 w-5 text-warning" />}
          </div>
          <p className="text-sm text-muted-foreground">
            新用户可免费试用一段时间，试用结束后需提交额度购买申请才能继续使用。
          </p>
          <div
            className={`mt-4 inline-flex rounded-lg px-3 py-1.5 text-sm font-medium ${
              mode === 'TRIAL_THEN_PAID' ? 'bg-warning text-white' : 'bg-primary text-primary-foreground'
            }`}
          >
            {mode === 'TRIAL_THEN_PAID' ? '当前模式' : '一键设为试用后付费'}
          </div>
        </button>
      </div>

      {/* 试用参数 */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
          <Sparkles className="h-5 w-5" />
          试用期参数
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          仅在「试用期后付费」模式下生效。重置用户试用期时按此配置重新起算并发放试用积分。
        </p>
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">试用天数</label>
            <input
              type="number"
              min={0}
              max={365}
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">试用赠送积分</label>
            <input
              type="number"
              min={0}
              value={trialCredits}
              onChange={(e) => setTrialCredits(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={saveTrialConfig}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存试用配置'}
        </button>
      </div>
    </div>
  );
}
