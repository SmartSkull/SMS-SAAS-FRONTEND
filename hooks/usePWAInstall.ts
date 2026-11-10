'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

// The layout's inline <script> stores the event here before React boots.
declare global {
  interface Window {
    __pwaPrompt?: BeforeInstallPromptEvent;
  }
}

export type PWAInstallState =
  | 'unsupported'  // browser has no install API (Firefox desktop, old browsers…)
  | 'ios'          // iOS Safari — must guide user manually
  | 'ready'        // prompt captured, we can call .prompt()
  | 'installed';   // already running standalone

export function usePWAInstall() {
  const [state, setState] = useState<PWAInstallState>('unsupported');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Already installed as a standalone app — nothing to show
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setState('installed');
      return;
    }

    // iOS Safari — no beforeinstallprompt API, guide user manually
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as Window & { MSStream?: unknown }).MSStream;
    if (isIOS) {
      setState('ios');
      return;
    }

    // ── Case 1: event already captured by the inline <head> script ──────────
    // This handles the common race where beforeinstallprompt fired before React.
    if (window.__pwaPrompt) {
      setDeferredPrompt(window.__pwaPrompt);
      setState('ready');
    }

    // ── Case 2: listen in case the event fires after React mounts ───────────
    // (happens on slower connections or after a SW update re-check)
    const handler = (e: Event) => {
      e.preventDefault();
      const prompt = e as BeforeInstallPromptEvent;
      window.__pwaPrompt = prompt;
      setDeferredPrompt(prompt);
      setState('ready');
    };

    window.addEventListener('beforeinstallprompt', handler);
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
      window.__pwaPrompt = undefined;
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const dismiss = useCallback(() => setDismissed(true), []);

  const showBanner = !dismissed && (state === 'ready' || state === 'ios');

  return { state, install, dismiss, showBanner };
}
