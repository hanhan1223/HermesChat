/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  async rewrites() {
    const adminBase = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:8080/admin';
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    return [
      // 管理后台前端相对路径 /admin/api/* → Spring Boot /admin/*
      {
        source: '/admin/api/:path*',
        destination: `${adminBase}/:path*`,
      },
      // 短链跳转 /s/* → API /api/s/*（保持分享短链挂在 Web 域名下）
      {
        source: '/s/:path*',
        destination: `${apiBase}/s/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
