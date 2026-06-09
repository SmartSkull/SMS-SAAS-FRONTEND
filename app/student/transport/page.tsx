'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Bus, Wifi, WifiOff, AlertTriangle, CheckCircle, Clock, Navigation, MapPin } from 'lucide-react';
import { api } from '@/lib/api';

interface BusInfo {
  busId: string;
  plateNumber: string;
  routeName?: string;
  driverName?: string;
  tripActive: boolean;
  schoolName?: string;
  lat: number | null;
  lng: number | null;
  gpsUpdatedAt: string | null;
  absentToday: boolean;
  homeLat: number | null;
  homeLng: number | null;
}

interface EtaInfo {
  durationSeconds: number;
  distanceMeters: number;
  source: 'osrm' | 'estimate';
}

const BACKEND_WS = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

function formatDuration(seconds: number): string {
  if (seconds < 60) return 'Less than 1 min';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''}`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}

function LiveMap({ busCoords, homeCoords }: {
  busCoords: { lat: number; lng: number } | null;
  homeCoords: { lat: number; lng: number } | null;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<{ map: any; busMarker: any } | null>(null);

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
      // Guard against strict-mode double-invoke: if container already has a map, skip
      if ((mapRef.current as any)?._leaflet_id) return;
      const busIcon = L.divIcon({ html: `<div style="background:#7c3aed;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:18px;">🚌</div>`, className: '', iconSize: [36, 36], iconAnchor: [18, 18] });
      const homeIcon = L.divIcon({ html: `<div style="background:#16a34a;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:16px;">🏠</div>`, className: '', iconSize: [32, 32], iconAnchor: [16, 16] });
      const center: [number, number] = busCoords ? [busCoords.lat, busCoords.lng] : homeCoords ? [homeCoords.lat, homeCoords.lng] : [9.082, 8.6753];
      const map = L.map(mapRef.current!, { zoomControl: true, attributionControl: false }).setView(center, busCoords || homeCoords ? 14 : 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      const busMarker = busCoords ? L.marker([busCoords.lat, busCoords.lng], { icon: busIcon }).addTo(map) : null;
      if (homeCoords) L.marker([homeCoords.lat, homeCoords.lng], { icon: homeIcon }).addTo(map).bindTooltip('Your stop', { permanent: false });
      instanceRef.current = { map, busMarker };
      if (busCoords && homeCoords) {
        map.fitBounds([[busCoords.lat, busCoords.lng], [homeCoords.lat, homeCoords.lng]], { padding: [40, 40] });
      }
    });
    return () => {
      if (instanceRef.current) {
        instanceRef.current.map.remove();
        instanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!instanceRef.current || !busCoords) return;
    const { map, busMarker } = instanceRef.current;
    if (busMarker) {
      busMarker.setLatLng([busCoords.lat, busCoords.lng]);
    } else {
      import('leaflet').then(L => {
        const busIcon = L.divIcon({ html: `<div style="background:#7c3aed;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:18px;">🚌</div>`, className: '', iconSize: [36, 36], iconAnchor: [18, 18] });
        instanceRef.current!.busMarker = L.marker([busCoords.lat, busCoords.lng], { icon: busIcon }).addTo(map);
      });
    }
    if (homeCoords) {
      map.fitBounds([[busCoords.lat, busCoords.lng], [homeCoords.lat, homeCoords.lng]], { padding: [40, 40] });
    } else {
      map.setView([busCoords.lat, busCoords.lng], Math.max(map.getZoom(), 15), { animate: true });
    }
  }, [busCoords]);

  return <div ref={mapRef} className="w-full h-56 rounded-xl overflow-hidden" />;
}

export default function StudentTransportPage() {
  const [busInfo, setBusInfo] = useState<BusInfo | null>(null);
  const [busCoords, setBusCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [homeCoords, setHomeCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [absent, setAbsent] = useState(false);
  const [absentLoading, setAbsentLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [eta, setEta] = useState<EtaInfo | null>(null);
  const [etaLoading, setEtaLoading] = useState(false);
  const [settingHome, setSettingHome] = useState(false);
  const [homeMsg, setHomeMsg] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const etaTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEta = useCallback(async () => {
    setEtaLoading(true);
    try {
      const r = await api.get<{ success: boolean; data: EtaInfo | null }>('student/transport/eta');
      setEta(r.data ?? null);
    } catch { setEta(null); }
    finally { setEtaLoading(false); }
  }, []);

  useEffect(() => {
    api.get<{ success: boolean; data: BusInfo | null }>('student/transport/bus')
      .then(r => {
        if (r.data) {
          setBusInfo(r.data);
          setAbsent(r.data.absentToday);
          if (r.data.lat && r.data.lng) setBusCoords({ lat: r.data.lat, lng: r.data.lng });
          if (r.data.homeLat && r.data.homeLng) setHomeCoords({ lat: r.data.homeLat, lng: r.data.homeLng });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!busInfo?.tripActive) { setEta(null); return; }
    fetchEta();
    etaTimerRef.current = setInterval(fetchEta, 30_000);
    return () => { if (etaTimerRef.current) clearInterval(etaTimerRef.current); };
  }, [busInfo?.tripActive, fetchEta]);

  useEffect(() => {
    if (!busInfo?.tripActive || !busInfo.busId) return;
    const socket = io(`${BACKEND_WS}/transport`, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => { setConnected(true); socket.emit('student:watch', { busId: busInfo.busId }); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('bus:location', (data: { lat: number; lng: number }) => setBusCoords({ lat: data.lat, lng: data.lng }));
    return () => { socket.disconnect(); };
  }, [busInfo?.tripActive, busInfo?.busId]);

  const toggleAbsent = async () => {
    if (!busInfo) return;
    setAbsentLoading(true);
    try {
      const newAbsent = !absent;
      await api.post('student/transport/absent', { absent: newAbsent });
      setAbsent(newAbsent);
      setMessage(newAbsent ? "Driver notified — your stop will be skipped today." : "Absence cancelled — driver will come to your stop.");
      setTimeout(() => setMessage(''), 4000);
    } catch { setMessage('Failed to update. Please try again.'); setTimeout(() => setMessage(''), 3000); }
    finally { setAbsentLoading(false); }
  };

  const pinHomeLocation = () => {
    if (!navigator.geolocation) { setHomeMsg('Geolocation not supported on this device'); return; }
    setSettingHome(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await api.post('student/transport/home-location', { lat: pos.coords.latitude, lng: pos.coords.longitude });
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setHomeCoords(coords);
          setHomeMsg('Home location saved!');
          setTimeout(() => setHomeMsg(''), 3000);
        } catch { setHomeMsg('Failed to save. Please try again.'); }
        finally { setSettingHome(false); }
      },
      (err) => { setHomeMsg(`GPS error: ${err.message}`); setSettingHome(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Bus size={36} className="text-purple-400 animate-pulse" /></div>;

  if (!busInfo) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <Bus size={48} className="text-gray-300 mb-3" />
      <p className="text-gray-500 font-medium">No bus assigned</p>
      <p className="text-gray-400 text-sm mt-1">Contact your school admin to be assigned to a transport route.</p>
    </div>
  );

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col gap-4">
      {/* Bus info header */}
      <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
        <div className="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Bus size={22} className="text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900">{busInfo.plateNumber}</div>
          <div className="text-xs text-gray-500 truncate">{busInfo.routeName ?? 'No route'} · {busInfo.schoolName}</div>
          {busInfo.driverName && <div className="text-xs text-gray-400">Driver: {busInfo.driverName}</div>}
        </div>
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${busInfo.tripActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${busInfo.tripActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          {busInfo.tripActive ? 'On the way' : 'Not active'}
        </span>
      </div>

      {/* ETA card */}
      {busInfo.tripActive && homeCoords && (
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Clock size={20} className="text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-purple-500 font-medium uppercase tracking-wide">Estimated arrival at your stop</p>
            {etaLoading && !eta ? (
              <p className="text-gray-400 text-sm mt-0.5">Calculating…</p>
            ) : eta ? (
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold text-purple-700">{formatDuration(eta.durationSeconds)}</span>
                <span className="text-xs text-purple-400 flex items-center gap-1">
                  <Navigation size={10} />{formatDistance(eta.distanceMeters)} away{eta.source === 'estimate' ? ' (est.)' : ''}
                </span>
              </div>
            ) : (
              <p className="text-gray-400 text-sm mt-0.5">Bus location not yet available</p>
            )}
          </div>
        </div>
      )}

      {/* Live map */}
      <div className="bg-white rounded-2xl shadow-sm p-3">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-sm font-medium text-gray-700">Bus Location</span>
          {busInfo.tripActive && (
            <span className="text-xs flex items-center gap-1 text-gray-500">
              {connected ? <><Wifi size={11} className="text-green-500" /> Live</> : <><WifiOff size={11} className="text-red-400" /> Connecting…</>}
            </span>
          )}
        </div>
        <LiveMap busCoords={busCoords} homeCoords={homeCoords} />
        {!busCoords && <p className="text-center text-xs text-gray-400 mt-2">{busInfo.tripActive ? 'Waiting for GPS signal…' : 'Trip not started yet'}</p>}
      </div>

      {/* Home location setup — shown when not yet set */}
      {!homeCoords && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <MapPin size={20} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">Home location not set</p>
              <p className="text-xs text-amber-600 mt-0.5 mb-3">Your home location is needed to show ETA and send bus arrival alerts. Tap the button below while you're at home.</p>
              <button onClick={pinHomeLocation} disabled={settingHome}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
                <MapPin size={15} />{settingHome ? 'Getting location…' : 'Use my current location as home'}
              </button>
              {homeMsg && <p className="mt-2 text-xs text-amber-700">{homeMsg}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Sick / absent toggle */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <p className="text-sm font-medium text-gray-700 mb-1">Are you sick today?</p>
        <p className="text-xs text-gray-400 mb-3">Tell the driver not to stop at your house to pick you up.</p>
        <button onClick={toggleAbsent} disabled={absentLoading}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-colors ${absent ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-500 text-white hover:bg-red-600'}`}>
          {absent ? <><CheckCircle size={18} /> Cancel — I'm coming to school</> : <><AlertTriangle size={18} /> I'm sick — skip my stop</>}
        </button>
        {message && <p className={`mt-2 text-xs text-center ${absent ? 'text-green-600' : 'text-red-500'}`}>{message}</p>}
      </div>
    </div>
  );
}
