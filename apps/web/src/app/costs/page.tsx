'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Coins, Zap } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function CostDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadStats();
  }, [days]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/traces/cost?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setStats(await res.json());
      }
    } catch {}
    setLoading(false);
  };

  const cards = [
    {
      label: '总调用次数',
      value: stats?.totalTraces ?? 0,
      icon: BarChart3,
      color: 'bg-blue-500',
    },
    {
      label: '总成本',
      value: stats?.totalCost != null ? `$${stats.totalCost.toFixed(4)}` : '$0',
      icon: Coins,
      color: 'bg-amber-500',
    },
    {
      label: '输入 Token',
      value: formatNumber(stats?.totalInputTokens ?? 0),
      icon: TrendingUp,
      color: 'bg-emerald-500',
    },
    {
      label: '缓存命中率',
      value: `${stats?.cacheHitRate ?? 0}%`,
      icon: Zap,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">成本分析</h1>
            <p className="mt-1 text-sm text-muted-foreground">Token 用量与费用统计</p>
          </div>
          <div className="flex gap-2">
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  days === d
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border text-foreground hover:bg-accent'
                }`}
              >
                {d} 天
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-muted-foreground">加载中...</div>
        ) : (
          <>
            {/* 统计卡片 */}
            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {cards.map(card => (
                <div key={card.label} className="rounded-xl border border-border bg-card p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{card.label}</span>
                    <div className={`rounded-lg ${card.color} p-1.5`}>
                      <card.icon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground">{card.value}</div>
                </div>
              ))}
            </div>

            {/* 按模型分布 */}
            {stats?.byModel && Object.keys(stats.byModel).length > 0 && (
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="mb-4 text-lg font-semibold text-foreground">按模型分布</h2>
                <div className="space-y-3">
                  {Object.entries(stats.byModel).map(([modelId, data]: [string, any]) => (
                    <div key={modelId} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-foreground">{modelId}</div>
                        <div className="text-xs text-muted-foreground">{data.count} 次调用</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-foreground">{formatNumber(data.tokens)} tokens</div>
                        <div className="text-xs text-muted-foreground">${data.cost.toFixed(4)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 详细指标 */}
            {stats && (
              <div className="mt-6 rounded-xl border border-border bg-card p-6">
                <h2 className="mb-4 text-lg font-semibold text-foreground">详细指标</h2>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  <div>
                    <div className="text-sm text-muted-foreground">输出 Token</div>
                    <div className="text-lg font-semibold text-foreground">{formatNumber(stats.totalOutputTokens)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">缓存 Token</div>
                    <div className="text-lg font-semibold text-foreground">{formatNumber(stats.totalCachedTokens)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">统计周期</div>
                    <div className="text-lg font-semibold text-foreground">{stats.period}</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
