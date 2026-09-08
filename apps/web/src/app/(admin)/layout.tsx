'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';

/**
 * 管理后台布局 - 增强版
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const parsed = JSON.parse(userData);
    if (parsed.role !== 'ADMIN' && parsed.role !== 'SUPER_ADMIN') {
      router.push('/chat');
      return;
    }

    setUser(parsed);
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar user={user} />
      <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        {children}
      </main>
    </div>
  );
}
