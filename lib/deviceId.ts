/**
 * Stable device fingerprint for attendance clock-in enforcement.
 *
 * The fingerprint is based purely on device/browser signals — NOT on the
 * logged-in user — so that two different accounts on the same physical
 * device produce the SAME fingerprint. This is what allows the backend to
 * detect "this device was already used by another student today".
 *
 * The localStorage cache key is per-user so one account's cache entry does
 * not overwrite another's, but every account on the same device will compute
 * and cache the same 64-char hex value.
 *
 * Signals: userAgent · screen dimensions · colorDepth · timezone offset ·
 *          language · hardwareConcurrency · canvas pixel rendering
 *
 * NOTE: iOS Safari limits canvas fingerprinting (noise injection). The
 * remaining signals (userAgent, screen, timezone) are still sufficient to
 * distinguish different physical iOS devices from each other.
 */

import { auth } from '@/lib/auth';

/** Per-user cache key — prevents one account's entry overwriting another's */
const cacheKey = (userId: string) => `florieren_device_fp_${userId}`;

/** Global cache key — shared across all users; set on first computation */
const SHARED_KEY = 'florieren_device_fp';

/** SHA-256 a string → 64-char hex digest */
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Canvas pixel rendering fingerprint */
function canvasFingerprint(): string {
  try {
    const c   = document.createElement('canvas');
    c.width   = 240;
    c.height  = 60;
    const ctx = c.getContext('2d');
    if (!ctx) return 'no-canvas';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle    = '#f8f8f8';
    ctx.fillRect(0, 0, 240, 60);
    ctx.fillStyle    = '#1a56db';
    ctx.font         = '16px -apple-system, Arial';
    ctx.fillText('Florieren Attendance 🏫', 8, 32);
    ctx.fillStyle    = 'rgba(34,197,94,0.8)';
    ctx.font         = '14px Georgia, serif';
    ctx.fillText('Device Check 2025', 30, 52);
    return c.toDataURL('image/png');
  } catch {
    return 'canvas-blocked';
  }
}

/**
 * Collect device-only signals — intentionally NO user-specific data.
 * Every account on the same device must produce the same string.
 */
function collectDeviceSignals(): string {
  return [
    navigator.userAgent,
    screen.width,
    screen.height,
    screen.colorDepth,
    screen.pixelDepth,
    new Date().getTimezoneOffset(),
    navigator.language,
    navigator.languages?.join(',') ?? '',
    navigator.hardwareConcurrency ?? 0,
    // navigator.deviceMemory is Chrome-only; use 0 if unavailable
    (navigator as any).deviceMemory ?? 0,
    canvasFingerprint(),
  ].join('||');
}

/**
 * Returns the device fingerprint for this physical device.
 *
 * - Same value for ALL accounts on the same device
 * - Different value on a different device
 * - Cached in localStorage (both a shared key and a per-user key)
 */
export async function getDeviceId(): Promise<string> {
  // 1. Try the shared key first (fastest path, set on any previous visit)
  const shared = localStorage.getItem(SHARED_KEY);
  if (shared && shared.length === 64) return shared;

  // 2. Try the per-user key (set on a previous login for this account)
  const user   = auth.getUser();
  const userId = user?.uniqueId ?? 'guest';
  const perUser = localStorage.getItem(cacheKey(userId));
  if (perUser && perUser.length === 64) {
    // Back-fill the shared key so other accounts benefit immediately
    localStorage.setItem(SHARED_KEY, perUser);
    return perUser;
  }

  // 3. Compute from scratch
  const hash = await sha256(collectDeviceSignals());

  // Store under both keys
  localStorage.setItem(SHARED_KEY, hash);
  localStorage.setItem(cacheKey(userId), hash);
  return hash;
}
