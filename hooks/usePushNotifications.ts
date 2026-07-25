'use client';
import { useEffect } from 'react';
import { auth } from '@/lib/auth';
import { api, endpoints } from '@/lib/api';

/** Convert a base64 URL string to a Uint8Array (required by pushManager.subscribe) */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/**
 * Registers the service worker, requests notification permission, and saves
 * the browser push subscription to the backend.
 *
 * Runs once after login. Re-saves if the user already has a subscription
 * (in case they logged into a different account on the same browser).
 */
export function usePushNotifications() {
  useEffect(() => {
    if (!auth.isAuthenticated()) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    async function subscribe() {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        // Re-save existing subscription (endpoint stays stable per browser)
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          await saveSubscription(existing);
          return;
        }

        // Ask permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // Get VAPID public key — prefer env var, fall back to API call
        let publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
        if (!publicKey) {
          const res = await api.get<{ success: boolean; data: { publicKey: string } }>(endpoints.auth.webPushKey);
          publicKey = res.data?.publicKey ?? '';
        }
        if (!publicKey) return;

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        await saveSubscription(subscription);
      } catch (err) {
        console.warn('[PushNotifications] Setup failed:', err);
      }
    }

    async function saveSubscription(subscription: PushSubscription) {
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;
      await api.post(endpoints.auth.webPushSubscription, {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
    }

    subscribe();
  }, []);
}
