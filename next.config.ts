import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    // Use API_BASE_URL (no NEXT_PUBLIC_ prefix) so Vercel reads it at runtime, not build time
    const API_URL = process.env.API_BASE_URL ?? 'http://localhost:3333';

    return [
      { source: '/api/:path*',     destination: `${API_URL}/api/:path*` },
      { source: '/uploads/:path*', destination: `${API_URL}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
