/**
 * Stable device fingerprint for attendance clock-in enforcement.
 *
 * Works on both HTTP and HTTPS:
 *  - HTTPS / secure context: SHA-256 via crypto.subtle (best quality)
 *  - HTTP / insecure context: djb2 hash (good enough for device distinction)
 *
 * The fingerprint is device-only (no userId) so every account on the same
 * physical device produces the same value, enabling the backend to block
 * multi-account clock-in on the same device.
 *
 * Cached in localStorage under a shared key so computation only happens once.
 */

import { auth } from '@/lib/auth';

const SHARED_KEY = 'florieren_device_fp';
const cacheKey   = (userId: string) => `florieren_device_fp_${userId}`;

// ── Hashing ──────────────────────────────────────────────────────────────

/** djb2 hash — synchronous, works everywhere, returns a 16-char hex string */
function djb2(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
    hash = hash >>> 0; // keep 32-bit unsigned
  }
  // Return as 16-char hex by repeating with a seed variation for more bits
  const h2 = (hash * 0x9e3779b9) >>> 0;
  return (
    hash.toString(16).padStart(8, '0') +
    h2.toString(16).padStart(8, '0')
  ).repeat(4).slice(0, 64); // pad to 64 chars to match SHA-256 output length
}

/** SHA-256 via crypto.subtle — only available in secure contexts (HTTPS) */
async function sha256(text: string): Promise<string | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return null;
  }
}

// ── Signal collection ─────────────────────────────────────────────────────

function canvasFingerprint(): string {
  try {
    const c = document.createElement('canvas');
    c.width = 200; c.height = 50;
    const ctx = c.getContext('2d');
    if (!ctx) return 'nc';
    ctx.fillStyle = '#f0f0f0'; ctx.fillRect(0, 0, 200, 50);
    ctx.fillStyle = '#1a56db'; ctx.font = '14px Arial';
    ctx.fillText('Florieren', 10, 30);
    return c.toDataURL();
  } catch {
    return 'cb';
  }
}

function collectSignals(): string {
  return [
    navigator.userAgent,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.language,
    navigator.hardwareConcurrency ?? 0,
    canvasFingerprint(),
  ].join('|');
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Returns a stable 64-char hex device fingerprint.
 * Never throws — falls back to djb2 if crypto.subtle is unavailable.
 * Cached in localStorage after first call (sub-millisecond on repeat calls).
 */
export async function getDeviceId(): Promise<string> {
  // Fast path — already computed on a previous call
  const shared = localStorage.getItem(SHARED_KEY);
  if (shared && shared.length === 64) return shared;

  const user    = auth.getUser();
  const userId  = user?.uniqueId ?? 'guest';
  const perUser = localStorage.getItem(cacheKey(userId));
  if (perUser && perUser.length === 64) {
    localStorage.setItem(SHARED_KEY, perUser);
    return perUser;
  }

  // Compute fingerprint
  const signals = collectSignals();
  const hash    = (await sha256(signals)) ?? djb2(signals);

  localStorage.setItem(SHARED_KEY, hash);
  localStorage.setItem(cacheKey(userId), hash);
  return hash;
}
