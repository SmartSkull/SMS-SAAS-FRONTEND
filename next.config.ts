import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
    return {
      beforeFiles: [],
      afterFiles: [
        // Skip /api/download* and /api/uploads/* — handled by local route.ts files
        { source: '/api/:path((?!download|uploads).*)', destination: `${API_URL}/:path*` },
      ],
      fallback: [],
    };
  },
};

export default nextConfig;
