'use client';

import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Download, Share, X, Smartphone } from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';

/**
 * PWAInstallBanner
 *
 * - Android / Chrome desktop: shows a "Install App" button that triggers
 *   the native beforeinstallprompt dialog.
 * - iOS Safari: shows step-by-step instructions (tap Share → Add to Home Screen).
 * - Already installed / unsupported: renders nothing.
 *
 * The banner is shown once per session. Users can dismiss it and it won't
 * reappear until a new session.
 */
export function PWAInstallBanner() {
  const { state, install, dismiss, showBanner } = usePWAInstall();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — banner is client-only
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !showBanner) return null;

  return (
    <div
      role="dialog"
      aria-label="Install Smart Campus app"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm
                 bg-white border border-purple-100 rounded-2xl shadow-2xl shadow-purple-200/50
                 p-4 flex flex-col gap-3 animate-slide-up"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-11 h-11 rounded-xl overflow-hidden border border-purple-100">
          <Image
            src="/images/logo2.png"
            alt="Smart Campus icon"
            width={44}
            height={44}
            className="object-cover w-full h-full"
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm leading-tight">Install Smart Campus</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-snug">
            {state === 'ios'
              ? 'Add to your home screen for a faster, full-screen experience.'
              : 'Install for quick access — works offline, no app store required.'}
          </p>
        </div>

        <button
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="shrink-0 -mt-0.5 p-1 rounded-lg text-gray-400 hover:text-gray-600
                     hover:bg-gray-100 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* iOS instructions */}
      {state === 'ios' && (
        <ol className="text-xs text-gray-600 space-y-1.5 pl-1">
          <li className="flex items-center gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold
                             flex items-center justify-center text-[10px]">1</span>
            Tap the <Share size={13} className="inline mx-0.5 text-blue-500" />
            <strong>Share</strong> button in the browser toolbar.
          </li>
          <li className="flex items-center gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold
                             flex items-center justify-center text-[10px]">2</span>
            Scroll down and tap <strong>"Add to Home Screen"</strong>.
          </li>
          <li className="flex items-center gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold
                             flex items-center justify-center text-[10px]">3</span>
            Tap <strong>"Add"</strong> to confirm.
          </li>
        </ol>
      )}

      {/* Install button (Android / desktop) */}
      {state === 'ready' && (
        <div className="flex gap-2">
          <button
            onClick={install}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4
                       bg-purple-600 hover:bg-purple-700 active:scale-95
                       text-white text-sm font-semibold rounded-xl
                       transition-all shadow-lg shadow-purple-200"
          >
            <Download size={16} />
            Install App
          </button>

          <button
            onClick={dismiss}
            className="py-2.5 px-4 text-sm font-medium text-gray-500
                       hover:text-gray-700 hover:bg-gray-100
                       rounded-xl transition-colors"
          >
            Not now
          </button>
        </div>
      )}

      {/* iOS — just a close button at the bottom */}
      {state === 'ios' && (
        <button
          onClick={dismiss}
          className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium
                     text-purple-600 hover:text-purple-800 transition-colors"
        >
          <Smartphone size={13} />
          Got it
        </button>
      )}
    </div>
  );
}
