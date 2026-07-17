'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

function LoaderSvg() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="160" height="160">
      <style>{`
        @keyframes bounce1 { 0%,100% { cy:100; rx:26; ry:26 } 50% { cy:65; rx:30; ry:22 } }
        @keyframes bounce2 { 0%,100% { cy:100; rx:20; ry:20 } 50% { cy:72; rx:22; ry:18 } }
        @keyframes bounce3 { 0%,100% { cy:100; rx:15; ry:15 } 50% { cy:78; rx:17; ry:13 } }
        @keyframes shadow1 { 0%,100% { rx:28; opacity:.15 } 50% { rx:12; opacity:.05 } }
        @keyframes shadow2 { 0%,100% { rx:22; opacity:.12 } 50% { rx:10; opacity:.04 } }
        @keyframes shadow3 { 0%,100% { rx:16; opacity:.1 } 50% { rx:8; opacity:.03 } }
      `}</style>
      <ellipse cx="100" cy="140" rx="28" ry="6" fill="rgba(0,0,0,.15)" style={{ animation: 'shadow1 .8s ease-in-out infinite' }} />
      <ellipse cx="100" cy="140" rx="22" ry="5" fill="rgba(0,0,0,.12)" style={{ animation: 'shadow2 .8s ease-in-out .05s infinite' }} />
      <ellipse cx="100" cy="140" rx="16" ry="4" fill="rgba(0,0,0,.1)" style={{ animation: 'shadow3 .8s ease-in-out .1s infinite' }} />
      <ellipse cx="54" cy="100" rx="26" ry="26" fill="#93c5fd" style={{ animation: 'bounce1 .8s ease-in-out infinite' }} />
      <ellipse cx="100" cy="100" rx="20" ry="20" fill="#60a5fa" style={{ animation: 'bounce2 .8s ease-in-out .05s infinite' }} />
      <ellipse cx="146" cy="100" rx="15" ry="15" fill="#3b82f6" style={{ animation: 'bounce3 .8s ease-in-out .1s infinite' }} />
      <rect x="42" y="105" rx="6" ry="6" width="20" height="12" fill="#bfdbfe" style={{ animation: 'bounce1 .8s ease-in-out .05s infinite' }} />
      <rect x="92" y="107" rx="5" ry="5" width="16" height="10" fill="#dbeafe" style={{ animation: 'bounce2 .8s ease-in-out .1s infinite' }} />
      <rect x="140" y="108" rx="4" ry="4" width="12" height="8" fill="#eff6ff" style={{ animation: 'bounce3 .8s ease-in-out .15s infinite' }} />
    </svg>
  );
}

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
        <LoaderSvg />
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