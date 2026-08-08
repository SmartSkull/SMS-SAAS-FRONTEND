'use client';

let loadPromise: Promise<any> | null = null;

/**
 * Dynamically loads the Google Maps JavaScript API once and caches the promise.
 * Requires NEXT_PUBLIC_GOOGLE_MAPS_KEY. Resolves the global `google` object.
 */
export function loadGoogleMaps(): Promise<any> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<any>((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Google Maps is client-only'));
    const w = window as any;
    if (w.google?.maps) return resolve(w.google);

    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!key) {
      return reject(new Error('Missing NEXT_PUBLIC_GOOGLE_MAPS_KEY'));
    }

    const existing = document.getElementById('google-maps-script') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).google));
      existing.addEventListener('error', () => reject(new Error('Google Maps failed to load')));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places,marker&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve((window as any).google);
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Google Maps failed to load'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
