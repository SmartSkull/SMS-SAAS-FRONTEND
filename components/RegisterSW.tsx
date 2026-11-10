'use client';
import { useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { PWAInstallBanner } from '@/components/ui/PWAInstallBanner';

export default function RegisterSW() {
  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {});
    }
  }, []);

  // Subscribe to web push (requests permission + saves subscription to backend)
  usePushNotifications();

  return <PWAInstallBanner />;
}
