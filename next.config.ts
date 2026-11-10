import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      // ── Global security headers ───────────────────────────────────────────
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      // ── Service Worker — never cache; must be served as JS ────────────────
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },

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
