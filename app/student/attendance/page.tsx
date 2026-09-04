'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin, Clock, LogIn, LogOut, AlertCircle, CheckCircle,
  Timer, CalendarDays, ChevronDown, ChevronUp,
  CheckCircle2, AlertOctagon, TrendingUp, QrCode,
  Download, FileDown, Navigation,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useStudentAttendance, useStudentAttendanceHistory } from '@/hooks/attendance';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSelectedSchool, normalizeSchoolLogo } from '@/hooks/useSelectedSchool';
import { auth } from '@/lib/auth';
import { api, endpoints, getImageUrl } from '@/lib/api';
import type { ApiResponse, AttendanceStatus } from '@/types';
import clsx from 'clsx';

const STATUS_CFG: Record<AttendanceStatus, {
  badge: string; dot: string; bg: string; color: string; label: string;
}> = {
  PRESENT: {
    badge: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
    dot:   'bg-emerald-500',
    bg:    'bg-emerald-50',
    color: 'text-emerald-600',
    label: 'Present',
  },
  LATE: {
    badge: 'bg-amber-100 text-amber-700 ring-amber-600/20',
    dot:   'bg-amber-500',
    bg:    'bg-amber-50',
    color: 'text-amber-600',
    label: 'Late',
  },
  ABSENT: {
    badge: 'bg-red-100 text-red-700 ring-red-600/20',
    dot:   'bg-red-500',
    bg:    'bg-red-50',
    color: 'text-red-600',
    label: 'Absent',
  },
};

