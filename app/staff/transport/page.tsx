'use client';
import { useEffect, useRef, useState } from 'react';
import { Bus, ChevronDown, ChevronUp, Phone, Users, CheckCircle, XCircle, History, MapPin, Play, Square, Wifi, WifiOff } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/StateDisplay';
import { useAuth } from '@/hooks/useAuth';

const BACKEND_WS = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

// ── Staff overview types ───────────────────────────────────────────────────
interface Student { uniqueId: string; name: string; absentToday: boolean; }
interface BusOverview {
  id: string; plateNumber: string; capacity: number; tripActive: boolean;
  route: string | null; driver: string | null; driverPhone: string | null;
  assigned: number; absentCount: number; students: Student[];
}

// ── Driver dashboard types ─────────────────────────────────────────────────
interface DriverStudent { uniqueId: string; name: string; absentToday: boolean; pickedUp: boolean; pickedUpAt?: string | null; }
interface DriverBus {
  id: string; plateNumber: string; capacity: number; tripActive: boolean;
  routeName: string | null; driverToken: string | null; gpsLat: number | null; gpsLng: number | null;
  students: DriverStudent[];
}
interface TripHistoryItem { date: string; plateNumber: string; routeName: string | null; studentCount: number; }
interface DriverDashboard {
  driverName: string; totalBuses: number; totalStudents: number;
  presentToday: number; absentToday: number; pickedUpToday: number;
  buses: DriverBus[]; tripHistory: TripHistoryItem[];
}

