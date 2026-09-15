import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'HermesChat - AI Agent Platform',
  description: '企业级 AI Agent 平台，支持多模态对话、自定义 Skill 与 MCP 工具',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

const themeInit = `(function(){try{var t=localStorage.getItem('hermes-theme');if(t!=='light'&&t!=='dark'&&t!=='system'){t='system'}var d=t==='system'?window.matchMedia('(prefers-color-scheme: dark)').matches:t==='dark';var r=d?'dark':'light';document.documentElement.classList.remove('light','dark');document.documentElement.classList.add(r);document.documentElement.style.colorScheme=r;}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
