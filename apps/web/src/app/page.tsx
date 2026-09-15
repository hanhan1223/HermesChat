import Link from 'next/link';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground">HermesChat</h1>
        <p className="mt-4 text-muted-foreground">企业级 AI Agent 平台</p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            登录
          </Link>
          <Link
            href="/chat"
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            进入对话
          </Link>
        </div>
      </div>
    </main>
  );
}
