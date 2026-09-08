import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'HermesChat - AI Agent Platform',
  description:
    '企业级 AI Agent 平台，支持多模态对话（文字、图片、视频、文件）、自定义 Skill 与 MCP 工具',
  keywords: ['AI', 'Agent', 'ChatGPT', 'LLM', '多模态', 'MCP'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
