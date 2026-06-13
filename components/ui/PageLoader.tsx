'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { normalizeSchoolLogo, useSelectedSchool } from '@/hooks/useSelectedSchool';

export default function PageLoader() {
  const pathname = usePathname();
  const { school } = useSelectedSchool();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const logo = normalizeSchoolLogo(school?.logo);
  const isHome = pathname === '/';
  const primary = isHome ? '#2563eb' : (school?.primaryColor ?? '#3b82f6');

  // Only show on entry/auth/public pages, not in dashboards
  const isDashboard = pathname.startsWith('/admin') || 
                      pathname.startsWith('/staff') || 
                      pathname.startsWith('/student');

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
    <>
      <div className="fixed top-0 left-0 right-0 z-[9999] h-1" style={{ background: 'rgba(219,234,254,0.5)' }}>
        <div
          className="h-full transition-all duration-300 ease-out"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg,${primary},#0ea5e9)`,
            boxShadow: `0 0 10px ${primary}99`,
            opacity: progress === 100 ? 0 : 1,
            transition: progress === 100 ? 'opacity 0.3s, width 0.3s' : 'width 0.3s ease-out',
          }}
        />
      </div>

      {progress < 90 && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none" style={{ background: 'rgba(0,0,0,0.92)' }}>
          <div className="flex items-end gap-2">
            {[0,1,2,3].map(i => (
              <div key={i} className="w-4 rounded-sm bg-blue-400"
                style={{ height: '16px', animation: `loaderBlock 1s ${i * 0.15}s ease-in-out infinite` }}/>
            ))}
          </div>
          <style>{`@keyframes loaderBlock{0%,100%{height:16px;opacity:.4}50%{height:40px;opacity:1}}`}</style>
        </div>
      )}
    </>
  );
}
