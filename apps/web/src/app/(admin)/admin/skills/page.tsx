'use client';

import { useState, useEffect } from 'react';

/**
 * Skill 管理页面
 */
export default function SkillsPage() {
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchSkills(); }, []);

  const fetchSkills = async () => {
    try {
      const res = await fetch('/api/skills', {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
      });
      if (res.ok) setSkills(await res.json());
    } catch {} finally { setLoading(false); }
  };

  if (loading) return <div className="text-slate-400">加载中...</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Skill 管理</h1>
        <span className="text-sm text-slate-400">共 {skills.length} 个 Skill</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {skills.map((skill) => (
          <div key={skill.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium text-white">{skill.name}</h3>
              <span className={'rounded px-2 py-0.5 text-xs ' + (skill.isPublic ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400')}>
                {skill.isPublic ? '公开' : '私有'}
              </span>
            </div>
            <p className="text-sm text-slate-400 line-clamp-2">{skill.description}</p>
            <p className="mt-2 text-xs text-slate-500">更新于: {new Date(skill.updatedAt).toLocaleDateString('zh-CN')}</p>
          </div>
        ))}
      </div>
    </div>
  );
}