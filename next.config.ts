import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3333';
    return [
      { source: '/api/:path*', destination: `${API_URL}/:path*` },
      // /uploads/* is handled by app/api/uploads/[...path]/route.ts
      // which adds the ngrok-skip-browser-warning header
    ];
  },
};

export default nextConfig;
