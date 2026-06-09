'use client';
import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { Bus, Play, Square, Wifi, WifiOff } from 'lucide-react';

interface BusInfo { busId: string; plateNumber: string; routeName?: string; driverName?: string; tripActive: boolean; schoolName?: string; }

const API = '/api';
const BACKEND_WS = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

// ── Live map — follows the bus marker in real time ────────────────────────

function LiveMap({ coords }: { coords: { lat: number; lng: number } | null }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<{ map: any; marker: any } | null>(null);

  useEffect(() => {
    if (!mapRef.current || instanceRef.current) return;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css'; link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    import('leaflet').then(L => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      if ((mapRef.current as any)?._leaflet_id) return;

      // Custom bus icon
      const busIcon = L.divIcon({
        html: `<div style="background:#7c3aed;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:18px;">🚌</div>`,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const center: [number, number] = coords ? [coords.lat, coords.lng] : [9.082, 8.6753];
      const map = L.map(mapRef.current!, { zoomControl: true, attributionControl: false }).setView(center, coords ? 16 : 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

      const marker = coords ? L.marker([coords.lat, coords.lng], { icon: busIcon }).addTo(map) : null;
      instanceRef.current = { map, marker };
    });

    return () => {
      if (instanceRef.current) { instanceRef.current.map.remove(); instanceRef.current = null; }
    };
  }, []);

  // Update marker position on every GPS update
  useEffect(() => {
    if (!instanceRef.current || !coords) return;
    const { map, marker } = instanceRef.current;
    const { L } = map as any;

    if (marker) {
      marker.setLatLng([coords.lat, coords.lng]);
    } else {
      import('leaflet').then(L => {
        const busIcon = L.divIcon({
          html: `<div style="background:#7c3aed;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:18px;">🚌</div>`,
          className: '', iconSize: [36, 36], iconAnchor: [18, 18],
        });
        instanceRef.current!.marker = L.marker([coords.lat, coords.lng], { icon: busIcon }).addTo(instanceRef.current!.map);
      });
    }
    map.setView([coords.lat, coords.lng], Math.max(map.getZoom(), 16), { animate: true });
  }, [coords]);

  return <div ref={mapRef} className="w-full h-56 rounded-xl overflow-hidden" />;
}

// ── Page ──────────────────────────────────────────────────────────────────

function DriverTripContent() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [busInfo, setBusInfo] = useState<BusInfo | null>(null);
  const [error, setError] = useState('');
  const [tripActive, setTripActive] = useState(false);
  const [connected, setConnected] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const socketRef = useRef<Socket | null>(null);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    if (!token) { setError('No driver token provided'); setLoading(false); return; }
    fetch(`${API}/driver/trip/${token}`)
      .then(r => r.json())
      .then(r => {
        if (!r.success) throw new Error('Invalid token');
        setBusInfo(r.data);
        setTripActive(r.data.tripActive);
        setLoading(false);
      })
      .catch(() => { setError('Invalid or expired driver token'); setLoading(false); });
  }, [token]);

  useEffect(() => {
    if (!tripActive || !busInfo) return;

    const socket = io(`${BACKEND_WS}/transport`, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => { setConnected(true); socket.emit('driver:join', { token }); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('error', (msg: string) => setError(msg));

    if (!navigator.geolocation) { setError('Geolocation not supported on this device'); return; }
    watchRef.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        socket.emit('driver:gps', { token, lat, lng });
        setLastSent(new Date());
      },
      err => setError(`GPS error: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      socket.disconnect();
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [tripActive, busInfo]);

  const startTrip = async () => {
    try {
      const r = await fetch(`${API}/driver/trip/${token}/start`, { method: 'POST' });
      const data = await r.json();
      if (!data.success) throw new Error(data.message);
      setTripActive(true);
    } catch (e: any) { setError(e.message ?? 'Failed to start trip'); }
  };

  const endTrip = async () => {
    if (!confirm('End trip? GPS tracking will stop.')) return;
    try {
      await fetch(`${API}/driver/trip/${token}/end`, { method: 'POST' });
      setTripActive(false);
      setConnected(false);
      socketRef.current?.disconnect();
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    } catch { setError('Failed to end trip'); }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center"><Bus size={40} className="mx-auto mb-3 text-purple-400 animate-pulse" /><p className="text-gray-500">Loading…</p></div>
    </div>
  );

  if (error && !busInfo) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-sm w-full">
        <Bus size={40} className="mx-auto mb-3 text-red-400" />
        <p className="text-red-600 font-medium">{error}</p>
        <p className="text-gray-400 text-sm mt-2">Contact your school admin for a valid driver link.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-4 gap-4 max-w-sm mx-auto pt-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
        <div className="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Bus size={22} className="text-purple-600" />
        </div>
        <div>
          <div className="font-bold text-gray-900">{busInfo?.plateNumber}</div>
          <div className="text-xs text-gray-500">{busInfo?.routeName ?? 'No route assigned'} · {busInfo?.schoolName}</div>
          {busInfo?.driverName && <div className="text-xs text-gray-400">{busInfo.driverName}</div>}
        </div>
        <div className="ml-auto">
          <div className={`w-2.5 h-2.5 rounded-full ${tripActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
        </div>
      </div>

      {/* Live Map */}
      <div className="bg-white rounded-2xl shadow-sm p-3">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-sm font-medium text-gray-700">Live Location</span>
          {tripActive && (
            <span className="text-xs flex items-center gap-1 text-gray-500">
              {connected ? <><Wifi size={11} className="text-green-500" /> Live</> : <><WifiOff size={11} className="text-red-400" /> Reconnecting</>}
              {lastSent && <span>· {lastSent.toLocaleTimeString()}</span>}
            </span>
          )}
        </div>
        <LiveMap coords={coords} />
        {coords && (
          <p className="text-center text-xs text-gray-400 mt-2">
            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </p>
        )}
        {!coords && tripActive && (
          <p className="text-center text-xs text-gray-400 mt-2">Acquiring GPS signal…</p>
        )}
        {!tripActive && (
          <p className="text-center text-xs text-gray-400 mt-2">Start trip to see your location</p>
        )}
      </div>

      {/* Error */}
      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600">{error}</div>}

      {/* Action button */}
      {!tripActive ? (
        <button onClick={startTrip}
          className="w-full flex items-center justify-center gap-2 py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-semibold text-base transition-colors shadow-sm">
          <Play size={20} /> Start Trip
        </button>
      ) : (
        <button onClick={endTrip}
          className="w-full flex items-center justify-center gap-2 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-semibold text-base transition-colors shadow-sm">
          <Square size={20} /> End Trip
        </button>
      )}

      <p className="text-center text-xs text-gray-400 pb-4">Keep this page open while driving.</p>
    </div>
  );
}

export default function DriverTripPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Bus size={40} className="text-purple-400 animate-pulse" />
      </div>
    }>
      <DriverTripContent />
    </Suspense>
  );
}
