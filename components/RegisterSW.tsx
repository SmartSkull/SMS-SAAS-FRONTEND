'use client';
import { useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function RegisterSW() {
  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // Subscribe to web push (requests permission + saves subscription to backend)
  usePushNotifications();

  return null;
}
