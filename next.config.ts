import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3333';
    return {
      beforeFiles: [],
      afterFiles: [
        // Skip /api/uploads/* — handled by app/api/uploads/[...path]/route.ts
        { source: '/api/:path((?!uploads).*)', destination: `${API_URL}/:path*` },
      ],
      fallback: [],
    };
  },
};

export default nextConfig;
