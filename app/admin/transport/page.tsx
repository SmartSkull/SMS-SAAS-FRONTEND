'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Trash2, Bus, MapPin, User, Search, ChevronDown, ChevronUp, X, Play, Square, Link2, RefreshCw, Pencil, Check } from 'lucide-react';import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/StateDisplay';
import { useSchoolData } from '@/hooks/useSchoolData';
import { io, Socket } from 'socket.io-client';

// ── Types ──────────────────────────────────────────────────────────────────

interface RouteObj { id: number; name: string; description?: string; fare: number; polyline?: [number,number][]; buses: BusObj[]; }
interface Driver { id: number; name: string; phone?: string; licenseNo?: string; userId?: string | null; user?: { uniqueId: string; firstName: string; lastName: string } | null; buses: { id: number; plateNumber: string; driverToken?: string }[]; }
interface BusObj {
  id: number; plateNumber: string; capacity: number; driverToken?: string;
  gpsLat?: number; gpsLng?: number; gpsUpdatedAt?: string;
  tripActive: boolean; route?: RouteObj; driver?: Driver;
  assignments: { student: { user: { uniqueId: string; firstName: string; lastName: string } } }[];
}

type Tab = 'buses' | 'routes' | 'drivers' | 'gps';

const BACKEND = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
const FRONTEND = typeof window !== 'undefined' ? window.location.origin : '';

// ── Transport Loader ──────────────────────────────────────────────────────

function TransportLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-4">
      <style>{`
        @keyframes drive{0%{transform:translateX(-80px)}100%{transform:translateX(80px)}}
        @keyframes road-scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes wheel-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .car-drive{animation:drive 1.4s ease-in-out infinite alternate}
        .road-scroll{animation:road-scroll 0.7s linear infinite}
        .wheel-spin{animation:wheel-spin 0.5s linear infinite}
      `}</style>
      <div className="relative w-52 overflow-hidden">
        <div className="car-drive flex flex-col items-center mb-1">
          <Bus size={52} className="text-purple-600 drop-shadow-md" />
          <div className="flex gap-7 -mt-1">
            <div className="w-3 h-3 rounded-full border-2 border-purple-800 bg-gray-200 wheel-spin" />
            <div className="w-3 h-3 rounded-full border-2 border-purple-800 bg-gray-200 wheel-spin" />
          </div>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden relative mt-1">
          <div className="road-scroll absolute top-1/2 -translate-y-1/2 flex gap-4" style={{ width: '200%' }}>
            {[...Array(12)].map((_, i) => <div key={i} className="w-6 h-0.5 bg-yellow-400 rounded-full shrink-0" />)}
          </div>
        </div>
      </div>
      <p className="text-purple-500 text-sm font-medium animate-pulse tracking-wide">Loading transport data…</p>
    </div>
  );
}

// ── Live GPS Map (Leaflet + WebSocket) ───────────────────────────────────

