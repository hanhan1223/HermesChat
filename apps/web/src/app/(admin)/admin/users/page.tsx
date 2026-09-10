'use client';

import { useState, useEffect } from 'react';
import { formatNumber } from '@/lib/utils';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [grantAmount, setGrantAmount] = useState('');
  const [grantReason, setGrantReason] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/admin/api/users', {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.content || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleGrantCredits = async () => {
    if (!selectedUser || !grantAmount) return;
    try {
      await fetch('/admin/api/users/' + selectedUser.id + '/credits/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + localStorage.getItem('token'),
        },
        body: JSON.stringify({ amount: parseInt(grantAmount), reason: grantReason }),
      });
      setShowGrantModal(false);
      fetchUsers();
    } catch {}
  };

  if (loading) return <div className="text-muted-foreground">加载中...</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">用户管理</h1>
        <span className="text-sm text-muted-foreground">共 {users.length} 个用户</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-sm text-muted-foreground">
              <th className="px-4 py-3">用户</th>
              <th className="px-4 py-3">角色</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">积分</th>
              <th className="px-4 py-3">Token 用量</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-border/50 text-sm">
                <td className="px-4 py-3">
                  <div>
                    <p className="text-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-foreground">{user.role}</td>
                <td className="px-4 py-3">
                  <span className={'rounded-full px-2 py-0.5 text-xs ' + (user.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
                    {user.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-foreground">{formatNumber(user.credits)}</td>
                <td className="px-4 py-3 text-foreground">{formatNumber(user.totalTokenUsed || 0)}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => { setSelectedUser(user); setShowGrantModal(true); }}
                    className="rounded-lg bg-primary px-3 py-1 text-xs text-primary-foreground hover:opacity-90"
                  >
                    赠送积分
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showGrantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">赠送积分</h3>
            <p className="mb-4 text-sm text-muted-foreground">用户: {selectedUser?.name}</p>
            <input
              type="number"
              value={grantAmount}
              onChange={(e) => setGrantAmount(e.target.value)}
              placeholder="积分数量"
              className="mb-3 w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground outline-none"
            />
            <input
              type="text"
              value={grantReason}
              onChange={(e) => setGrantReason(e.target.value)}
              placeholder="赠送原因"
              className="mb-4 w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground outline-none"
            />
            <div className="flex gap-2">
              <button type="button" onClick={handleGrantCredits} className="flex-1 rounded-lg bg-primary py-2 text-primary-foreground hover:opacity-90">
                确认赠送
              </button>
              <button type="button" onClick={() => setShowGrantModal(false)} className="flex-1 rounded-lg bg-muted py-2 text-foreground hover:bg-accent">
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
