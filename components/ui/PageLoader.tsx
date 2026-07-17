'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function PageLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const isDashboard = pathname.startsWith('/admin') ||
                      pathname.startsWith('/staff') ||
                      pathname.startsWith('/student');

  useEffect(() => {
    if (pathname === '/null/dashboard' || pathname.startsWith('/null/')) {
      document.cookie = 'gka_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      document.cookie = 'gka_refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      document.cookie = 'gka_user=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      document.cookie = 'gka_role=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      window.location.replace('/login');
    }
  }, [pathname]);

  useEffect(() => {
    if (isDashboard) return;

    setLoading(true);
    setProgress(20);

    const t1 = setTimeout(() => setProgress(60), 100);
    const t2 = setTimeout(() => setProgress(90), 300);
    const t3 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => { setLoading(false); setProgress(0); }, 300);
    }, 500);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [pathname, isDashboard]);

  if (isDashboard || (!loading && progress === 0)) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-md">
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border-4 border-white/20" />
          <div
            className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin"
            style={{ borderTopColor: 'var(--brand, #2563eb)' }}
          />
        </div>
        <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: 'var(--brand, #2563eb)',
            }}
          />
        </div>
        <p className="text-white/80 text-sm font-medium">Loading…</p>
      </div>
    </div>
  );
}
