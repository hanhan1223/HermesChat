'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User, Key, Palette, LogOut, Save, Coins, Activity, ShoppingCart, ReceiptText, BarChart3, Upload, Link2, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { UserAvatar } from '@/components/UserAvatar';
import { formatNumber } from '@/lib/utils';

const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

type TabId = 'profile' | 'apikeys' | 'billing' | 'preferences';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  // Profile
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API Keys
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);

  // Billing
  const [quota, setQuota] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [usageDays, setUsageDays] = useState(7);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [purchaseNote, setPurchaseNote] = useState('');
  const [purchaseContact, setPurchaseContact] = useState('');
  const [purchaseList, setPurchaseList] = useState<any[]>([]);
  const [submittingPurchase, setSubmittingPurchase] = useState(false);
  const [billingMsg, setBillingMsg] = useState<string | null>(null);

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
      setAvatarUrl(u.avatarUrl || '');
    }
    loadProfile();
    loadApiKeys();
    loadBilling();
  }, [router]);

  useEffect(() => {
    if (activeTab === 'billing') loadUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, usageDays]);

  const applyUser = (u: any) => {
    setUser(u);
    setName(u.name || '');
    setAvatarUrl(u.avatarUrl || '');
    localStorage.setItem('user', JSON.stringify(u));
  };

  const loadProfile = async () => {
    try {
      const profile = await apiClient.getProfile();
      applyUser(profile);
    } catch {}
  };

  const loadApiKeys = async () => {
    try {
      const keys = await apiClient.getApiKeys();
      setApiKeys(keys);
    } catch {}
  };

  const loadBilling = async () => {
    try {
      const [overview, requests] = await Promise.all([
        apiClient.getQuotaOverview(),
        apiClient.getPurchaseRequests(),
      ]);
      setQuota(overview);
      setPurchaseList(Array.isArray(requests) ? requests : []);
    } catch (e: any) {
      setBillingMsg(e?.message || '额度信息加载失败');
    }
  };

  const loadUsage = async () => {
    try {
      const data = await apiClient.getTokenUsage(usageDays);
      setUsage(data);
    } catch {}
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setAvatarMsg(null);
    try {
      const updated = await apiClient.updateProfile({
        name,
        avatarUrl: avatarUrl.trim() || null,
      });
      applyUser(updated);
      setAvatarMsg('已保存');
    } catch (e: any) {
      setAvatarMsg(e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadAvatar = async (file: File) => {
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarMsg('头像不能超过 2MB');
      return;
    }
    setUploading(true);
    setAvatarMsg(null);
    try {
      const updated = await apiClient.uploadAvatar(file);
      applyUser(updated);
      setAvatarMsg('头像已更新');
    } catch (e: any) {
      setAvatarMsg(e.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleClearAvatar = async () => {
    if (!confirm('确定要清除头像吗？')) return;
    setAvatarMsg(null);
    try {
      const updated = await apiClient.clearAvatar();
      applyUser(updated);
      setAvatarUrl('');
      setAvatarMsg('头像已清除');
    } catch (e: any) {
      setAvatarMsg(e.message || '清除失败');
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

  const handleSubmitPurchase = async () => {
    const amount = parseInt(purchaseAmount, 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      setBillingMsg('请输入大于 0 的额度数量');
      return;
    }
    setSubmittingPurchase(true);
    setBillingMsg(null);
    try {
      await apiClient.createPurchaseRequest({
        amount,
        note: purchaseNote.trim() || undefined,
        contact: purchaseContact.trim() || undefined,
      });
      setPurchaseAmount('');
      setPurchaseNote('');
      setBillingMsg('申请已提交，等待管理员处理');
      await loadBilling();
    } catch (e: any) {
      setBillingMsg(e?.message || '提交失败');
    } finally {
      setSubmittingPurchase(false);
    }
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
    { id: 'billing' as const, label: '额度与用量', icon: Coins },
    { id: 'preferences' as const, label: '偏好设置', icon: Palette },
  ];

  const modeLabel = quota?.billingMode === 'FREE' ? '免费使用' : '试用期后付费';
  const trialBadge = quota?.freeAccess
    ? { text: '已开通免费', cls: 'bg-success/10 text-success' }
    : quota?.inTrial
      ? { text: `试用中 · 至 ${formatDate(quota.trialEndAt)}`, cls: 'bg-info/10 text-info' }
      : quota?.requirePurchase
        ? { text: '需购买额度', cls: 'bg-warning/10 text-warning' }
        : { text: modeLabel, cls: 'bg-muted text-muted-foreground' };

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
                <div className="space-y-5">
                  {/* 头像 */}
                  <div>
                    <label className="mb-2 block text-sm text-muted-foreground">头像</label>
                    <div className="flex items-start gap-4">
                      <UserAvatar
                        avatarUrl={avatarUrl || user?.avatarUrl}
                        name={name || user?.name}
                        size="lg"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground hover:bg-accent disabled:opacity-50"
                          >
                            <Upload className="h-4 w-4" />
                            {uploading ? '上传中...' : '上传图片'}
                          </button>
                          {avatarUrl && (
                            <button
                              type="button"
                              onClick={handleClearAvatar}
                              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                              清除
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          支持 JPG / PNG / WebP / GIF，不超过 2MB
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept={AVATAR_ACCEPT}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadAvatar(file);
                            e.target.value = '';
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 外链 */}
                  <div>
                    <label className="mb-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <Link2 className="h-3.5 w-3.5" />
                      头像链接（可选）
                    </label>
                    <input
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://... 或使用上方上传"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      填写外链会覆盖上传的头像；留空则使用上传的头像
                    </p>
                  </div>

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
                  {avatarMsg && (
                    <p className="text-sm text-muted-foreground">{avatarMsg}</p>
                  )}
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

            {activeTab === 'billing' && (
              <div className="space-y-6">
                {/* 概览卡片 */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">剩余额度</span>
                      <Coins className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="text-3xl font-bold text-foreground">{formatNumber(quota?.credits ?? 0)}</div>
                    <div className="mt-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${trialBadge.cls}`}>{trialBadge.text}</span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">累计 Token</span>
                      <Activity className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="text-3xl font-bold text-foreground">{formatNumber(quota?.totalTokenUsed ?? 0)}</div>
                    <div className="mt-2 text-xs text-muted-foreground">计费模式：{modeLabel}</div>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">近 {usageDays} 天消耗</span>
                      <BarChart3 className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="text-3xl font-bold text-foreground">{formatNumber(usage?.totalTokens ?? 0)}</div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      输入 {formatNumber(usage?.totalInputTokens ?? 0)} · 输出 {formatNumber(usage?.totalOutputTokens ?? 0)}
                    </div>
                  </div>
                </div>

                {quota?.inTrial && quota.trialEndAt && (
                  <div className="rounded-lg border border-info/30 bg-info/5 px-4 py-3 text-sm text-foreground">
                    试用期至 {formatDate(quota.trialEndAt)}，结束后需购买额度继续使用。试用赠送 {quota.trialCredits} 积分。
                  </div>
                )}
                {quota?.requirePurchase && (
                  <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-foreground">
                    试用已结束，请在下方提交额度购买申请，管理员通过后到账。
                  </div>
                )}

                {/* Token 消耗趋势 */}
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground">Token 消耗量</h2>
                    <div className="flex gap-2">
                      {[7, 30, 90].map(d => (
                        <button
                          key={d}
                          onClick={() => setUsageDays(d)}
                          className={`rounded-lg px-2.5 py-1 text-xs ${
                            usageDays === d
                              ? 'bg-primary text-primary-foreground'
                              : 'border border-border text-foreground hover:bg-accent'
                          }`}
                        >
                          {d} 天
                        </button>
                      ))}
                    </div>
                  </div>
                  {(usage?.daily?.length ?? 0) === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">暂无 Token 消耗记录</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-xs text-muted-foreground">
                            <th className="py-2 pr-4">日期</th>
                            <th className="py-2 pr-4">输入</th>
                            <th className="py-2 pr-4">输出</th>
                            <th className="py-2 pr-4">合计</th>
                            <th className="py-2">成本 (USD)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usage.daily.map((row: any) => (
                            <tr key={row.usageDate} className="border-b border-border/50">
                              <td className="py-2 pr-4 text-foreground">{row.usageDate}</td>
                              <td className="py-2 pr-4 text-foreground">{formatNumber(row.inputTokens)}</td>
                              <td className="py-2 pr-4 text-foreground">{formatNumber(row.outputTokens)}</td>
                              <td className="py-2 pr-4 font-medium text-foreground">{formatNumber(row.totalTokens)}</td>
                              <td className="py-2 text-muted-foreground">{(row.cost || 0).toFixed(4)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 额度购买申请 */}
                <div className="rounded-xl border border-border bg-card p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                    <ShoppingCart className="h-5 w-5" />
                    额度购买申请
                  </h2>
                  {billingMsg && (
                    <div className="mb-4 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground">
                      {billingMsg}
                    </div>
                  )}
                  <div className="mb-4 space-y-3">
                    <div>
                      <label className="mb-1 block text-sm text-muted-foreground">申请额度数量</label>
                      <input
                        type="number"
                        min={1}
                        value={purchaseAmount}
                        onChange={(e) => setPurchaseAmount(e.target.value)}
                        placeholder="例如 10000"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-muted-foreground">联系方式（手机 / 邮箱 / 微信）</label>
                      <input
                        value={purchaseContact}
                        onChange={(e) => setPurchaseContact(e.target.value)}
                        placeholder="便于管理员联系确认"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-muted-foreground">备注（用途 / 期望到账时间）</label>
                      <textarea
                        value={purchaseNote}
                        onChange={(e) => setPurchaseNote(e.target.value)}
                        rows={3}
                        placeholder="可选"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                      />
                    </div>
                    <button
                      onClick={handleSubmitPurchase}
                      disabled={submittingPurchase || !purchaseAmount}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    >
                      {submittingPurchase ? '提交中...' : '提交购买申请'}
                    </button>
                  </div>

                  <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                    <ReceiptText className="h-4 w-4" />
                    申请记录
                  </h3>
                  {purchaseList.length === 0 ? (
                    <p className="py-3 text-sm text-muted-foreground">暂无申请记录</p>
                  ) : (
                    <div className="space-y-2">
                      {purchaseList.map((req: any) => (
                        <div key={req.id} className="rounded-lg border border-border px-4 py-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground">{formatNumber(req.amount)} 额度</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass(req.status)}`}>
                              {statusLabel(req.status)}
                            </span>
                          </div>
                          {req.note && <div className="mt-1 text-xs text-muted-foreground">备注：{req.note}</div>}
                          {req.adminNote && <div className="mt-1 text-xs text-muted-foreground">管理员：{req.adminNote}</div>}
                          {req.status === 'APPROVED' && req.grantedAmount != null && (
                            <div className="mt-1 text-xs text-success">已到账 {formatNumber(req.grantedAmount)}</div>
                          )}
                          <div className="mt-1 text-xs text-muted-foreground">
                            提交于 {formatDate(req.createdAt)}
                            {req.reviewedAt ? ` · 处理于 ${formatDate(req.reviewedAt)}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
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

function formatDate(value?: string | Date | null) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('zh-CN');
  } catch {
    return String(value);
  }
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    PENDING: '待处理',
    APPROVED: '已通过',
    REJECTED: '已拒绝',
  };
  return map[status] || status;
}

function statusClass(status: string) {
  const map: Record<string, string> = {
    PENDING: 'bg-warning/10 text-warning',
    APPROVED: 'bg-success/10 text-success',
    REJECTED: 'bg-destructive/10 text-destructive',
  };
  return map[status] || 'bg-muted text-muted-foreground';
}
