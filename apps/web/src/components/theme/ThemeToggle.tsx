'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme, type ThemeMode } from './ThemeProvider';
import { cn } from '@/lib/utils';

const options: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '系统', icon: Monitor },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg bg-muted p-1',
        className
      )}
      role="radiogroup"
      aria-label="主题"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={opt.label}
            onClick={() => setTheme(opt.value)}
            className={cn(
              'flex min-w-0 shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-xs whitespace-nowrap transition-colors',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden lg:inline xl:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ThemeIconButton({ className }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={resolvedTheme === 'dark' ? '切换到浅色' : '切换到深色'}
      className={cn(
        'rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        className
      )}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
