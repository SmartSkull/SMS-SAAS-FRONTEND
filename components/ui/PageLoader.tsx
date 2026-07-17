'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

function LoaderSvg() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 140" width="180" height="126">
      <style>{`
        @keyframes personBounce { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-16px); } }
        @keyframes bookTilt { 0%,100% { transform:rotate(0deg); } 50% { transform:rotate(-6deg); } }
        @keyframes ball1 { 0%,100% { cy:105; } 50% { cy:70; } }
        @keyframes ball2 { 0%,100% { cy:105; } 50% { cy:75; } }
        @keyframes ball3 { 0%,100% { cy:105; } 50% { cy:80; } }
        @keyframes shadowGrow { 0%,100% { rx:22; opacity:.15; } 50% { rx:10; opacity:.05; } }
      `}</style>
      {/* Shadow */}
      <ellipse cx="100" cy="120" rx="24" ry="5" fill="rgba(0,0,0,.12)" style={{ animation:'shadowGrow 1s ease-in-out infinite' }} />
      {/* Person body */}
      <circle cx="85" cy="58" r="16" fill="#3b82f6" style={{ animation:'personBounce 1s ease-in-out infinite' }} />
      <rect x="77" y="74" rx="8" ry="8" width="16" height="24" fill="#2563eb" style={{ animation:'personBounce 1s ease-in-out infinite' }} />
      {/* Arms */}
      <rect x="63" y="80" rx="4" ry="4" width="12" height="6" fill="#3b82f6" style={{ animation:'bookTilt 1s ease-in-out infinite', transformOrigin:'70px 83px' }} />
      <rect x="93" y="80" rx="4" ry="4" width="12" height="6" fill="#3b82f6" style={{ animation:'bookTilt 1s ease-in-out .15s infinite', transformOrigin:'99px 83px' }} />
      {/* Legs */}
      <rect x="79" y="100" rx="3" ry="3" width="6" height="12" fill="#1d4ed8" style={{ animation:'personBounce 1s ease-in-out infinite' }} />
      <rect x="87" y="100" rx="3" ry="3" width="6" height="12" fill="#1d4ed8" style={{ animation:'personBounce 1s ease-in-out .1s infinite' }} />
      {/* Book */}
      <rect x="108" y="72" rx="5" ry="5" width="28" height="22" fill="#93c5fd" style={{ animation:'bookTilt 1s ease-in-out .2s infinite', transformOrigin:'122px 83px' }} />
      <line x1="113" y1="78" x2="131" y2="78" stroke="#2563eb" strokeWidth="2" style={{ animation:'bookTilt 1s ease-in-out .2s infinite', transformOrigin:'122px 83px' }} />
      <line x1="113" y1="84" x2="128" y2="84" stroke="#2563eb" strokeWidth="2" style={{ animation:'bookTilt 1s ease-in-out .2s infinite', transformOrigin:'122px 83px' }} />
      <line x1="113" y1="90" x2="126" y2="90" stroke="#2563eb" strokeWidth="2" style={{ animation:'bookTilt 1s ease-in-out .2s infinite', transformOrigin:'122px 83px' }} />
      {/* Bouncing dots */}
      <circle cx="50" cy="105" r="8" fill="#60a5fa" style={{ animation:'ball1 .8s ease-in-out infinite' }} />
      <circle cx="35" cy="105" r="5" fill="#93c5fd" style={{ animation:'ball2 .8s ease-in-out .1s infinite' }} />
      <circle cx="22" cy="105" r="3" fill="#bfdbfe" style={{ animation:'ball3 .8s ease-in-out .2s infinite' }} />
      <circle cx="150" cy="105" r="8" fill="#60a5fa" style={{ animation:'ball1 .8s ease-in-out .15s infinite' }} />
      <circle cx="165" cy="105" r="5" fill="#93c5fd" style={{ animation:'ball2 .8s ease-in-out .25s infinite' }} />
      <circle cx="178" cy="105" r="3" fill="#bfdbfe" style={{ animation:'ball3 .8s ease-in-out .35s infinite' }} />
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