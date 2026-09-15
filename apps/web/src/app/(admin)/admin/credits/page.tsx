'use client';

import { useState, useEffect } from 'react';
import { formatNumber } from '@/lib/utils';

export default function CreditsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalGranted: 0, totalConsumed: 0, balance: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const res = await fetch('/admin/api/credits/transactions', { headers });
      if (res.ok) {
        const data = await res.json();
        const list = data.content || data.items || data || [];
        setTransactions(Array.isArray(list) ? list : []);
      }

      const statsRes = await fetch('/admin/api/credits/stats', { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          totalGranted: statsData.totalGranted || 0,
          totalConsumed: statsData.totalConsumed || 0,
          balance: statsData.balance || 0,
        });
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-muted-foreground">加载中...</div>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">积分管理</h1>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">总赠送</p>
          <p className="text-2xl font-bold text-success">{formatNumber(stats.totalGranted)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">总消耗</p>
          <p className="text-2xl font-bold text-destructive">{formatNumber(stats.totalConsumed)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">当前余额</p>
          <p className="text-2xl font-bold text-warning">{formatNumber(stats.balance)}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium text-foreground">交易记录</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-2">类型</th>
              <th className="px-4 py-2">用户</th>
              <th className="px-4 py-2">数量</th>
              <th className="px-4 py-2">余额</th>
              <th className="px-4 py-2">原因</th>
              <th className="px-4 py-2">时间</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b border-border/50 text-sm">
                <td className="px-4 py-2">
                  <span className={'rounded px-2 py-0.5 text-xs ' + getTxTypeClass(tx.type)}>
                    {tx.type}
                  </span>
                </td>
                <td className="px-4 py-2 text-foreground">{tx.userId}</td>
                <td className={'px-4 py-2 font-medium ' + (tx.amount > 0 ? 'text-success' : 'text-destructive')}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </td>
                <td className="px-4 py-2 text-foreground">{tx.balanceAfter}</td>
                <td className="px-4 py-2 text-muted-foreground">{tx.reason || '-'}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString('zh-CN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getTxTypeClass(type: string): string {
  const classes: Record<string, string> = {
    GIFT: 'bg-success/10 text-success',
    SUBSCRIPTION: 'bg-info/10 text-info',
    CONSUME: 'bg-destructive/10 text-destructive',
    REFUND: 'bg-purple-500/10 text-purple-500',
    ADJUST: 'bg-warning/10 text-warning',
  };
  return classes[type] || 'bg-muted text-muted-foreground';
}
