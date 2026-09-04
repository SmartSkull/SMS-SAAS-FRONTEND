/**
 * Stable device fingerprint for attendance clock-in enforcement.
 *
 * Combines passive browser signals into a SHA-256 hash that is consistent
 * across page reloads on the same device but differs between devices.
 * The result is cached in localStorage so it never changes for this device.
 *
 * Signals used (all read-only, no permissions required):
 *   - userAgent
 *   - screen width × height × colorDepth
 *   - timezone offset
 *   - language
 *   - hardware concurrency
 *   - canvas pixel fingerprint
 *
 * NOTE: This is not cryptographically tamper-proof — a determined user with
 * DevTools access could spoof it. For school attendance it is sufficient:
 * it prevents casual multi-device abuse without requiring native app APIs.
 */

const STORAGE_KEY = 'florieren_device_id';

/** SHA-256 a string → hex digest */
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Draw a tiny canvas and read back its pixel data as a fingerprint string */
function canvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width  = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';

    // Draw text with subpixel rendering differences between GPU/driver combos
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle    = '#f0f0f0';
    ctx.fillRect(0, 0, 200, 50);
    ctx.fillStyle    = '#069';
    ctx.font         = '15px Arial';
    ctx.fillText('Florieren🎓', 10, 30);
    ctx.fillStyle    = 'rgba(102,204,0,0.7)';
    ctx.font         = '18px Georgia';
    ctx.fillText('Attendance', 50, 45);

    return canvas.toDataURL();
  } catch {
    return 'canvas-error';
  }
}

/** Collect all passive signals into one string */
function collectSignals(): string {
  const parts: (string | number)[] = [
    navigator.userAgent,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.language,
    navigator.hardwareConcurrency ?? 0,
    canvasFingerprint(),
  ];
  return parts.join('||');
}

/**
 * Returns a stable hex device ID for this browser/device.
 * Cached in localStorage after first call.
 */
export async function getDeviceId(): Promise<string> {
  // Return cached value if available
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached && cached.length === 64) return cached;

  const raw = collectSignals();
  const hash = await sha256(raw);

  localStorage.setItem(STORAGE_KEY, hash);
  return hash;
}
