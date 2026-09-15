'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { apiClient } from '@/lib/api-client';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.replace('/login');
      return;
    }

    apiClient.setToken(token);

    let parsed: any = {};
    try {
      parsed = JSON.parse(userData);
    } catch {
      router.replace('/login');
      return;
    }

    if (parsed.role !== 'ADMIN' && parsed.role !== 'SUPER_ADMIN') {
      router.replace('/chat');
      return;
    }

    setUser(parsed);
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar user={user} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