// ── Live Map ───────────────────────────────────────────────────────────────
function LiveMap({ coords }: { coords: { lat: number; lng: number } | null }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const instRef = useRef<{ map: any; marker: any } | null>(null);

  useEffect(() => {
    if (!mapRef.current || instRef.current) return;
    if (!document.getElementById('leaflet-css')) {
      const l = document.createElement('link'); l.id = 'leaflet-css'; l.rel = 'stylesheet';
      l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(l);
    }
    if (!document.getElementById('leaflet-z-fix')) {
      const s = document.createElement('style'); s.id = 'leaflet-z-fix';
      s.textContent = '.leaflet-pane,.leaflet-top,.leaflet-bottom{z-index:1!important}.leaflet-control{z-index:2!important}';
      document.head.appendChild(s);
    }
    import('leaflet').then(L => {
      if ((mapRef.current as any)?._leaflet_id) return;
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      const busIcon = L.divIcon({ html: `<div style="background:#7c3aed;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);font-size:18px">🚌</div>`, className: '', iconSize: [36, 36], iconAnchor: [18, 18] });
      const center: [number, number] = coords ? [coords.lat, coords.lng] : [9.082, 8.6753];
      const map = L.map(mapRef.current!, { zoomControl: true, attributionControl: false }).setView(center, coords ? 16 : 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      const marker = coords ? L.marker([coords.lat, coords.lng], { icon: busIcon }).addTo(map) : null;
      instRef.current = { map, marker };
    });
    return () => { if (instRef.current) { instRef.current.map.remove(); instRef.current = null; } };
  }, []);

  useEffect(() => {
    if (!instRef.current || !coords) return;
    const { map, marker } = instRef.current;
    if (marker) { marker.setLatLng([coords.lat, coords.lng]); }
    else {
      import('leaflet').then(L => {
        const icon = L.divIcon({ html: `<div style="background:#7c3aed;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:3px solid white;font-size:18px">🚌</div>`, className: '', iconSize: [36, 36], iconAnchor: [18, 18] });
        instRef.current!.marker = L.marker([coords.lat, coords.lng], { icon }).addTo(map);
      });
    }
    map.setView([coords.lat, coords.lng], Math.max(map.getZoom(), 16), { animate: true });
  }, [coords]);

  return <div ref={mapRef} className="w-full h-56 rounded-xl overflow-hidden" />;
}

// ── Driver Dashboard UI ────────────────────────────────────────────────────
function DriverDashboardView() {
  const [data, setData] = useState<DriverDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [tripActive, setTripActive] = useState(false);
  const [connected, setConnected] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const [tripError, setTripError] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const watchRef = useRef<number | null>(null);
  const toast = useToast();

  useEffect(() => {
    api.get<any>('staff/transport/driver-dashboard')
      .then(r => {
        setData(r.data ?? null);
        if (r.data?.buses?.[0]?.tripActive) setTripActive(true);
      })
      .catch(() => toast.error('Failed to load driver dashboard'))
      .finally(() => setLoading(false));
  }, []);

  // Start GPS streaming when trip is active
  useEffect(() => {
    const token = data?.buses?.[0]?.driverToken;
    if (!tripActive || !token) return;

    const socket = io(`${BACKEND_WS}/transport`, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => { setConnected(true); socket.emit('driver:join', { token }); });
    socket.on('disconnect', () => setConnected(false));

    if (navigator.geolocation) {
      watchRef.current = navigator.geolocation.watchPosition(
        pos => {
          const { latitude: lat, longitude: lng } = pos.coords;
          setCoords({ lat, lng });
          socket.emit('driver:gps', { token, lat, lng });
          setLastSent(new Date());
        },
        err => setTripError(`GPS error: ${err.message}`),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
      );
    }
    return () => {
      socket.disconnect();
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [tripActive, data]);

  const startTrip = async () => {
    const token = data?.buses?.[0]?.driverToken;
    if (!token) return;
    try {
      const r = await fetch(`/api/driver/trip/${token}/start`, { method: 'POST' });
      const res = await r.json();
      if (!res.success) throw new Error(res.message);
      setTripActive(true);
    } catch (e: any) { setTripError(e.message ?? 'Failed to start trip'); }
  };

  const endTrip = async () => {
    const token = data?.buses?.[0]?.driverToken;
    if (!token || !confirm('End trip? GPS tracking will stop.')) return;
    try {
      await fetch(`/api/driver/trip/${token}/end`, { method: 'POST' });
      setTripActive(false); setConnected(false);
      socketRef.current?.disconnect();
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    } catch { setTripError('Failed to end trip'); }
  };

  if (loading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />)}</div>;
  if (!data) return <EmptyState icon={Bus} message="No bus assigned to you yet." />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'My Buses', value: data.totalBuses, color: 'bg-purple-50 text-purple-700', icon: Bus },
          { label: 'Total Students', value: data.totalStudents, color: 'bg-blue-50 text-blue-700', icon: Users },
          { label: 'Present Today', value: data.presentToday, color: 'bg-green-50 text-green-700', icon: CheckCircle },
          { label: 'Absent Today', value: data.absentToday, color: 'bg-red-50 text-red-700', icon: XCircle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className={`rounded-2xl p-4 ${color} flex flex-col gap-1`}>
            <Icon size={18} className="opacity-60" />
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs font-medium opacity-70">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Live Map + Trip controls ── */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Live Location</span>
          <span className="text-xs flex items-center gap-1 text-gray-500">
            {tripActive
              ? connected ? <><Wifi size={11} className="text-green-500" />Live{lastSent && ` · ${lastSent.toLocaleTimeString()}`}</>
                          : <><WifiOff size={11} className="text-red-400" />Connecting…</>
              : <span className="text-gray-400">Trip not started</span>}
          </span>
        </div>

        <LiveMap coords={coords} />

        {coords && <p className="text-center text-xs text-gray-400">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</p>}
        {!coords && tripActive && <p className="text-center text-xs text-gray-400">Acquiring GPS signal…</p>}

        {tripError && <p className="text-xs text-red-500 text-center">{tripError}</p>}

        {!tripActive ? (
          <button onClick={startTrip}
            className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm transition-colors">
            <Play size={16} /> Start Trip
          </button>
        ) : (
          <button onClick={endTrip}
            className="w-full flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold text-sm transition-colors">
            <Square size={16} /> End Trip
          </button>
        )}
      </div>

      {/* ── Pickup progress ── */}
      {data.totalStudents > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700 flex items-center gap-2"><MapPin size={14} className="text-purple-500" />Pickup Progress</span>
            <span className="text-xs text-purple-600 font-bold">{data.pickedUpToday}/{data.presentToday} picked up</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div className="h-3 rounded-full bg-purple-500 transition-all"
              style={{ width: `${data.presentToday ? Math.round((data.pickedUpToday / data.presentToday) * 100) : 0}%` }} />
          </div>
        </div>
      )}

      {/* ── Buses & students ── */}
      <div className="space-y-3">
        {data.buses.map(bus => {
          const isOpen = expanded[bus.id];
          const pickedUp = bus.students.filter(s => s.pickedUp).length;
          const present = bus.students.filter(s => !s.absentToday).length;
          return (
            <div key={bus.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(e => ({ ...e, [bus.id]: !isOpen }))}>
                <div className={`p-2 rounded-xl ${bus.tripActive ? 'bg-green-100' : 'bg-blue-100'}`}>
                  <Bus size={18} className={bus.tripActive ? 'text-green-600' : 'text-blue-600'} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 flex items-center gap-2">
                    {bus.plateNumber}
                    {bus.tripActive && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full animate-pulse">● Live</span>}
                  </div>
                  <div className="text-xs text-gray-500">
                    {bus.routeName ?? 'No route'} · {bus.students.length}/{bus.capacity} assigned · {pickedUp}/{present} picked up
                  </div>
                </div>
                {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
              {isOpen && (
                <div className="border-t border-gray-100 p-4">
                  {bus.students.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-3">No students assigned</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {bus.students.map(s => (
                        <div key={s.uniqueId} className={`rounded-xl px-3 py-2 text-xs border flex items-center justify-between
                          ${s.absentToday ? 'bg-red-50 border-red-200' : s.pickedUp ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                          <div>
                            <p className={`font-medium ${s.absentToday ? 'text-red-700' : s.pickedUp ? 'text-green-700' : 'text-gray-800'}`}>{s.name}</p>
                            {s.absentToday && <p className="text-red-500 text-[10px]">Absent</p>}
                            {!s.absentToday && s.pickedUp && <p className="text-green-600 text-[10px]">Picked up {s.pickedUpAt ? new Date(s.pickedUpAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p>}
                            {!s.absentToday && !s.pickedUp && <p className="text-gray-400 text-[10px]">Waiting</p>}
                          </div>
                          {s.pickedUp ? <CheckCircle size={14} className="text-green-500 shrink-0" /> : s.absentToday ? <XCircle size={14} className="text-red-400 shrink-0" /> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Trip History ── */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <button onClick={() => setShowHistory(p => !p)} className="w-full flex items-center justify-between text-sm font-semibold text-gray-700">
          <span className="flex items-center gap-2"><History size={15} className="text-purple-500" />Trip History</span>
          <span className="text-xs text-gray-400">{showHistory ? '▲' : '▼'}</span>
        </button>
        {showHistory && (
          <div className="mt-3 space-y-2">
            {data.tripHistory.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">No trips yet.</p>
            ) : data.tripHistory.map((t, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center shrink-0"><Bus size={14} className="text-purple-600" /></div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-800">{t.routeName ?? t.plateNumber}</p>
                  <p className="text-[10px] text-gray-400">{new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {t.studentCount} students</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Staff Overview UI ──────────────────────────────────────────────────────
function StaffOverviewView() {
  const [buses, setBuses] = useState<BusOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toast = useToast();

  useEffect(() => {
    api.get<any>(endpoints.staff.transportOverview)
      .then(r => setBuses(r.data ?? []))
      .catch(() => toast.error('Failed to load transport data'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Transport Overview</h1>
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse" />)}</div>
      ) : buses.length === 0 ? (
        <EmptyState icon={Bus} message="No buses configured yet." />
      ) : (
        <div className="space-y-3">
          {buses.map(bus => {
            const isOpen = expanded[bus.id];
            return (
              <div key={bus.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(e => ({ ...e, [bus.id]: !isOpen }))}>
                  <div className={`p-2 rounded-xl ${bus.tripActive ? 'bg-green-100' : 'bg-blue-100'}`}>
                    <Bus size={18} className={bus.tripActive ? 'text-green-600' : 'text-blue-600'} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                      {bus.plateNumber}
                      {bus.tripActive && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Live</span>}
                      {bus.absentCount > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{bus.absentCount} absent</span>}
                    </div>
                    <div className="text-xs text-gray-500">
                      {bus.route ?? 'No route'} · {bus.driver ?? 'No driver'} · {bus.assigned}/{bus.capacity} students
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {bus.driverPhone && (
                      <a href={`tel:${bus.driverPhone}`} onClick={e => e.stopPropagation()} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg">
                        <Phone size={15} />
                      </a>
                    )}
                    {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>
                {isOpen && (
                  <div className="border-t border-gray-100 p-4">
                    {bus.students.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-3">No students assigned</p>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700">
                          <Users size={14} className="text-purple-500" /> Students
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {bus.students.map(s => (
                            <div key={s.uniqueId} className={`rounded-lg px-3 py-2 text-xs border ${s.absentToday ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                              <div className={`font-medium ${s.absentToday ? 'text-red-700' : 'text-gray-800'}`}>{s.name}</div>
                              {s.absentToday && <div className="text-red-500 text-[10px]">Absent today</div>}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Page entry ─────────────────────────────────────────────────────────────
export default function StaffTransportPage() {
  const { user } = useAuth();
  const [isDriver, setIsDriver] = useState<boolean | null>(null);

  useEffect(() => {
    if (user === null) return;
    if (user.isDriver) { setIsDriver(true); return; }
    // Fallback: check if this staff user is a driver via the dashboard endpoint
    api.get<any>('staff/transport/driver-dashboard')
      .then(r => setIsDriver(r.data !== null))
      .catch(() => setIsDriver(false));
  }, [user]);

  if (user === null || isDriver === null) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse" />)}</div>;
  }
  return isDriver ? <DriverDashboardView /> : <StaffOverviewView />;
}