function fmtLate(minutes: number) {
  if (!minutes) return '';
  if (minutes < 60) return ` +${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? ` +${h}h ${m}m` : ` +${h}h`;
}

function fmt(dt: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(dt: string) {
  return new Date(dt).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}

/* ─────────────────────────────────────────────
   Live Clock
───────────────────────────────────────────── */
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const hh = String(time.getHours()).padStart(2, '0');
  const mm = String(time.getMinutes()).padStart(2, '0');
  const ss = String(time.getSeconds()).padStart(2, '0');
  return (
    <div className="flex flex-col items-center py-5">
      <div className="flex items-end gap-1 tabular-nums text-white">
        <span className="text-7xl font-black tracking-tight drop-shadow-lg">{hh}</span>
        <span className="text-6xl font-black text-blue-200 mb-1 animate-pulse">:</span>
        <span className="text-7xl font-black tracking-tight drop-shadow-lg">{mm}</span>
        <span className="text-5xl font-semibold tracking-tight text-blue-200 mb-1">{ss}</span>
      </div>
      <p className="text-sm text-blue-100/90 mt-2 font-medium">
        {time.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Haversine distance (metres between two coords)
───────────────────────────────────────────── */
function haversineMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

/* ─────────────────────────────────────────────
   Proximity Map
   Shows school location + allowed radius circle,
   student's current position, and a dashed line
   between them with a distance label.
───────────────────────────────────────────── */
function ProximityMap({
  schoolLat, schoolLng, radiusMeters,
  studentLat, studentLng,
  primaryColor,
}: {
  schoolLat: number; schoolLng: number; radiusMeters: number;
  studentLat: number | null; studentLng: number | null;
  primaryColor: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const sourceReady  = useRef(false);

  // Initialise map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let map: any;

    import('maplibre-gl').then(({ Map: MLMap, AttributionControl }) => {
      import('maplibre-gl/dist/maplibre-gl.css');
      map = new MLMap({
        container: containerRef.current!,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [schoolLng, schoolLat],
        zoom: 15,
        attributionControl: false,
      });
      map.addControl(new AttributionControl({ compact: true }), 'bottom-right');
      mapRef.current = map;

      map.on('load', () => {
        // ── Radius fill circle (GeoJSON) ──
        map.addSource('radius', {
          type: 'geojson',
          data: makeCircleGeoJSON(schoolLat, schoolLng, radiusMeters),
        });
        map.addLayer({
          id: 'radius-fill',
          type: 'fill',
          source: 'radius',
          paint: { 'fill-color': primaryColor, 'fill-opacity': 0.12 },
        });
        map.addLayer({
          id: 'radius-outline',
          type: 'line',
          source: 'radius',
          paint: { 'line-color': primaryColor, 'line-width': 2, 'line-dasharray': [3, 2] },
        });

        // ── School marker (flag pin) ──
        const schoolEl = document.createElement('div');
        schoolEl.style.cssText = `
          width:32px; height:32px; border-radius:50% 50% 50% 0; transform:rotate(-45deg);
          background:${primaryColor}; border:3px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,.3); cursor:default;
        `;
        import('maplibre-gl').then(({ Marker }) => {
          new Marker({ element: schoolEl, anchor: 'bottom' })
            .setLngLat([schoolLng, schoolLat])
            .addTo(map);
        });

        // ── Line source (school → student) ──
        map.addSource('line', {
          type: 'geojson',
          data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [[schoolLng, schoolLat], [schoolLng, schoolLat]] }, properties: {} },
        });
        map.addLayer({
          id: 'proximity-line',
          type: 'line',
          source: 'line',
          paint: {
            'line-color': '#6366f1',
            'line-width': 2.5,
            'line-dasharray': [4, 3],
            'line-opacity': 0.85,
          },
        });

        // ── Student dot source ──
        map.addSource('student', {
          type: 'geojson',
          data: { type: 'Feature', geometry: { type: 'Point', coordinates: [schoolLng, schoolLat] }, properties: {} },
        });
        map.addLayer({
          id: 'student-dot-outer',
          type: 'circle',
          source: 'student',
          paint: { 'circle-radius': 10, 'circle-color': '#6366f1', 'circle-opacity': 0.25 },
        });
        map.addLayer({
          id: 'student-dot',
          type: 'circle',
          source: 'student',
          paint: { 'circle-radius': 6, 'circle-color': '#6366f1', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 },
        });

        sourceReady.current = true;
      });
    });

    return () => { map?.remove(); mapRef.current = null; sourceReady.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update student position and line when coords change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !sourceReady.current) return;
    if (studentLat === null || studentLng === null) return;

    const studentCoord: [number, number] = [studentLng!, studentLat!];
    const schoolCoord:  [number, number] = [schoolLng,    schoolLat];

    map.getSource('student')?.setData({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: studentCoord },
      properties: {},
    });
    map.getSource('line')?.setData({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [schoolCoord, studentCoord] },
      properties: {},
    });

    // Fit map to show both points
    const bounds = [
      [Math.min(schoolLng, studentLng!) - 0.002, Math.min(schoolLat, studentLat!) - 0.002],
      [Math.max(schoolLng, studentLng!) + 0.002, Math.max(schoolLat, studentLat!) + 0.002],
    ] as [[number, number], [number, number]];
    map.fitBounds(bounds, { padding: 48, maxZoom: 17, duration: 800 });
  }, [studentLat, studentLng, schoolLat, schoolLng]);

  const distance = studentLat !== null && studentLng !== null
    ? haversineMetres(schoolLat, schoolLng, studentLat, studentLng)
    : null;
  const withinRadius = distance !== null && distance <= radiusMeters;

  return (
    <div className="relative rounded-xl overflow-hidden border border-white/20" style={{ height: 200 }}>
      <div ref={containerRef} className="absolute inset-0" />

      {/* Distance badge overlay */}
      {distance !== null ? (
        <div className={clsx(
          'absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold shadow-lg backdrop-blur-sm border',
          withinRadius
            ? 'bg-emerald-500/90 text-white border-emerald-400/50'
            : 'bg-white/90 text-gray-800 border-gray-200/50'
        )}>
          <Navigation size={11} className={withinRadius ? 'text-white' : 'text-indigo-500'} />
          {withinRadius ? '✓ Within range — ' : ''}{fmtDistance(distance)} away
        </div>
      ) : (
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-black/40 text-white backdrop-blur-sm">
          <Navigation size={11} className="animate-pulse" /> Getting your location…
        </div>
      )}

      {/* Radius label */}
      <div className="absolute top-2 right-2 rounded-lg px-2.5 py-1 text-[10px] font-semibold bg-black/40 text-white backdrop-blur-sm">
        Allowed zone: {radiusMeters}m
      </div>
    </div>
  );
}

/** Generate a GeoJSON polygon approximating a circle */
function makeCircleGeoJSON(lat: number, lng: number, radiusM: number) {
  const points = 64;
  const coords: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dLat  = (radiusM / 111_320) * Math.cos(angle);
    const dLng  = (radiusM / (111_320 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
    coords.push([lng + dLng, lat + dLat]);
  }
  return {
    type: 'Feature' as const,
    geometry: { type: 'Polygon' as const, coordinates: [coords] },
    properties: {},
  };
}

/* ─────────────────────────────────────────────
   Hero Banner (Today card)
───────────────────────────────────────────── */
function TodayHero({
  record,
  location,
  loading,
  busy,
  geoLoading,
  geoError,
  onClockIn,
  onClockOut,
  school,
  studentCoords,
}: {
  record: any;
  location: any;
  loading: boolean;
  busy: boolean;
  geoLoading: boolean;
  geoError: string;
  onClockIn: () => void;
  onClockOut: () => void;
  school: any;
  studentCoords: { lat: number; lng: number } | null;
}) {
  const primary = school?.primaryColor || '#2563eb';
  const statusCfg = record?.status ? STATUS_CFG[record.status as AttendanceStatus] : null;

  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-lg"
      style={{
        background: `linear-gradient(135deg, ${primary} 0%, color-mix(in srgb, ${primary} 70%, black) 100%)`,
      }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute top-1/2 right-16 -translate-y-1/2 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-5">
        <div className="flex items-center gap-2 text-blue-100 text-sm font-semibold">
          <Clock size={16} />
          <span>Today</span>
        </div>
        <div className="flex items-center gap-2">
          {location && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              <MapPin size={11} /> {location.name}
            </span>
          )}
          {statusCfg && (
            <span className={clsx(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1',
              statusCfg.badge,
            )}>
              <span className={clsx('h-1.5 w-1.5 rounded-full', statusCfg.dot)} />
              {record.status}{fmtLate(record.lateMinutes)}
            </span>
          )}
        </div>
      </div>

      {/* Clock */}
      <div className="relative z-10 px-6">
        <LiveClock />
      </div>

      {/* Clock in / out boxes */}
      <div className="relative z-10 grid grid-cols-2 gap-3 px-6 pb-5">
        <div className="rounded-2xl bg-white/10 border border-white/10 p-4 text-center backdrop-blur">
          <p className="text-xs font-medium text-blue-200 flex items-center justify-center gap-1.5">
            <LogIn size={11} /> Clock In
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">{fmt(record?.clockIn ?? null)}</p>
        </div>
        <div className="rounded-2xl bg-white/10 border border-white/10 p-4 text-center backdrop-blur">
          <p className="text-xs font-medium text-blue-200 flex items-center justify-center gap-1.5">
            <LogOut size={11} /> Clock Out
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">{fmt(record?.clockOut ?? null)}</p>
        </div>
      </div>

      {/* Action area */}
      <div className="relative z-10 bg-white/5 border-t border-white/10 px-6 py-5 space-y-3">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full opacity-30" />
          </div>
        ) : (
          <>
            {/* Location info */}
            {location ? (
              <div className="flex items-start gap-2.5 rounded-xl bg-white/10 border border-white/10 p-3.5 text-sm text-white/80">
                <MapPin size={15} className="mt-0.5 shrink-0 text-blue-200" />
                <div>
                  <p className="font-medium text-white">{location.name}</p>
                  <p className="text-xs text-white/60 mt-0.5">
                    {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} · {location.radiusMeters}m radius
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-amber-500/20 border border-amber-400/20 p-3.5 text-sm text-amber-100">
                <AlertCircle size={15} className="shrink-0" />
                No attendance location set by admin yet.
              </div>
            )}

            {/* Proximity map — shown when a location is configured */}
            {location && (
              <ProximityMap
                schoolLat={location.latitude}
                schoolLng={location.longitude}
                radiusMeters={location.radiusMeters}
                studentLat={studentCoords?.lat ?? null}
                studentLng={studentCoords?.lng ?? null}
                primaryColor={primary}
              />
            )}

            {/* Geo error */}
            {geoError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/20 border border-red-400/20 p-3.5 text-sm text-red-100">
                <AlertCircle size={15} className="shrink-0" /> {geoError}
              </div>
            )}

            {/* CTA buttons */}
            {!record?.clockIn && (
              <button
                onClick={onClockIn}
                disabled={busy || !location}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white text-gray-900 py-3.5 font-bold text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? <Timer size={17} className="animate-spin" /> : <LogIn size={17} />}
                {geoLoading ? 'Getting location…' : 'Clock In'}
              </button>
            )}
            {record?.clockIn && !record?.clockOut && (
              <button
                onClick={onClockOut}
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white text-gray-900 py-3.5 font-bold text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? <Timer size={17} className="animate-spin" /> : <LogOut size={17} />}
                Clock Out
              </button>
            )}
            {record?.clockIn && record?.clockOut && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-400/20 py-3.5 font-semibold text-sm text-emerald-100">
                <CheckCircle size={17} /> Done for today
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Monthly Summary Card
───────────────────────────────────────────── */
function SummaryCard({ present, late, absent, total, month, year }: {
  present: number; late: number; absent: number; total: number; month: number; year: number;
}) {
  const rows = [
    { label: 'Present', value: present, bg: 'bg-emerald-50', color: 'text-emerald-600', bar: 'bg-emerald-500', icon: CheckCircle2 },
    { label: 'Late',    value: late,    bg: 'bg-amber-50',   color: 'text-amber-600',   bar: 'bg-amber-500',   icon: Clock },
    { label: 'Absent',  value: absent,  bg: 'bg-red-50',     color: 'text-red-600',     bar: 'bg-red-500',     icon: AlertOctagon },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <TrendingUp size={14} className="text-blue-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-800">Summary</h3>
          <p className="text-[10px] text-gray-400">
            {new Date(year, month - 1).toLocaleString('default', { month: 'long' })} {year}
          </p>
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        {rows.map(({ label, value, bg, color, bar, icon: Icon }) => (
          <div key={label} className="flex items-center gap-3">
            <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', bg)}>
              <Icon size={15} className={color} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600">{label}</span>
                <span className={clsx('text-xs font-bold', color)}>{value}</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={clsx('h-full rounded-full transition-all', bar)}
                  style={{ width: `${total ? Math.round((value / total) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        ))}
        {total > 0 && (
          <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-400">Attendance rate</span>
            <span className="text-xs font-bold text-gray-700">
              {Math.round(((present + late) / total) * 100)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   History Card
───────────────────────────────────────────── */
function HistoryCard({
  history,
  histLoading,
  month,
  year,
  onMonthChange,
  onYearChange,
}: {
  history: any[];
  histLoading: boolean;
  month: number;
  year: number;
  onMonthChange: (v: number) => void;
  onYearChange: (v: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const now = new Date();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-3">
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-2 hover:opacity-70 transition-opacity"
        >
          <h3 className="text-sm font-bold text-gray-800">History</h3>
          {history.length > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5 font-semibold">
              {history.length}
            </span>
          )}
          {expanded
            ? <ChevronUp size={14} className="text-gray-400" />
            : <ChevronDown size={14} className="text-gray-400" />}
        </button>

        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative">
            <select
              value={month}
              onChange={e => onMonthChange(Number(e.target.value))}
              className="appearance-none border border-gray-200 rounded-xl pl-3 pr-7 py-1.5 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString('default', { month: 'short' })}
                </option>
              ))}
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={year}
              onChange={e => onYearChange(Number(e.target.value))}
              className="appearance-none border border-gray-200 rounded-xl pl-3 pr-7 py-1.5 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm cursor-pointer"
            >
              {[now.getFullYear() - 1, now.getFullYear()].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {expanded && (
        histLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-1">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
              <CalendarDays className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-400">No records for this period</p>
            <p className="text-xs text-gray-300 mt-1">Try selecting a different month</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {history.map(r => {
              const cfg = STATUS_CFG[r.status as AttendanceStatus];
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/70 transition-colors"
                >
                  {/* Status bubble */}
                  <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', cfg.bg)}>
                    <span className={clsx('w-2 h-2 rounded-full', cfg.dot)} />
                  </div>

                  {/* Date + times */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{fmtDate(r.date)}</p>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <LogIn size={10} /> {fmt(r.clockIn)}
                      </span>
                      <span className="text-gray-200">·</span>
                      <span className="flex items-center gap-1">
                        <LogOut size={10} /> {fmt(r.clockOut)}
                      </span>
                    </p>
                  </div>

                  {/* Badge */}
                  <span className={clsx(
                    'rounded-full px-3 py-1 text-xs font-semibold ring-1 shrink-0',
                    cfg.badge,
                  )}>
                    {cfg.label}{fmtLate(r.lateMinutes)}
                  </span>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Student QR Card
───────────────────────────────────────────── */
function QRCard({ school }: { school: any }) {
  const baseUser = auth.getUser();
  const [profileImage, setProfileImage] = useState<string | null>(
    getImageUrl(baseUser?.image ?? null),
  );
  const [firstName, setFirstName] = useState<string>(
    baseUser?.firstname ?? (baseUser as any)?.firstName ?? '',
  );
  const [lastName, setLastName] = useState<string>(
    baseUser?.lastname ?? (baseUser as any)?.lastName ?? '',
  );
  const logo    = normalizeSchoolLogo(school?.logo);
  const primary = school?.primaryColor || '#2563eb';
  const cardRef = useRef<HTMLDivElement>(null);

  // Fetch fresh profile — normalises both firstName/firstname variants
  useEffect(() => {
    api.get<ApiResponse<any>>(endpoints.student.profile)
      .then(r => {
        const d = r.data;
        const img = getImageUrl(d?.image ?? null);
        if (img) setProfileImage(img);
        const fn = d?.firstName ?? d?.firstname;
        const ln = d?.lastName  ?? d?.lastname;
        if (fn) setFirstName(fn);
        if (ln) setLastName(ln);
      })
      .catch(() => {});
  }, []);

  if (!baseUser?.uniqueId) return null;

  const fullName   = `${firstName} ${lastName}`.trim() || 'Student';
  const initials   = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
  const schoolName = school?.name || 'Student Portal';

  /* ── helpers ── */

  /** Load an image URL as an HTMLImageElement, resolving CORS via a canvas round-trip if needed */
  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = () => resolve(img);
      img.onerror = () => {
        // Retry without crossOrigin (some servers reject the header)
        const img2 = new Image();
        img2.onload  = () => resolve(img2);
        img2.onerror = reject;
        img2.src = src;
      };
      img.src = src;
    });

  /** Get the raw QR SVG element that qrcode.react rendered */
  const getQRSvgEl = (): SVGSVGElement | null =>
    cardRef.current?.querySelector('svg') ?? null;

  /** Serialise the QR SVG to a data URL */
  const svgToDataUrl = (svgEl: SVGSVGElement): string => {
    const serialised = new XMLSerializer().serializeToString(svgEl);
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(serialised)));
  };

  /** Build the full card on an off-screen canvas and return it */
  const buildCanvas = async (): Promise<HTMLCanvasElement> => {
    const W = 480, H = 600;
    const R = 24; // corner radius
    const canvas = document.createElement('canvas');
    canvas.width  = W * 2;  // 2× for retina
    canvas.height = H * 2;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(2, 2);

    /* ── background card ── */
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(0, 0, W, H, R);
    ctx.fill();

    /* ── gradient header strip ── */
    const grad = ctx.createLinearGradient(0, 0, W, 80);
    grad.addColorStop(0, primary);
    grad.addColorStop(1, shadeColor(primary, -30));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(0, 0, W, 90, [R, R, 0, 0]);
    ctx.fill();

    /* ── school name in header ── */
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(schoolName.toUpperCase(), W / 2, 28);

    /* ── "ATTENDANCE ID" label ── */
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText('ATTENDANCE ID', W / 2, 46);

    /* ── student name in header ── */
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(fullName, W / 2, 72);

    /* ── profile photo ── */
    const avatarSize = 80;
    const avatarX    = W / 2 - avatarSize / 2;
    const avatarY    = 90 - avatarSize / 2; // straddles the header
    ctx.save();
    // white border ring
    ctx.beginPath();
    ctx.arc(W / 2, avatarY + avatarSize / 2, avatarSize / 2 + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    // clip circle for photo
    ctx.beginPath();
    ctx.arc(W / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    if (profileImage) {
      try {
        const img = await loadImage(profileImage);
        ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize);
      } catch {
        drawInitialsCircle(ctx, W / 2, avatarY + avatarSize / 2, avatarSize / 2, initials, primary);
      }
    } else {
      drawInitialsCircle(ctx, W / 2, avatarY + avatarSize / 2, avatarSize / 2, initials, primary);
    }
    ctx.restore();

    /* ── QR code ── */
    const qrSize = 220;
    const qrX    = W / 2 - qrSize / 2;
    const qrY    = avatarY + avatarSize + 28;
    // white QR background box
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(qrX - 16, qrY - 16, qrSize + 32, qrSize + 32, 16);
    ctx.fill();
    ctx.stroke();
    // draw QR svg
    const svgEl = getQRSvgEl();
    if (svgEl) {
      const qrDataUrl = svgToDataUrl(svgEl);
      try {
        const qrImg = await loadImage(qrDataUrl);
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      } catch { /* skip if SVG fails */ }
    }

    /* ── uniqueId badge ── */
    const badgeY = qrY + qrSize + 32 + 16;
    ctx.fillStyle = '#f1f5f9';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(W / 2 - 100, badgeY - 14, 200, 28, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(baseUser.uniqueId!, W / 2, badgeY + 5);

    /* ── footer ── */
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Scan this code to mark attendance', W / 2, H - 20);

    /* ── card border ── */
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(0.5, 0.5, W - 1, H - 1, R);
    ctx.stroke();

    return canvas;
  };

  const handleDownloadImage = async () => {
    try {
      const canvas = await buildCanvas();
      const link   = document.createElement('a');
      link.download = `attendance-qr-${baseUser.uniqueId}.png`;
      link.href     = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Download failed', e);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const canvas  = await buildCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      const win     = window.open('', '_blank');
      if (!win) return;
      win.document.write(`<!DOCTYPE html><html><head><title>Attendance QR – ${fullName}</title>
        <style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f1f5f9}
          img{width:480px;height:600px;border-radius:24px;box-shadow:0 8px 32px rgba(0,0,0,.15)}
          @media print{
            body{background:#fff;margin:0}
            img{width:90vmin;height:auto;box-shadow:none}
          }
        </style></head>
        <body><img src="${dataUrl}" /></body></html>`);
      win.document.close();
      win.onload = () => win.print();
    } catch (e) {
      console.error('PDF failed', e);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-4 py-4 border-b border-gray-50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
          <QrCode size={15} className="text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-800">My Attendance QR</h3>
          <p className="text-[10px] text-gray-400 truncate">Show this to staff or admin to clock you in</p>
        </div>
        {/* Avatar only on mobile to save space; full name shown on sm+ */}
        <div className="flex items-center gap-2 shrink-0">
          {profileImage ? (
            <img src={profileImage} alt="" className="w-7 h-7 rounded-full object-cover border border-gray-200" />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white"
              style={{ background: `linear-gradient(135deg, ${primary} 0%, color-mix(in srgb, ${primary} 70%, black) 100%)` }}
            >
              {initials}
            </div>
          )}
          <span className="hidden sm:block text-sm font-bold text-gray-800 truncate max-w-[120px]">{fullName}</span>
        </div>
      </div>

      {/* Body — stacks vertically on mobile, side-by-side on sm+ */}
      <div ref={cardRef} className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-4 sm:p-6">

        {/* QR + photo — centred column */}
        <div className="flex flex-col items-center gap-3 w-full sm:w-auto shrink-0">
          {/* Profile photo */}
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-4 shadow-md"
            style={{ borderColor: primary }}
          >
            {profileImage ? (
              <img src={profileImage} alt={fullName} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-xl sm:text-2xl font-black text-white"
                style={{ background: `linear-gradient(135deg, ${primary} 0%, color-mix(in srgb, ${primary} 70%, black) 100%)` }}
              >
                {initials}
              </div>
            )}
          </div>

          {/* QR code */}
          <div className="p-3 rounded-2xl border-2 border-gray-100 bg-white shadow-inner">
            <QRCodeSVG
              value={baseUser.uniqueId}
              size={180}
              level="H"
              imageSettings={logo ? { src: logo, height: 28, width: 28, excavate: true } : undefined}
            />
          </div>
        </div>

        {/* Info — centred on mobile, left-aligned on sm+ */}
        <div className="flex flex-col gap-3 text-center sm:text-left w-full sm:w-auto">
          <div>
            <p className="text-lg sm:text-xl font-black text-gray-900 leading-tight">{fullName}</p>
            <p className="text-xs font-bold tracking-widest uppercase mt-1" style={{ color: primary }}>
              {schoolName}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 w-fit mx-auto sm:mx-0">
            <QrCode size={13} className="text-gray-400 shrink-0" />
            <span className="font-mono text-sm font-bold text-gray-700 tracking-wider">
              {baseUser.uniqueId}
            </span>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto sm:mx-0">
            Staff or admin will scan this code to mark you as present automatically.
          </p>

          {/* Download buttons — stack on very small screens */}
          <div className="flex flex-col xs:flex-row flex-wrap gap-2 items-center sm:items-start mt-1">
            <button
              onClick={handleDownloadImage}
              className="w-full xs:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 btn-brand text-white text-xs font-bold rounded-xl shadow hover:shadow-md transition-shadow"
            >
              <Download size={13} /> Save as Image
            </button>
            <button
              onClick={handleDownloadPDF}
              className="w-full xs:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
            >
              <FileDown size={13} /> Save as PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Darken/lighten a hex color by `amount` (negative = darker) */
function shadeColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r   = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g   = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b   = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/** Draw initials text centred in a filled circle on a canvas */
function drawInitialsCircle(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  text: string, color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font      = `bold ${r * 0.7}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy);
  ctx.textBaseline = 'alphabetic';
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export default function StudentAttendancePage() {
  const { record, location, loading, acting, clockIn, clockOut } = useStudentAttendance();
  const { school } = useSelectedSchool();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const { records: history, loading: histLoading, reload: reloadHistory } = useStudentAttendanceHistory(month, year);
  const [geoError, setGeoError]         = useState('');
  const [geoLoading, setGeoLoading]     = useState(false);
  const [studentCoords, setStudentCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Watch position continuously so the map updates live
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      pos => setStudentCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const handleClockIn = () => {
    setGeoError('');
    if (!navigator.geolocation) { setGeoError('Geolocation not supported by your browser'); return; }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        setStudentCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        clockIn(pos.coords.latitude, pos.coords.longitude).then(() => reloadHistory());
      },
      (err) => {
        setGeoLoading(false);
        setGeoError(err.message || 'Could not get your location. Please allow location access.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleClockOut = () => {
    clockOut().then(() => reloadHistory());
  };

  const busy    = acting || geoLoading;
  const present = history.filter(r => r.status === 'PRESENT').length;
  const late    = history.filter(r => r.status === 'LATE').length;
  const absent  = history.filter(r => r.status === 'ABSENT').length;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-0">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
        <p className="mt-0.5 text-sm text-gray-400">Clock in and track your daily attendance</p>
      </div>

      {/* Hero — Today */}
      <TodayHero
        record={record}
        location={location}
        loading={loading}
        busy={busy}
        geoLoading={geoLoading}
        geoError={geoError}
        onClockIn={handleClockIn}
        onClockOut={handleClockOut}
        school={school}
        studentCoords={studentCoords}
      />

      {/* Summary + History side-by-side on larger screens */}
      <QRCard school={school} />

      <div className="grid gap-5 lg:grid-cols-3">
        <SummaryCard
          present={present}
          late={late}
          absent={absent}
          total={history.length}
          month={month}
          year={year}
        />
        <div className="lg:col-span-2">
          <HistoryCard
            history={history}
            histLoading={histLoading}
            month={month}
            year={year}
            onMonthChange={setMonth}
            onYearChange={setYear}
          />
        </div>
      </div>
    </div>
  );
}
