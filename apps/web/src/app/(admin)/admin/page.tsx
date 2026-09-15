'use client';

import { useState, useEffect } from 'react';
import { formatNumber } from '@/lib/utils';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalTokens: 0,
    totalCredits: 0,
    activeSubscriptions: 0,
    totalConversations: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/admin/api/dashboard/stats', {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {}
  };

  const cards = [
    { label: '总用户数', value: stats.totalUsers, color: 'bg-blue-500' },
    { label: '活跃用户', value: stats.activeUsers, color: 'bg-emerald-500' },
    { label: '总 Token', value: formatNumber(stats.totalTokens), color: 'bg-purple-500' },
    { label: '积分发放', value: formatNumber(stats.totalCredits), color: 'bg-amber-500' },
    { label: '活跃订阅', value: stats.activeSubscriptions, color: 'bg-pink-500' },
    { label: '对话总数', value: formatNumber(stats.totalConversations), color: 'bg-cyan-500' },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">仪表盘</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-6">
            <div className={`mb-3 inline-block rounded-lg ${card.color} px-3 py-1 text-xs font-medium text-white`}>
              {card.label}
            </div>
            <p className="text-3xl font-bold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
