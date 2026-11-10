'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export type PWAInstallState =
  | 'unsupported'      // browser has no install API (Safari iOS, Firefox desktop, …)
  | 'ios'              // iOS Safari — must guide user to "Add to Home Screen"
  | 'ready'            // beforeinstallprompt fired, we can call .prompt()
  | 'installed';       // already running in standalone mode

export function usePWAInstall() {
  const [state, setState] = useState<PWAInstallState>('unsupported');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  // Dismissed by the user this session — hide the banner
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Already installed as a standalone app
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setState('installed');
      return;
    }

    // iOS Safari — no beforeinstallprompt, guide user manually
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    if (isIOS) {
      setState('ios');
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setState('ready');
    };

    window.addEventListener('beforeinstallprompt', handler);

    // If the user installs from the browser prompt, mark as installed
    window.addEventListener('appinstalled', () => setState('installed'));

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setState('installed');
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  const showBanner =
    !dismissed &&
    (state === 'ready' || state === 'ios');

  return { state, install, dismiss, showBanner };
}
