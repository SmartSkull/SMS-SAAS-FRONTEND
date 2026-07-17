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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 backdrop-blur-md bg-black/40" />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <object
          type="image/svg+xml"
          data="/school-loader.svg"
          aria-label="Loading..."
          className="w-48 h-48 pointer-events-none"
        />
        <div className="w-44 h-2 bg-white/15 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
            }}
          />
        </div>
      </div>
    </div>
  );
}