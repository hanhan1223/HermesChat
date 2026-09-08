'use client';

import { useState, useEffect } from 'react';
import { formatNumber } from '@/lib/utils';

/**
 * 积分管理页面
 */
export default function CreditsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalGranted: 0, totalConsumed: 0, balance: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/admin/api/credits/transactions', {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.content || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-slate-400">加载中...</div>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">积分管理</h1>

      {/* 统计卡片 */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-400">总赠送</p>
          <p className="text-2xl font-bold text-emerald-400">{formatNumber(stats.totalGranted)}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-400">总消耗</p>
          <p className="text-2xl font-bold text-red-400">{formatNumber(stats.totalConsumed)}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-400">当前余额</p>
          <p className="text-2xl font-bold text-amber-400">{formatNumber(stats.balance)}</p>
        </div>
      </div>

      {/* 交易记录 */}
      <div className="rounded-xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 px-4 py-3">
          <h2 className="text-sm font-medium text-white">交易记录</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800 text-left text-xs text-slate-400">
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
              <tr key={tx.id} className="border-b border-slate-800/50 text-sm">
                <td className="px-4 py-2">
                  <span className={'rounded px-2 py-0.5 text-xs ' + getTxTypeClass(tx.type)}>
                    {tx.type}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-300">{tx.userId}</td>
                <td className={'px-4 py-2 font-medium ' + (tx.amount > 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </td>
                <td className="px-4 py-2 text-slate-300">{tx.balanceAfter}</td>
                <td className="px-4 py-2 text-slate-400">{tx.reason || '-'}</td>
                <td className="px-4 py-2 text-slate-400 text-xs">{new Date(tx.createdAt).toLocaleString('zh-CN')}</td>
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
    GIFT: 'bg-emerald-500/10 text-emerald-400',
    SUBSCRIPTION: 'bg-blue-500/10 text-blue-400',
    CONSUME: 'bg-red-500/10 text-red-400',
    REFUND: 'bg-purple-500/10 text-purple-400',
    ADJUST: 'bg-amber-500/10 text-amber-400',
  };
  return classes[type] || 'bg-slate-500/10 text-slate-400';
}