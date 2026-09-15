'use client';

import { useState, useEffect } from 'react';
import { formatNumber } from '@/lib/utils';

export default function TokensPage() {
  const [summary, setSummary] = useState({ totalTokens: 0, totalCost: 0, period: '' });
  const [distribution, setDistribution] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    const end = new Date().toISOString();
    const start = new Date(Date.now() - 30 * 86400000).toISOString();
    setDateRange({ start, end });
    fetchStats(start, end);
  }, []);

  const fetchStats = async (start: string, end: string) => {
    try {
      const headers = { Authorization: 'Bearer ' + localStorage.getItem('token') };
      const [summaryRes, distRes] = await Promise.all([
        fetch('/admin/api/tokens/summary?start=' + start + '&end=' + end, { headers }),
        fetch('/admin/api/tokens/distribution?start=' + start + '&end=' + end, { headers }),
      ]);
      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (distRes.ok) setDistribution(await distRes.json());
    } catch {}
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Token 消耗统计</h1>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">总 Token 消耗</p>
          <p className="text-3xl font-bold text-info">{formatNumber(summary.totalTokens)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">总成本 (USD)</p>
          <p className="text-3xl font-bold text-warning">{formatNumber(summary.totalCost)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-4 text-sm font-medium text-foreground">模型使用分布</h2>
        {distribution.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无数据</p>
        ) : (
          <div className="space-y-2">
            {(() => {
              const max = Math.max(...distribution.map((item: any) => Number(item[1]) || 0), 1);
              return distribution.map((item: any, i: number) => {
                const value = Number(item[1]) || 0;
                const pct = Math.max(4, Math.round((value / max) * 100));
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-24 text-sm text-foreground">{item[0] || 'unknown'}</span>
                    <div className="flex-1">
                      <div className="h-4 rounded-full bg-muted">
                        <div className="h-4 rounded-full bg-info" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">{formatNumber(value)}</span>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
