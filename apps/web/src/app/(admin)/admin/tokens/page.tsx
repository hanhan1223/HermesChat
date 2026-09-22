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
          <p className="mt-1 text-3xl font-bold text-info">{formatNumber(summary.totalTokens)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">总成本 (USD)</p>
          <p className="mt-1 text-3xl font-bold text-warning">{formatNumber(summary.totalCost)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-medium text-foreground">模型使用分布</h2>
        {distribution.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无数据</p>
        ) : (
          <div className="space-y-3">
            {(() => {
              const rows = distribution.map((item: any) => ({
                name: String(item[0] || 'unknown'),
                value: Number(item[1]) || 0,
              }));
              const total = rows.reduce((s, r) => s + r.value, 0) || 1;
              const max = Math.max(...rows.map((r) => r.value), 1);
              return rows.map((row, i) => {
                // 相对最大值，避免单模型时进度条拉满整行像一条横线
                const pct = Math.min(72, Math.max(8, Math.round((row.value / max) * 72)));
                const share = Math.round((row.value / total) * 100);
                return (
                  <div key={i} className="grid grid-cols-[minmax(0,11rem)_1fr_5rem] items-center gap-3">
                    <div className="truncate text-sm text-foreground" title={row.name}>
                      {row.name}
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-2.5 rounded-full bg-info transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {formatNumber(row.value)}
                      <span className="ml-1 text-xs">({share}%)</span>
                    </div>
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
