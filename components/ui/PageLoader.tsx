'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function PageLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setLoading(true);
    setProgress(20);

    const t1 = setTimeout(() => setProgress(60), 100);
    const t2 = setTimeout(() => setProgress(90), 300);
    const t3 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => { setLoading(false); setProgress(0); }, 300);
    }, 500);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [pathname]);

  if (!loading && progress === 0) return null;

  return (
    <>
      {/* Top progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[9999] h-1"
        style={{ background: 'rgba(219,234,254,0.5)' }}>
        <div
          className="h-full transition-all duration-300 ease-out"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg,#3b82f6,#0ea5e9)',
            boxShadow: '0 0 10px rgba(59,130,246,0.7)',
            opacity: progress === 100 ? 0 : 1,
            transition: progress === 100 ? 'opacity 0.3s, width 0.3s' : 'width 0.3s ease-out',
          }}
        />
      </div>

      {/* Full-screen overlay on initial load only */}
      {progress < 90 && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-14 h-14">
              <img src="https://florierenparklaneis.com.ng/assets/img/florieren/logo.png"
                alt="" className="w-14 h-14 rounded-full animate-pulse" />
              <svg className="absolute inset-0 w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="26" fill="none" stroke="#dbeafe" strokeWidth="3" />
                <circle cx="28" cy="28" r="26" fill="none" stroke="#3b82f6" strokeWidth="3"
                  strokeDasharray="163" strokeDashoffset={163 - (163 * progress) / 100}
                  style={{ transition: 'stroke-dashoffset 0.3s ease-out' }} />
              </svg>
            </div>
            <p className="text-blue-600 text-xs font-semibold tracking-widest uppercase">Loading…</p>
          </div>
        </div>
      )}
    </>
  );
}