function LiveGpsMap({ buses, watchBusIds }: { buses: BusObj[]; watchBusIds: number[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<{ map: any; L: any; markers: Map<string, any>; polylines: any[] }>( null as any);

  useEffect(() => {
    if (!mapRef.current || instanceRef.current) return;
    import('leaflet').then(L => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css'; link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (!document.getElementById('leaflet-z-fix')) {
        const style = document.createElement('style');
        style.id = 'leaflet-z-fix';
        style.textContent = '.leaflet-pane, .leaflet-top, .leaflet-bottom { z-index: 1 !important; } .leaflet-control { z-index: 2 !important; }';
        document.head.appendChild(style);
      }
      const map = L.map(mapRef.current!).setView([9.082, 8.6753], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
      instanceRef.current = { map, L, markers: new Map(), polylines: [] };
    });
    return () => { if (instanceRef.current) { instanceRef.current.map.remove(); (instanceRef as any).current = null; } };
  }, []);

  // Draw bus markers
  useEffect(() => {
    if (!instanceRef.current) return;
    const { map, L, markers } = instanceRef.current;
    buses.forEach(b => {
      if (!b.gpsLat || !b.gpsLng) return;
      const key = String(b.id);
      const lat = Number(b.gpsLat); const lng = Number(b.gpsLng);
      if (markers.has(key)) {
        markers.get(key).setLatLng([lat, lng]);
      } else {
        const m = L.marker([lat, lng]).bindPopup(`<b>${b.plateNumber}</b><br>${b.route?.name ?? 'No route'}<br>${b.driver?.name ?? 'No driver'}`).addTo(map);
        markers.set(key, m);
      }
    });
    const located = buses.filter(b => b.gpsLat && b.gpsLng);
    if (located.length) map.fitBounds(located.map(b => [Number(b.gpsLat), Number(b.gpsLng)]) as any, { maxZoom: 14 });
  }, [buses]);

  // Draw route polylines
  useEffect(() => {
    if (!instanceRef.current) return;
    const { map, L, polylines } = instanceRef.current;
    polylines.forEach(p => p.remove());
    instanceRef.current.polylines = [];
    buses.forEach(b => {
      if (!b.route?.polyline?.length) return;
      const poly = L.polyline(b.route.polyline, { color: '#7c3aed', weight: 3, opacity: 0.7 }).addTo(map);
      instanceRef.current.polylines.push(poly);
    });
  }, [buses]);

  return <div ref={mapRef} className="w-full h-[420px] rounded-2xl overflow-hidden" />;
}

// ── Route Drawing Map ─────────────────────────────────────────────────────

function RouteDrawMap({ initialPolyline, onChange }: { initialPolyline?: [number,number][]; onChange: (pts: [number,number][]) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<{ map: any; L: any; markers: any[]; polyline: any | null }>(null as any);
  const ptsRef = useRef<[number,number][]>(initialPolyline ?? []);

  const redraw = () => {
    if (!instanceRef.current) return;
    const { map, L } = instanceRef.current;
    instanceRef.current.markers.forEach(m => m.remove());
    instanceRef.current.markers = [];
    if (instanceRef.current.polyline) instanceRef.current.polyline.remove();
    ptsRef.current.forEach((pt, i) => {
      const m = L.circleMarker(pt, { radius: 7, color: i === 0 ? '#16a34a' : '#7c3aed', fillOpacity: 0.9 })
        .bindTooltip(i === 0 ? 'Start' : `Stop ${i}`, { permanent: false })
        .addTo(map);
      instanceRef.current.markers.push(m);
    });
    if (ptsRef.current.length > 1) {
      instanceRef.current.polyline = L.polyline(ptsRef.current, { color: '#7c3aed', weight: 3 }).addTo(map);
    }
    onChange([...ptsRef.current]);
  };

  useEffect(() => {
    if (!mapRef.current || instanceRef.current) return;
    import('leaflet').then(L => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css'; link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      const map = L.map(mapRef.current!).setView([9.082, 8.6753], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
      instanceRef.current = { map, L, markers: [], polyline: null };
      map.on('click', (e: any) => {
        ptsRef.current = [...ptsRef.current, [e.latlng.lat, e.latlng.lng]];
        redraw();
      });
      if (ptsRef.current.length) redraw();
    });
    return () => { if (instanceRef.current) { instanceRef.current.map.remove(); (instanceRef as any).current = null; } };
  }, []);

  return (
    <div className="space-y-2">
      <div ref={mapRef} className="w-full h-64 rounded-xl overflow-hidden border border-gray-200" />
      <div className="flex gap-2 text-xs">
        <button onClick={() => { ptsRef.current = ptsRef.current.slice(0, -1); redraw(); }} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg">Undo last point</button>
        <button onClick={() => { ptsRef.current = []; redraw(); }} className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg">Clear all</button>
        <span className="self-center text-gray-400">{ptsRef.current.length} waypoints · Click map to add</span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function TransportPage() {
  const [tab, setTab] = useState<Tab>('buses');
  const [buses, setBuses] = useState<BusObj[]>([]);
  const [routes, setRoutes] = useState<RouteObj[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const toast = useToast();
  const { classes } = useSchoolData();

  // live GPS state
  const [liveBuses, setLiveBuses] = useState<BusObj[]>([]);
  const socketRef = useRef<Socket | null>(null);

  // forms
  const [showBusForm, setShowBusForm] = useState(false);
  const [busForm, setBusForm] = useState({ plateNumber: '', capacity: 40, routeId: '', driverId: '' });
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [routeForm, setRouteForm] = useState({ name: '', description: '', fare: 0 });
  const [routePolyline, setRoutePolyline] = useState<[number,number][]>([]);
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [driverForm, setDriverForm] = useState({ name: '', phone: '', licenseNo: '', userId: '' });

  // route edit
  const [editRouteId, setEditRouteId] = useState<number | null>(null);
  // driver edit
  const [editDriverId, setEditDriverId] = useState<number | null>(null);
  const [editDriverForm, setEditDriverForm] = useState({ name: '', phone: '', licenseNo: '', userId: '' });
  const [editPolyline, setEditPolyline] = useState<[number,number][]>([]);

  // assign student
  const [assignBusId, setAssignBusId] = useState<number | null>(null);
  const [assignClass, setAssignClass] = useState('');
  const [staffOptions, setStaffOptions] = useState<{ uniqueId: string; firstName: string; lastName: string }[]>([]);
  const [studentOptions, setStudentOptions] = useState<{ uniqueId: string; firstName: string; lastName: string }[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');

  // driver link modal
  const [driverLinkBus, setDriverLinkBus] = useState<BusObj | null>(null);

  // ── Loaders ───────────────────────────────────────────────────────────────

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<any>(endpoints.admin.transportBuses).then(r => { setBuses(r.data ?? []); setLiveBuses(r.data ?? []); }),
      api.get<any>(endpoints.admin.transportRoutes).then(r => setRoutes(r.data ?? [])),
      api.get<any>(endpoints.admin.transportDrivers).then(r => setDrivers(r.data ?? [])),
      api.get<any>(endpoints.admin.staff, { per_page: 1000 }).then(r => setStaffOptions((r.data ?? []).filter((s: any) => s.role === 'driver').map((s: any) => ({ uniqueId: s.unique_id, firstName: s.firstname, lastName: s.lastname })))),
    ]).catch(() => toast.error('Failed to load transport data')).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // WebSocket for live GPS
  useEffect(() => {
    const socket = io(`${BACKEND}/transport`, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => {
      buses.forEach(b => socket.emit('watch:bus', { busId: String(b.id) }));
    });
    socket.on('bus:location', (data: { busId: string; lat: number; lng: number }) => {
      setLiveBuses(prev => prev.map(b => String(b.id) === data.busId ? { ...b, gpsLat: data.lat, gpsLng: data.lng, gpsUpdatedAt: new Date().toISOString() } : b));
    });
    return () => { socket.disconnect(); };
  }, [buses.length]);

  useEffect(() => {
    if (!assignBusId || !assignClass) { setStudentOptions([]); return; }
    setStudentsLoading(true);
    api.get<any>(endpoints.admin.students, { class: assignClass, search: studentSearch || undefined, per_page: 50 })
      .then(r => setStudentOptions((r.data ?? []).map((s: any) => ({ uniqueId: s.student_id ?? s.uniqueId, firstName: s.firstname ?? s.firstName, lastName: s.lastname ?? s.lastName }))))
      .catch(() => {}).finally(() => setStudentsLoading(false));
  }, [assignBusId, assignClass, studentSearch]);

  // ── Bus actions ───────────────────────────────────────────────────────────

  const createBus = async () => {
    if (!busForm.plateNumber.trim()) return toast.error('Plate number required');
    try {
      await api.post(endpoints.admin.transportBuses, { ...busForm, capacity: Number(busForm.capacity), routeId: busForm.routeId || undefined, driverId: busForm.driverId || undefined });
      toast.success('Bus added'); setShowBusForm(false); setBusForm({ plateNumber: '', capacity: 40, routeId: '', driverId: '' }); loadAll();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed'); }
  };

  const deleteBus = async (id: number) => {
    if (!confirm('Delete this bus?')) return;
    try { await api.delete(endpoints.admin.transportBus(String(id))); toast.success('Deleted'); loadAll(); }
    catch { toast.error('Failed to delete'); }
  };

  const updateBusField = async (id: number, data: any) => {
    try { await api.put(endpoints.admin.transportBus(String(id)), data); loadAll(); }
    catch { toast.error('Failed to update'); }
  };

  const toggleTrip = async (bus: BusObj) => {
    try {
      if (bus.tripActive) {
        await api.post(endpoints.admin.transportTripEnd(String(bus.id)), {});
        toast.success('Trip ended');
      } else {
        await api.post(endpoints.admin.transportTripStart(String(bus.id)), {});
        toast.success('Trip started');
      }
      loadAll();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed'); }
  };

  const regenerateToken = async (bus: BusObj) => {
    if (!confirm('Regenerate driver token? The old link will stop working.')) return;
    try {
      const r = await api.post<any>(endpoints.admin.transportToken(String(bus.id)), {});
      toast.success('Token regenerated');
      loadAll();
      setDriverLinkBus({ ...bus, driverToken: r.data?.token });
    } catch { toast.error('Failed'); }
  };

  // ── Route actions ─────────────────────────────────────────────────────────

  const createRoute = async () => {
    if (!routeForm.name.trim()) return toast.error('Name required');
    try {
      await api.post(endpoints.admin.transportRoutes, { ...routeForm, fare: Number(routeForm.fare), polyline: routePolyline.length ? routePolyline : undefined });
      toast.success('Route created'); setShowRouteForm(false); setRouteForm({ name: '', description: '', fare: 0 }); setRoutePolyline([]); loadAll();
    } catch { toast.error('Failed'); }
  };

  const saveRoutePolyline = async (id: number) => {
    try { await api.put(endpoints.admin.transportRoute(String(id)), { polyline: editPolyline }); toast.success('Route saved'); setEditRouteId(null); loadAll(); }
    catch { toast.error('Failed to save route'); }
  };

  const deleteRoute = async (id: number) => {
    if (!confirm('Delete route?')) return;
    try { await api.delete(endpoints.admin.transportRoute(String(id))); toast.success('Deleted'); loadAll(); }
    catch { toast.error('Failed'); }
  };

  // ── Driver actions ────────────────────────────────────────────────────────

  const createDriver = async () => {
    if (!driverForm.name.trim()) return toast.error('Name required');
    try {
      await api.post(endpoints.admin.transportDrivers, driverForm);
      toast.success('Driver added'); setShowDriverForm(false); setDriverForm({ name: '', phone: '', licenseNo: '', userId: '' }); loadAll();
    } catch { toast.error('Failed'); }
  };

  const deleteDriver = async (id: number) => {
    if (!confirm('Delete driver?')) return;
    try { await api.delete(endpoints.admin.transportDriver(String(id))); toast.success('Deleted'); loadAll(); }
    catch { toast.error('Failed'); }
  };

  const saveDriver = async (id: number) => {
    if (!editDriverForm.name.trim()) return toast.error('Name required');
    try {
      await api.put(endpoints.admin.transportDriver(String(id)), editDriverForm);
      toast.success('Driver updated'); setEditDriverId(null); loadAll();
    } catch { toast.error('Failed to update'); }
  };

  // ── Assign ────────────────────────────────────────────────────────────────

  const doAssign = async () => {
    if (!assignBusId || !selectedStudent) return toast.error('Select a student');
    try {
      await api.post(endpoints.admin.transportAssign(String(assignBusId)), { studentId: selectedStudent });
      toast.success('Student assigned'); setAssignBusId(null); setSelectedStudent(''); setAssignClass(''); loadAll();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed'); }
  };

  const doUnassign = async (uniqueId: string) => {
    try { await api.post(endpoints.admin.transportUnassign, { studentId: uniqueId }); toast.success('Unassigned'); loadAll(); }
    catch { toast.error('Failed'); }
  };

  const driverLink = (token?: string) => token ? `${FRONTEND}/driver/trip?token=${token}` : '';

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Transport</h1>

      <div className="flex gap-2 flex-wrap">
        {([['buses', 'Buses'], ['routes', 'Routes'], ['drivers', 'Drivers'], ['gps', 'GPS Tracking']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === key ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Buses ─────────────────────────────────────────────────────────── */}
      {tab === 'buses' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowBusForm(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium">
              <Plus size={15} /> Add Bus
            </button>
          </div>

          {showBusForm && (
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
              <h2 className="font-semibold text-gray-900">New Bus</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={busForm.plateNumber} onChange={e => setBusForm(f => ({ ...f, plateNumber: e.target.value }))}
                  placeholder="Plate number *" className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <input type="number" min={1} value={busForm.capacity} onChange={e => setBusForm(f => ({ ...f, capacity: Number(e.target.value) }))}
                  placeholder="Capacity" className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <select value={busForm.routeId} onChange={e => setBusForm(f => ({ ...f, routeId: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">No route</option>
                  {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <select value={busForm.driverId} onChange={e => setBusForm(f => ({ ...f, driverId: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">No driver</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={createBus} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium">Add</button>
                <button onClick={() => setShowBusForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium">Cancel</button>
              </div>
            </div>
          )}

          {loading ? <TransportLoader /> : buses.length === 0 ? <EmptyState icon={Bus} message="No buses yet." /> : buses.map(bus => {
            const isOpen = expanded[bus.id];
            return (
              <div key={bus.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => setExpanded(e => ({ ...e, [bus.id]: !isOpen }))}>
                    <div className={`p-2 rounded-xl ${bus.tripActive ? 'bg-green-100' : 'bg-blue-100'}`}>
                      <Bus size={18} className={bus.tripActive ? 'text-green-600' : 'text-blue-600'} />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        {bus.plateNumber}
                        {bus.tripActive && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Live</span>}
                      </div>
                      <div className="text-xs text-gray-500">{bus.route?.name ?? 'No route'} · {bus.driver?.name ?? 'No driver'} · {bus.assignments.length}/{bus.capacity}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleTrip(bus)} title={bus.tripActive ? 'End trip' : 'Start trip'}
                      className={`p-1.5 rounded-lg transition-colors ${bus.tripActive ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                      {bus.tripActive ? <Square size={15} /> : <Play size={15} />}
                    </button>
                    <button onClick={() => setDriverLinkBus(bus)} title="Driver link" className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg"><Link2 size={15} /></button>
                    <button onClick={() => deleteBus(bus.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                    {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-gray-100 p-4 space-y-4">
                    <div className="flex flex-wrap gap-3 text-sm">
                      <label className="flex items-center gap-2 text-gray-600">Route:
                        <select defaultValue={bus.route?.id ?? ''} onChange={e => updateBusField(bus.id, { routeId: e.target.value || null })}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                          <option value="">None</option>
                          {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </label>
                      <label className="flex items-center gap-2 text-gray-600">Driver:
                        <select defaultValue={bus.driver?.id ?? ''} onChange={e => updateBusField(bus.id, { driverId: e.target.value || null })}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                          <option value="">None</option>
                          {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </label>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Students ({bus.assignments.length}/{bus.capacity})</span>
                        <button onClick={() => { setAssignBusId(bus.id); setAssignClass(''); setSelectedStudent(''); setStudentSearch(''); }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">
                          <Plus size={13} /> Assign
                        </button>
                      </div>
                      {bus.assignments.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-3">No students assigned</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {bus.assignments.map(a => (
                            <div key={a.student.user.uniqueId} className="flex items-center justify-between bg-gray-50 rounded-lg px-2 py-1.5 text-xs gap-1">
                              <span className="text-gray-800 truncate">{a.student.user.firstName} {a.student.user.lastName}</span>
                              <button onClick={() => doUnassign(a.student.user.uniqueId)} className="text-red-400 hover:text-red-600 flex-shrink-0"><X size={11} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Routes ────────────────────────────────────────────────────────── */}
      {tab === 'routes' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowRouteForm(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium">
              <Plus size={15} /> Add Route
            </button>
          </div>

          {showRouteForm && (
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
              <h2 className="font-semibold text-gray-900">New Route</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input value={routeForm.name} onChange={e => setRouteForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Route name *" className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <input value={routeForm.description} onChange={e => setRouteForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Description" className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <input type="number" min={0} value={routeForm.fare} onChange={e => setRouteForm(f => ({ ...f, fare: Number(e.target.value) }))}
                  placeholder="Fare (₦)" className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <p className="text-xs text-gray-500">Click on the map below to draw the route (school → stops → home areas)</p>
              <RouteDrawMap onChange={setRoutePolyline} />
              <div className="flex gap-2">
                <button onClick={createRoute} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium">Create</button>
                <button onClick={() => setShowRouteForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium">Cancel</button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {loading ? <TransportLoader /> :
              routes.length === 0 ? <EmptyState icon={MapPin} message="No routes yet." /> :
              routes.map(r => (
                <div key={r.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{r.name}</div>
                      <div className="text-xs text-gray-500">{r.description ?? ''} · ₦{Number(r.fare).toLocaleString()} · {r.buses?.length ?? 0} buses · {r.polyline?.length ?? 0} waypoints</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditRouteId(r.id); setEditPolyline(r.polyline ?? []); }}
                        className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">Edit Route</button>
                      <button onClick={() => deleteRoute(r.id)} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={15} /></button>
                    </div>
                  </div>
                  {editRouteId === r.id && (
                    <div className="border-t border-gray-100 p-4 space-y-3">
                      <p className="text-xs text-gray-500">Click to add waypoints · Draw from school to student home areas</p>
                      <RouteDrawMap initialPolyline={r.polyline} onChange={setEditPolyline} />
                      <div className="flex gap-2">
                        <button onClick={() => saveRoutePolyline(r.id)} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium">Save Route</button>
                        <button onClick={() => setEditRouteId(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ── Drivers ───────────────────────────────────────────────────────── */}
      {tab === 'drivers' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowDriverForm(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium">
              <Plus size={15} /> Add Driver
            </button>
          </div>
          {showDriverForm && (
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
              <h2 className="font-semibold text-gray-900">New Driver</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={driverForm.name} onChange={e => setDriverForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name *"
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <input value={driverForm.phone} onChange={e => setDriverForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone"
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <input value={driverForm.licenseNo} onChange={e => setDriverForm(f => ({ ...f, licenseNo: e.target.value }))} placeholder="License number"
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <select value={driverForm.userId} onChange={e => setDriverForm(f => ({ ...f, userId: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">Link staff account (optional)</option>
                  {staffOptions.map(s => <option key={s.uniqueId} value={s.uniqueId}>{s.firstName} {s.lastName}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={createDriver} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium">Add</button>
                <button onClick={() => setShowDriverForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium">Cancel</button>
              </div>
            </div>
          )}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Name', 'Phone', 'License No.', 'Linked Account', 'Assigned Bus', ''].map(h => <th key={h} className="p-3 text-left font-medium text-gray-600">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? <tr><td colSpan={6}><TransportLoader /></td></tr>
                  : drivers.length === 0 ? <tr><td colSpan={6}><EmptyState icon={User} message="No drivers yet." card={false} /></td></tr>
                  : drivers.map(d => editDriverId === d.id ? (
                    <tr key={d.id} className="bg-purple-50">
                      <td className="p-2"><input value={editDriverForm.name} onChange={e => setEditDriverForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-purple-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400" /></td>
                      <td className="p-2"><input value={editDriverForm.phone} onChange={e => setEditDriverForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone" className="w-full border border-purple-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400" /></td>
                      <td className="p-2"><input value={editDriverForm.licenseNo} onChange={e => setEditDriverForm(f => ({ ...f, licenseNo: e.target.value }))} placeholder="License No." className="w-full border border-purple-200 rounded-lg px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-purple-400" /></td>
                      <td className="p-2"><select value={editDriverForm.userId} onChange={e => setEditDriverForm(f => ({ ...f, userId: e.target.value }))} className="w-full border border-purple-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400">
                        <option value="">Not linked</option>
                        {staffOptions.map(s => <option key={s.uniqueId} value={s.uniqueId}>{s.firstName} {s.lastName}</option>)}
                      </select></td>
                      <td className="p-3 text-gray-400 text-xs">{d.buses?.map(b => b.plateNumber).join(', ') || '—'}</td>
                      <td className="p-2 flex gap-1">
                        <button onClick={() => saveDriver(d.id)} className="p-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700"><Check size={13} /></button>
                        <button onClick={() => setEditDriverId(null)} className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"><X size={13} /></button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-900">{d.name}</td>
                      <td className="p-3 text-gray-500">{d.phone ?? '—'}</td>
                      <td className="p-3 text-gray-500 font-mono text-xs">{d.licenseNo ?? '—'}</td>
                      <td className="p-3 text-xs">{d.user ? <span className="text-green-700 font-medium">{d.user.firstName} {d.user.lastName}</span> : <span className="text-gray-400">Not linked</span>}</td>
                      <td className="p-3 text-gray-500 text-xs">{d.buses?.map(b => b.plateNumber).join(', ') || '—'}</td>
                      <td className="p-3 flex gap-1">
                        <button onClick={() => { setEditDriverId(d.id); setEditDriverForm({ name: d.name, phone: d.phone ?? '', licenseNo: d.licenseNo ?? '', userId: d.user?.uniqueId ?? '' }); }} className="text-gray-400 hover:text-purple-600 p-1"><Pencil size={14} /></button>
                        <button onClick={() => deleteDriver(d.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* ── GPS Tracking ──────────────────────────────────────────────────── */}
      {tab === 'gps' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Live Bus Locations</h2>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" /> Live via WebSocket
              </div>
            </div>
            <LiveGpsMap buses={liveBuses} watchBusIds={buses.map(b => b.id)} />
          </div>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Bus', 'Route', 'Driver', 'Status', 'Last GPS', 'Updated'].map(h => <th key={h} className="p-3 text-left font-medium text-gray-600">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {liveBuses.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-900">{b.plateNumber}</td>
                    <td className="p-3 text-gray-500">{b.route?.name ?? '—'}</td>
                    <td className="p-3 text-gray-500">{b.driver?.name ?? '—'}</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.tripActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{b.tripActive ? 'Active' : 'Idle'}</span></td>
                    <td className="p-3 text-gray-500 font-mono text-xs">{b.gpsLat ? `${Number(b.gpsLat).toFixed(4)}, ${Number(b.gpsLng).toFixed(4)}` : '—'}</td>
                    <td className="p-3 text-gray-400 text-xs">{b.gpsUpdatedAt ? new Date(b.gpsUpdatedAt).toLocaleTimeString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Assign Student Modal ───────────────────────────────────────────── */}
      {assignBusId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="font-semibold text-gray-900">Assign Student to Bus</h2>
            <select value={assignClass} onChange={e => { setAssignClass(e.target.value); setSelectedStudent(''); setStudentSearch(''); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">Select class…</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {assignClass && (
              <>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                    placeholder="Search student…" className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                  {studentsLoading ? <div className="p-3 text-sm text-gray-400 text-center">Loading…</div>
                    : studentOptions.length === 0 ? <div className="p-3 text-sm text-gray-400 text-center">No students</div>
                    : studentOptions.map(s => (
                      <button key={s.uniqueId} onClick={() => setSelectedStudent(s.uniqueId)}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${selectedStudent === s.uniqueId ? 'bg-purple-50 text-purple-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}>
                        {s.firstName} {s.lastName} <span className="text-gray-400 text-xs">{s.uniqueId}</span>
                      </button>
                    ))}
                </div>
              </>
            )}
            <div className="flex gap-2">
              <button onClick={doAssign} disabled={!selectedStudent}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium">Assign</button>
              <button onClick={() => setAssignBusId(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Driver Link Modal ──────────────────────────────────────────────── */}
      {driverLinkBus && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="font-semibold text-gray-900">Driver Link — {driverLinkBus.plateNumber}</h2>
            <p className="text-xs text-gray-500">Share this link with the driver. They open it on their phone to start/end the trip and stream GPS.</p>
            <div className="bg-gray-50 rounded-xl p-3 text-xs font-mono break-all text-gray-700 select-all">
              {driverLink(driverLinkBus.driverToken)}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { navigator.clipboard.writeText(driverLink(driverLinkBus.driverToken)); toast.success('Copied!'); }}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium">Copy Link</button>
              <button onClick={() => regenerateToken(driverLinkBus)}
                className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium">
                <RefreshCw size={13} /> Regenerate
              </button>
              <button onClick={() => setDriverLinkBus(null)} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
