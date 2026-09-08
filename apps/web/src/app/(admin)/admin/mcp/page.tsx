'use client';

import { useState, useEffect } from 'react';

/**
 * MCP 管理页面
 */
export default function McpPage() {
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchServers(); }, []);

  const fetchServers = async () => {
    try {
      const res = await fetch('/api/mcp', {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
      });
      if (res.ok) setServers(await res.json());
    } catch {} finally { setLoading(false); }
  };

  const handleConnect = async (id: string) => {
    await fetch('/api/mcp/' + id + '/connect', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
    });
    fetchServers();
  };

  if (loading) return <div className="text-slate-400">加载中...</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">MCP 工具管理</h1>
        <span className="text-sm text-slate-400">共 {servers.length} 个服务器</span>
      </div>

      <div className="space-y-3">
        {servers.map((server) => (
          <div key={server.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div>
              <h3 className="font-medium text-white">{server.name}</h3>
              <p className="text-xs text-slate-400">{server.transport} / {server.status}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={'rounded-full px-2 py-0.5 text-xs ' + (server.status === 'connected' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400')}>
                {server.status}
              </span>
              {server.status !== 'connected' && (
                <button onClick={() => handleConnect(server.id)}
                  className="rounded-lg bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-500">连接</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}