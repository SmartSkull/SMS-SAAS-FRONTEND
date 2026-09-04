/**
 * Stable device fingerprint for attendance clock-in enforcement.
 *
 * Each user gets their own device ID derived from:
 *   - Their uniqueId (so two accounts on the same browser get different IDs)
 *   - Passive browser signals (so the same account on a different device
 *     gets a different ID)
 *
 * Signals: userAgent · screen dimensions · timezone · language ·
 *          hardwareConcurrency · canvas pixel rendering
 *
 * Cached in localStorage under a per-user key so it is stable across
 * sessions for the same account on the same device.
 *
 * NOTE: Not cryptographically tamper-proof — sufficient for school
 * attendance to prevent casual multi-device abuse.
 */

import { auth } from '@/lib/auth';

const storageKey = (userId: string) => `florieren_device_id_${userId}`;

/** SHA-256 a string → hex digest */
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Canvas pixel fingerprint — differs between GPU/driver/OS combos */
function canvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width  = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle    = '#f0f0f0';
    ctx.fillRect(0, 0, 200, 50);
    ctx.fillStyle    = '#069';
    ctx.font         = '15px Arial';
    ctx.fillText('Florieren\u{1F393}', 10, 30);
    ctx.fillStyle    = 'rgba(102,204,0,0.7)';
    ctx.font         = '18px Georgia';
    ctx.fillText('Attendance', 50, 45);
    return canvas.toDataURL();
  } catch {
    return 'canvas-error';
  }
}

/** Combine all signals for a specific user into one raw string */
function collectSignals(userId: string): string {
  return [
    userId,                              // per-user salt
    navigator.userAgent,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.language,
    navigator.hardwareConcurrency ?? 0,
    canvasFingerprint(),
  ].join('||');
}

/**
 * Returns a stable hex device ID for the currently logged-in user on
 * this device. Different accounts produce different IDs even on the
 * same browser. Cached in localStorage per user.
 */
export async function getDeviceId(): Promise<string> {
  const user = auth.getUser();
  // If no user is logged in, fall back to a generic key (should not happen
  // on the attendance page, but be safe).
  const userId = user?.uniqueId ?? 'anonymous';
  const key    = storageKey(userId);

  const cached = localStorage.getItem(key);
  if (cached && cached.length === 64) return cached;

  const hash = await sha256(collectSignals(userId));
  localStorage.setItem(key, hash);
  return hash;
}
