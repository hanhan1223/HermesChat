'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Sparkles, Wrench, Check } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface Model {
  id: string;
  name: string;
  provider: string;
  supportsVision: boolean;
  supportsTools: boolean;
}

interface Skill {
  id: string;
  name: string;
  description: string;
}

interface SelectorProps {
  selectedModelId?: string;
  selectedSkillId?: string;
  onModelChange?: (modelId: string) => void;
  onSkillChange?: (skillId: string | null) => void;
}

/**
 * 模型 + Skill 选择器
 */
export function ModelSkillSelector({
  selectedModelId,
  selectedSkillId,
  onModelChange,
  onSkillChange,
}: SelectorProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [modelOpen, setModelOpen] = useState(false);
  const [skillOpen, setSkillOpen] = useState(false);

  useEffect(() => {
    loadModels();
    loadSkills();
  }, []);

  const loadModels = async () => {
    try {
      const data = await apiClient.getModels();
      setModels(Array.isArray(data) ? data : []);
    } catch {}
  };

  const loadSkills = async () => {
    try {
      const data = await apiClient.getSkills();
      setSkills(Array.isArray(data) ? data : []);
    } catch {}
  };

  const currentModel = models.find(m => m.id === selectedModelId) || models[0];
  const currentSkill = skills.find(s => s.id === selectedSkillId);

  return (
    <div className="flex items-center gap-2">
      {/* 模型选择器 */}
      <div className="relative">
        <button
          onClick={() => { setModelOpen(!modelOpen); setSkillOpen(false); }}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:bg-accent"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>{currentModel?.name || '选择模型'}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>

        {modelOpen && (
          <div className="absolute bottom-full left-0 z-50 mb-1 w-64 rounded-xl border border-border bg-card shadow-lg">
            <div className="p-2">
              {models.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">暂无可用模型</div>
              ) : (
                models.map(model => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onModelChange?.(model.id);
                      setModelOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <div>
                      <div className="font-medium text-foreground">{model.name}</div>
                      <div className="text-xs text-muted-foreground">{model.provider}</div>
                    </div>
                    {model.id === selectedModelId && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Skill 选择器 */}
      <div className="relative">
        <button
          onClick={() => { setSkillOpen(!skillOpen); setModelOpen(false); }}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs ${
            currentSkill
              ? 'border-primary/50 bg-primary/5 text-primary'
              : 'border-border bg-background text-foreground hover:bg-accent'
          }`}
        >
          <Wrench className="h-3.5 w-3.5" />
          <span>{currentSkill?.name || '无 Skill'}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>

        {skillOpen && (
          <div className="absolute bottom-full left-0 z-50 mb-1 w-64 rounded-xl border border-border bg-card shadow-lg">
            <div className="p-2">
              <button
                onClick={() => {
                  onSkillChange?.(null);
                  setSkillOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <span className="text-muted-foreground">无 Skill</span>
                {!selectedSkillId && <Check className="h-4 w-4 text-primary" />}
              </button>
              {skills.map(skill => (
                <button
                  key={skill.id}
                  onClick={() => {
                    onSkillChange?.(skill.id);
                    setSkillOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <div>
                    <div className="font-medium text-foreground">{skill.name}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{skill.description}</div>
                  </div>
                  {skill.id === selectedSkillId && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
