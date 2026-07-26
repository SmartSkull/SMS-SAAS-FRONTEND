'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Trash2, Bus, MapPin, User, Search, ChevronDown, ChevronUp, X, Play, Square, RefreshCw, Pencil, Check } from 'lucide-react';import { api, endpoints } from '@/lib/api';
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
  assignments: { absentToday: boolean; pickedUp: boolean; pickedUpAt?: string | null; student: { parentLat?: number | null; parentLng?: number | null; user: { uniqueId: string; firstName: string; lastName: string } } }[];
}

type Tab = 'buses' | 'routes' | 'drivers' | 'gps' | 'analytics' | 'fare' | 'trips';

const BACKEND = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

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

function LiveGpsMap({ buses }: { buses: BusObj[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<{ map: any; L: any; markers: Map<string, any> } | null>(null);
  const busesRef = useRef(buses);
  busesRef.current = buses;

  // Init map once
  useEffect(() => {
    if (!mapRef.current || instanceRef.current) return;
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css'; link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (!document.getElementById('leaflet-z-fix')) {
      const style = document.createElement('style');
      style.id = 'leaflet-z-fix';
      style.textContent = '.leaflet-pane,.leaflet-top,.leaflet-bottom{z-index:1!important}.leaflet-control{z-index:2!important}';
      document.head.appendChild(style);
    }
    import('leaflet').then(L => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      const map = L.map(mapRef.current!).setView([9.082, 8.6753], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
      const markers = new Map<string, any>();
      instanceRef.current = { map, L, markers };
      // Draw any buses that already have GPS coords right now
      drawMarkers(L, map, markers, busesRef.current);
    });
    return () => { if (instanceRef.current) { instanceRef.current.map.remove(); instanceRef.current = null; } };
  }, []);

  // Update markers whenever buses (live coords) change
  useEffect(() => {
    if (!instanceRef.current) return;
    const { map, L, markers } = instanceRef.current;
    drawMarkers(L, map, markers, buses);
  }, [buses]);

  return <div ref={mapRef} className="w-full h-[420px] rounded-2xl overflow-hidden" />;
}

function drawMarkers(L: any, map: any, markers: Map<string, any>, buses: BusObj[]) {
  buses.forEach(b => {
    if (!b.gpsLat || !b.gpsLng) return;
    const key = String(b.id);
    const lat = Number(b.gpsLat); const lng = Number(b.gpsLng);
    const popup = `<b>${b.plateNumber}</b><br>${b.driver?.name ?? 'No driver'}`;
    if (markers.has(key)) {
      markers.get(key).setLatLng([lat, lng]);
    } else {
      const m = L.marker([lat, lng]).bindPopup(popup).addTo(map);
      markers.set(key, m);
    }
  });

  // Red student home markers
  const redIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
  });
  buses.forEach(b => {
    b.assignments.forEach(a => {
      const { parentLat, parentLng } = a.student;
      if (!parentLat || !parentLng) return;
      const key = `student-${a.student.user.uniqueId}`;
      const name = `${a.student.user.firstName} ${a.student.user.lastName}`;
      if (!markers.has(key)) {
        const m = L.marker([Number(parentLat), Number(parentLng)], { icon: redIcon })
          .bindPopup(`<b>${name}</b><br>Home`)
          .addTo(map);
        markers.set(key, m);
      }
    });
  });

  const located = buses.filter(b => b.gpsLat && b.gpsLng);
  if (located.length) map.fitBounds(located.map(b => [Number(b.gpsLat), Number(b.gpsLng)]) as any, { maxZoom: 14 });
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

  // analytics
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

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

  // bulk assign
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkAssigning, setBulkAssigning] = useState(false);

  // driver staff search
  const [driverStaffSearch, setDriverStaffSearch] = useState('');
  const [driverStaffOptions, setDriverStaffOptions] = useState<{ uniqueId: string; firstName: string; lastName: string }[]>([]);
  const [driverStaffLoading, setDriverStaffLoading] = useState(false);

  // fare payments
  const [fareData, setFareData] = useState<any[]>([]);
  const [fareLoading, setFareLoading] = useState(false);
  const [payModal, setPayModal] = useState<{ assignmentId: string; name: string; balance: number } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [busFeePayments, setBusFeePayments] = useState<any[]>([]);
  const [busFeePaymentsLoading, setBusFeePaymentsLoading] = useState(false);

  // trip logs
  const [tripLogs, setTripLogs] = useState<any[]>([]);
  const [tripLogsLoading, setTripLogsLoading] = useState(false);

  // ── Loaders ───────────────────────────────────────────────────────────────

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<any>(endpoints.admin.transportBuses).then(r => { setBuses(r.data ?? []); setLiveBuses(r.data ?? []); }),
      api.get<any>(endpoints.admin.transportRoutes).then(r => setRoutes(r.data ?? [])),
      api.get<any>(endpoints.admin.transportDrivers).then(r => setDrivers(r.data ?? [])),
    ]).catch(() => toast.error('Failed to load transport data')).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (tab !== 'analytics') return;
    setAnalyticsLoading(true);
    api.get<any>(endpoints.admin.transportAnalytics)
      .then(r => setAnalytics(r.data))
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setAnalyticsLoading(false));
  }, [tab]);

  useEffect(() => {
    if (tab !== 'fare') return;
    setFareLoading(true);
    api.get<any>(endpoints.admin.transportFarePayments)
      .then(r => setFareData(r.data ?? []))
      .catch(() => toast.error('Failed to load fare payments'))
      .finally(() => setFareLoading(false));
    setBusFeePaymentsLoading(true);
    api.get<any>(endpoints.admin.transportBusFeePayments)
      .then(r => setBusFeePayments(r.data ?? []))
      .catch(() => {})
      .finally(() => setBusFeePaymentsLoading(false));
  }, [tab]);

  useEffect(() => {
    if (tab !== 'trips') return;
    setTripLogsLoading(true);
    api.get<any>(endpoints.admin.transportTripLogs)
      .then(r => setTripLogs(r.data ?? []))
      .catch(() => toast.error('Failed to load trip logs'))
      .finally(() => setTripLogsLoading(false));
  }, [tab]);

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
    socket.on('student:pickedup', (data: { busId: string; studentUniqueId: string; pickedUp: boolean; pickedUpAt: string }) => {
      setLiveBuses(prev => prev.map(b => String(b.id) !== data.busId ? b : {
        ...b,
        assignments: b.assignments.map(a =>
          a.student.user.uniqueId === data.studentUniqueId
            ? { ...a, pickedUp: data.pickedUp, pickedUpAt: data.pickedUpAt }
            : a
        ),
      }));
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

  // Driver staff search
  useEffect(() => {
    if (!driverStaffSearch.trim()) { setDriverStaffOptions([]); return; }
    setDriverStaffLoading(true);
    api.get<any>(endpoints.admin.staff, { search: driverStaffSearch, per_page: 20 })
      .then(r => setDriverStaffOptions((r.data ?? []).map((s: any) => ({ uniqueId: s.unique_id, firstName: s.firstname, lastName: s.lastname }))))
      .catch(() => {}).finally(() => setDriverStaffLoading(false));
  }, [driverStaffSearch]);

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

  const doBulkAssign = async () => {
    if (!assignBusId || bulkSelected.size === 0) return;
    setBulkAssigning(true);
    try {
      const r = await api.post<any>(endpoints.admin.transportBulkAssign(String(assignBusId)), { studentIds: [...bulkSelected] });
      toast.success(r.message ?? 'Assigned');
      setAssignBusId(null); setBulkSelected(new Set()); setAssignClass(''); setStudentSearch('');
      loadAll();
    } catch (e: any) { toast.error(e?.message ?? 'Failed'); }
    finally { setBulkAssigning(false); }
  };

  const recordPayment = async () => {
    if (!payModal || !payAmount) return;
    try {
      await api.post(endpoints.admin.transportFarePayments, { assignmentId: payModal.assignmentId, amount: Number(payAmount), note: payNote || undefined });
      toast.success('Payment recorded');
      setPayModal(null); setPayAmount(''); setPayNote('');
      // Refresh fare data
      api.get<any>(endpoints.admin.transportFarePayments).then(r => setFareData(r.data ?? []));
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Transport</h1>

      <div className="flex gap-2 flex-wrap">
        {([['buses', 'Buses'], ['routes', 'Routes'], ['drivers', 'Drivers'], ['gps', 'GPS Tracking'], ['fare', 'Fare Payments'], ['trips', 'Trip Logs'], ['analytics', 'Analytics']] as const).map(([key, label]) => (
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
                        <button onClick={() => { setAssignBusId(bus.id); setAssignClass(''); setSelectedStudent(''); setStudentSearch(''); setBulkSelected(new Set()); }}
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
                <div className="relative">
                  <input value={driverStaffSearch} onChange={e => { setDriverStaffSearch(e.target.value); setDriverForm(f => ({ ...f, userId: '' })); }}
                    placeholder="Search staff account to link…"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  {driverForm.userId && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-600">✓ linked</span>}
                  {driverStaffOptions.length > 0 && !driverForm.userId && (
                    <div className="absolute z-10 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg divide-y divide-gray-100 max-h-40 overflow-y-auto">
                      {driverStaffOptions.map(s => (
                        <button key={s.uniqueId} type="button" onClick={() => { setDriverForm(f => ({ ...f, userId: s.uniqueId })); setDriverStaffSearch(`${s.firstName} ${s.lastName}`); setDriverStaffOptions([]); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 text-gray-700">
                          {s.firstName} {s.lastName} <span className="text-gray-400 text-xs">{s.uniqueId}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
                      <td className="p-2 relative">
                        <input value={driverStaffSearch} onChange={e => { setDriverStaffSearch(e.target.value); setEditDriverForm(f => ({ ...f, userId: '' })); }}
                          placeholder="Search staff…" className="w-full border border-purple-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400" />
                        {editDriverForm.userId && <span className="text-[10px] text-green-600 block">✓ linked</span>}
                        {driverStaffOptions.length > 0 && !editDriverForm.userId && (
                          <div className="absolute z-10 top-full mt-1 left-0 w-48 bg-white border border-gray-200 rounded-xl shadow-lg divide-y divide-gray-100 max-h-36 overflow-y-auto">
                            {driverStaffOptions.map(s => (
                              <button key={s.uniqueId} type="button" onClick={() => { setEditDriverForm(f => ({ ...f, userId: s.uniqueId })); setDriverStaffSearch(`${s.firstName} ${s.lastName}`); setDriverStaffOptions([]); }}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-purple-50 text-gray-700">
                                {s.firstName} {s.lastName}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
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
                        <button onClick={() => { setEditDriverId(d.id); setEditDriverForm({ name: d.name, phone: d.phone ?? '', licenseNo: d.licenseNo ?? '', userId: d.user?.uniqueId ?? '' }); setDriverStaffSearch(d.user ? `${d.user.firstName} ${d.user.lastName}` : ''); setDriverStaffOptions([]); }} className="text-gray-400 hover:text-purple-600 p-1"><Pencil size={14} /></button>
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
            <LiveGpsMap buses={liveBuses} />
          </div>

          {liveBuses.map(b => {
            const picked = b.assignments.filter(a => a.pickedUp);
            const pending = b.assignments.filter(a => !a.pickedUp && !a.absentToday);
            const absent  = b.assignments.filter(a => a.absentToday);
            return (
              <div key={b.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Bus header */}
                <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${b.tripActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Bus size={18} className={b.tripActive ? 'text-green-600' : 'text-gray-400'} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                      {b.plateNumber}
                      {b.tripActive && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Live</span>}
                    </div>
                    <div className="text-xs text-gray-500">
                      {b.route?.name ?? 'No route'} · Driver: {b.driver?.name ?? '—'}
                      {b.gpsLat ? ` · ${Number(b.gpsLat).toFixed(4)}, ${Number(b.gpsLng).toFixed(4)}` : ' · No GPS'}
                      {b.gpsUpdatedAt ? ` · ${new Date(b.gpsUpdatedAt).toLocaleTimeString()}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-medium">
                    <span className="text-green-700 bg-green-50 px-2 py-1 rounded-lg">{picked.length} picked up</span>
                    <span className="text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">{pending.length} pending</span>
                    {absent.length > 0 && <span className="text-red-600 bg-red-50 px-2 py-1 rounded-lg">{absent.length} absent</span>}
                  </div>
                </div>

                {/* Student columns */}
                <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                  {/* Picked up */}
                  <div className="p-4">
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">
                      ✅ Picked Up ({picked.length})
                    </p>
                    {picked.length === 0 ? (
                      <p className="text-xs text-gray-400">None yet</p>
                    ) : (
                      <div className="space-y-1">
                        {picked.map(a => (
                          <div key={a.student.user.uniqueId} className="flex items-center gap-2 text-xs text-gray-800">
                            <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                            {a.student.user.firstName} {a.student.user.lastName}
                            {a.pickedUpAt && <span className="text-gray-400 ml-auto">{new Date(a.pickedUpAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Yet to pick up + absent */}
                  <div className="p-4">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
                      ⏳ Yet to Pick Up ({pending.length + absent.length})
                    </p>
                    {pending.length === 0 && absent.length === 0 ? (
                      <p className="text-xs text-gray-400">All done</p>
                    ) : (
                      <div className="space-y-1">
                        {pending.map(a => (
                          <div key={a.student.user.uniqueId} className="flex items-center gap-2 text-xs text-gray-800">
                            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                            {a.student.user.firstName} {a.student.user.lastName}
                          </div>
                        ))}
                        {absent.map(a => (
                          <div key={a.student.user.uniqueId} className="flex items-center gap-2 text-xs text-red-500">
                            <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                            {a.student.user.firstName} {a.student.user.lastName}
                            <span className="text-[10px] text-red-400">(absent)</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Analytics ─────────────────────────────────────────────────────── */}
      {tab === 'analytics' && (
        <div className="space-y-4">
          {analyticsLoading ? <TransportLoader /> : !analytics ? null : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Total Buses', value: analytics.totalBuses },
                  { label: 'Students Assigned', value: analytics.totalAssigned },
                  { label: 'Active Trips', value: analytics.activeTrips },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl shadow-sm p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">{s.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-4">
                <h2 className="font-semibold text-gray-900 mb-3">Bus Fill Rates</h2>
                <div className="space-y-3">
                  {analytics.fillRates.map((b: any) => (
                    <div key={b.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-800">{b.plateNumber} <span className="text-gray-400 font-normal">· {b.route} · {b.driver}</span></span>
                        <span className="text-gray-500">{b.assigned}/{b.capacity} ({b.fillRate}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${b.fillRate}%`, backgroundColor: b.fillRate >= 90 ? '#dc2626' : b.fillRate >= 70 ? '#f59e0b' : '#7c3aed' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {analytics.absentToday?.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-4">
                  <h2 className="font-semibold text-gray-900 mb-2">Absent Today (Top)</h2>
                  <ul className="space-y-1">
                    {analytics.absentToday.map((a: any, i: number) => (
                      <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs flex items-center justify-center font-medium">{i + 1}</span>
                        {a.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Fare Payments ─────────────────────────────────────────────────── */}
      {tab === 'fare' && (
        <div className="space-y-4">
          {/* Paystack Bus Fee Payments */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Paystack Bus Fee Payments</h2>
              <span className="text-xs text-gray-400">{busFeePayments.filter((p: any) => p.status === 'SUCCESS').length} paid</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Student', 'Bus / Route', 'Amount', 'Status', 'Date'].map(h => <th key={h} className="p-3 text-left font-medium text-gray-600">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {busFeePaymentsLoading ? <tr><td colSpan={5}><TransportLoader /></td></tr>
                    : busFeePayments.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-gray-400 text-sm">No Paystack bus fee payments yet</td></tr>
                    : busFeePayments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="p-3 font-medium text-gray-900">{p.student.name}</td>
                        <td className="p-3 text-gray-500 text-xs">{p.bus}{p.route ? ` · ${p.route}` : ''}</td>
                        <td className="p-3 text-gray-700">₦{Number(p.amount).toLocaleString()}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : p.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-400 text-xs">{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Manual Fare Payments */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Manual Fare Payments</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Student', 'Bus / Route', 'Fare', 'Paid', 'Balance', ''].map(h => <th key={h} className="p-3 text-left font-medium text-gray-600">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {fareLoading ? <tr><td colSpan={6}><TransportLoader /></td></tr>
                    : fareData.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-gray-400 text-sm">No assignments found</td></tr>
                    : fareData.map((row: any) => (
                      <tr key={row.assignmentId} className="hover:bg-gray-50">
                        <td className="p-3 font-medium text-gray-900">{row.student.name}</td>
                        <td className="p-3 text-gray-500 text-xs">{row.bus}{row.route ? ` · ${row.route}` : ''}</td>
                        <td className="p-3 text-gray-700">₦{row.fare.toLocaleString()}</td>
                        <td className="p-3 text-green-700">₦{row.paid.toLocaleString()}</td>
                        <td className="p-3">
                          <span className={`font-semibold ${row.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {row.balance > 0 ? `₦${row.balance.toLocaleString()}` : '✓ Paid'}
                          </span>
                        </td>
                        <td className="p-3">
                          {row.balance > 0 && (
                            <button onClick={() => { setPayModal({ assignmentId: row.assignmentId, name: row.student.name, balance: row.balance }); setPayAmount(''); setPayNote(''); }}
                              className="px-3 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium">
                              Record Payment
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Trip Logs ──────────────────────────────────────────────────────── */}
      {tab === 'trips' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Date', 'Bus', 'Route', 'Driver', 'Onboard', 'Picked Up', 'Absent'].map(h => <th key={h} className="p-3 text-left font-medium text-gray-600">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tripLogsLoading ? <tr><td colSpan={7}><TransportLoader /></td></tr>
                    : tripLogs.length === 0 ? <tr><td colSpan={7} className="p-6 text-center text-gray-400 text-sm">No trip logs yet. Logs are saved automatically when a trip ends.</td></tr>
                    : tripLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="p-3 text-gray-700">{new Date(log.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td className="p-3 font-medium text-gray-900">{log.plateNumber}</td>
                        <td className="p-3 text-gray-500">{log.route ?? '—'}</td>
                        <td className="p-3 text-gray-500">{log.driver ?? '—'}</td>
                        <td className="p-3 text-gray-700">{log.studentsOnboard}</td>
                        <td className="p-3 text-green-700">{log.studentsPickedUp}</td>
                        <td className="p-3 text-red-600">{log.studentsAbsent}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign Student Modal (bulk) ────────────────────────────────────── */}
      {assignBusId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Assign Students to Bus</h2>
              <button onClick={() => setAssignBusId(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <select value={assignClass} onChange={e => { setAssignClass(e.target.value); setBulkSelected(new Set()); setStudentSearch(''); }}
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
                {bulkSelected.size > 0 && <p className="text-xs text-purple-600 font-medium">{bulkSelected.size} selected</p>}
                <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                  {studentsLoading ? <div className="p-3 text-sm text-gray-400 text-center">Loading…</div>
                    : studentOptions.length === 0 ? <div className="p-3 text-sm text-gray-400 text-center">No students</div>
                    : studentOptions.map(s => (
                      <label key={s.uniqueId} className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer ${bulkSelected.has(s.uniqueId) ? 'bg-purple-50' : 'hover:bg-gray-50'}`}>
                        <input type="checkbox" checked={bulkSelected.has(s.uniqueId)}
                          onChange={e => setBulkSelected(prev => { const n = new Set(prev); e.target.checked ? n.add(s.uniqueId) : n.delete(s.uniqueId); return n; })}
                          className="rounded accent-purple-600" />
                        <span className={bulkSelected.has(s.uniqueId) ? 'text-purple-700 font-medium' : 'text-gray-700'}>
                          {s.firstName} {s.lastName} <span className="text-gray-400 text-xs">{s.uniqueId}</span>
                        </span>
                      </label>
                    ))}
                </div>
              </>
            )}
            <div className="flex gap-2">
              <button onClick={doBulkAssign} disabled={bulkSelected.size === 0 || bulkAssigning}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium">
                {bulkAssigning ? 'Assigning…' : `Assign${bulkSelected.size > 0 ? ` (${bulkSelected.size})` : ''}`}
              </button>
              <button onClick={() => setAssignBusId(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fare Payment Modal ─────────────────────────────────────────────── */}
      {payModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="font-semibold text-gray-900">Record Payment — {payModal.name}</h2>
            <p className="text-xs text-gray-500">Outstanding balance: <span className="font-semibold text-red-600">₦{payModal.balance.toLocaleString()}</span></p>
            <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="Amount paid (₦)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            <input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Note (optional)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            <div className="flex gap-2">
              <button onClick={recordPayment} disabled={!payAmount}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium">Save</button>
              <button onClick={() => setPayModal(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
