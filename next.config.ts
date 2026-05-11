import type { NextConfig } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL_SERVER?.replace('/api', '')
  ?? process.env.NEXT_PUBLIC_API_URL
  ?? 'http://localhost:3333';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/api/:path*',     destination: `${API_URL}/api/:path*` },
      { source: '/uploads/:path*', destination: `${API_URL}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
