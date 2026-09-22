'use client';

import { useEffect, useState } from 'react';
import { formatNumber } from '@/lib/utils';

const STATUS_LABEL: Record<string, string> = {
  PENDING: '待处理',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: 'bg-warning/10 text-warning',
  APPROVED: 'bg-success/10 text-success',
  REJECTED: 'bg-destructive/10 text-destructive',
};

export default function PurchaseRequestsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [grantedAmount, setGrantedAmount] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchList();
  }, [statusFilter]);

  const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + localStorage.getItem('token'),
  });

  const fetchList = async () => {
    setLoading(true);
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : '';
      const res = await fetch('/admin/api/purchase-requests' + qs, { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setItems(data.content || data.items || []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const openReview = (item: any, action: 'approve' | 'reject') => {
    setReviewTarget(item);
    setReviewAction(action);
    setGrantedAmount(String(item.amount ?? ''));
    setAdminNote('');
    setMsg(null);
  };

  const submitReview = async () => {
    if (!reviewTarget) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const body: any = { adminNote: adminNote.trim() || undefined };
      if (reviewAction === 'approve') {
        const n = parseInt(grantedAmount, 10);
        if (!Number.isFinite(n) || n <= 0) {
          setMsg('发放额度必须大于 0');
          setSubmitting(false);
          return;
        }
        body.grantedAmount = n;
      }
      const res = await fetch(`/admin/api/purchase-requests/${reviewTarget.id}/${reviewAction}`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setReviewTarget(null);
        await fetchList();
      } else {
        const err = await res.json().catch(() => ({}));
        setMsg(err.message || '处理失败');
      }
    } catch (e: any) {
      setMsg(e?.message || '处理失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">额度购买申请</h1>
        <div className="flex gap-2">
          {[
            { value: '', label: '全部' },
            { value: 'PENDING', label: '待处理' },
            { value: 'APPROVED', label: '已通过' },
            { value: 'REJECTED', label: '已拒绝' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                statusFilter === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border text-foreground hover:bg-accent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div className="mb-4 rounded-lg border border-border bg-muted px-4 py-2 text-sm text-foreground">{msg}</div>
      )}

      {loading ? (
        <div className="text-muted-foreground">加载中...</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          暂无购买申请
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-sm text-muted-foreground">
                <th className="px-4 py-3">用户</th>
                <th className="px-4 py-3">申请额度</th>
                <th className="px-4 py-3">联系方式</th>
                <th className="px-4 py-3">备注</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">提交时间</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border/50 text-sm">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-foreground">{item.userName || '-'}</p>
                      <p className="text-xs text-muted-foreground">{item.userEmail || item.userId}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{formatNumber(item.amount)}</td>
                  <td className="px-4 py-3 text-foreground">{item.contact || '-'}</td>
                  <td className="max-w-[16rem] truncate px-4 py-3 text-muted-foreground" title={item.note || ''}>
                    {item.note || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_CLASS[item.status] || ''}`}>
                      {STATUS_LABEL[item.status] || item.status}
                    </span>
                    {item.status === 'APPROVED' && item.grantedAmount != null && (
                      <div className="mt-1 text-xs text-success">到账 {formatNumber(item.grantedAmount)}</div>
                    )}
                    {item.adminNote && (
                      <div className="mt-1 max-w-[12rem] truncate text-xs text-muted-foreground" title={item.adminNote}>
                        {item.adminNote}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {item.status === 'PENDING' ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openReview(item, 'approve')}
                          className="rounded-lg bg-success px-3 py-1 text-xs text-white hover:opacity-90"
                        >
                          通过
                        </button>
                        <button
                          type="button"
                          onClick={() => openReview(item, 'reject')}
                          className="rounded-lg bg-destructive px-3 py-1 text-xs text-white hover:opacity-90"
                        >
                          拒绝
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reviewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              {reviewAction === 'approve' ? '通过并发放额度' : '拒绝申请'}
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              用户: {reviewTarget.userName || reviewTarget.userEmail} · 申请 {formatNumber(reviewTarget.amount)} 额度
            </p>
            {reviewAction === 'approve' && (
              <div className="mb-3">
                <label className="mb-1 block text-sm text-muted-foreground">实际发放额度</label>
                <input
                  type="number"
                  min={1}
                  value={grantedAmount}
                  onChange={(e) => setGrantedAmount(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground outline-none"
                />
              </div>
            )}
            <div className="mb-4">
              <label className="mb-1 block text-sm text-muted-foreground">
                {reviewAction === 'approve' ? '审批备注（可选）' : '拒绝原因'}
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={submitReview}
                disabled={submitting}
                className="flex-1 rounded-lg bg-primary py-2 text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? '处理中...' : '确认'}
              </button>
              <button
                type="button"
                onClick={() => setReviewTarget(null)}
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
