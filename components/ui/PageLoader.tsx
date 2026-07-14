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
      <img
        src="/school-loader.svg"
        alt="Loading..."
        className="relative z-10 w-full h-full max-w-none max-h-none object-contain p-8"
      />
    </div>
  );
}
