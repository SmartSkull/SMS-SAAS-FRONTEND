'use client';
import { useState, useEffect, useRef } from 'react';
import {
  MapPin, Clock, LogIn, LogOut, AlertCircle, CheckCircle, Timer,
  Users, Loader2, CalendarDays, ChevronRight, History,
  CheckCircle2, AlertOctagon, TrendingUp, ChevronDown, ChevronUp,
  ScanLine, Navigation,
} from 'lucide-react';
import { useStaffAttendance, useStaffAttendanceHistory } from '@/hooks/attendance';
import { useSelectedSchool } from '@/hooks/useSelectedSchool';
import { Skeleton } from '@/components/ui/Skeleton';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import BarcodeScanner from '@/components/ui/BarcodeScanner';
import type { AttendanceStatus } from '@/types';
import clsx from 'clsx';
import { OSM_RASTER_STYLE } from '@/lib/mapStyle';
import 'maplibre-gl/dist/maplibre-gl.css';

const STATUS_CFG: Record<AttendanceStatus, {
  badge: string; dot: string; bg: string; color: string; label: string;
}> = {
  PRESENT: { badge: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500', bg: 'bg-emerald-50', color: 'text-emerald-600', label: 'Present' },
  LATE:    { badge: 'bg-amber-100 text-amber-700 ring-amber-600/20',       dot: 'bg-amber-500',   bg: 'bg-amber-50',   color: 'text-amber-600',   label: 'Late'    },
  ABSENT:  { badge: 'bg-red-100 text-red-700 ring-red-600/20',             dot: 'bg-red-500',     bg: 'bg-red-50',     color: 'text-red-600',     label: 'Absent'  },
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
   Haversine distance helpers
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
───────────────────────────────────────────── */
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

function ProximityMap({
  schoolLat, schoolLng, radiusMeters, userLat, userLng, primaryColor,
}: {
  schoolLat: number; schoolLng: number; radiusMeters: number;
  userLat: number | null; userLng: number | null;
  primaryColor: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const readyRef     = useRef(false);
  const pendingRef   = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    import('maplibre-gl').then(({ Map: MLMap, AttributionControl, Marker }) => {
      if (cancelled || !containerRef.current) return;
      const map = new MLMap({
        container: containerRef.current,
        style: OSM_RASTER_STYLE,
        center: [Number(schoolLng), Number(schoolLat)],
        zoom: 15,
        attributionControl: false,
      });
      map.addControl(new AttributionControl({ compact: true }), 'bottom-right');
      mapRef.current = map;

      map.on('load', () => {
        if (cancelled) return;

        map.addSource('radius', {
          type: 'geojson',
          data: makeCircleGeoJSON(Number(schoolLat), Number(schoolLng), Number(radiusMeters)),
        });
        map.addLayer({ id: 'radius-fill', type: 'fill', source: 'radius',
          paint: { 'fill-color': primaryColor, 'fill-opacity': 0.15 } });
        map.addLayer({ id: 'radius-line', type: 'line', source: 'radius',
          paint: { 'line-color': primaryColor, 'line-width': 2, 'line-dasharray': [3, 2] } });

        const pin = document.createElement('div');
        pin.style.cssText = [
          'width:26px', 'height:26px', 'background:' + primaryColor,
          'border:3px solid #fff', 'border-radius:50% 50% 50% 0',
          'transform:rotate(-45deg)', 'box-shadow:0 2px 6px rgba(0,0,0,.4)',
        ].join(';');
        new Marker({ element: pin, anchor: 'bottom' })
          .setLngLat([Number(schoolLng), Number(schoolLat)]).addTo(map);

        map.addSource('line', {
          type: 'geojson',
          data: { type: 'Feature', geometry: { type: 'LineString',
            coordinates: [[Number(schoolLng), Number(schoolLat)], [Number(schoolLng), Number(schoolLat)]] },
            properties: {} },
        });
        map.addLayer({ id: 'prox-line', type: 'line', source: 'line',
          paint: { 'line-color': '#6366f1', 'line-width': 2.5, 'line-dasharray': [4, 3], 'line-opacity': 0.9 } });

        map.addSource('user', {
          type: 'geojson',
          data: { type: 'Feature', geometry: { type: 'Point',
            coordinates: [Number(schoolLng), Number(schoolLat)] }, properties: {} },
        });
        map.addLayer({ id: 'user-halo', type: 'circle', source: 'user',
          paint: { 'circle-radius': 12, 'circle-color': '#6366f1', 'circle-opacity': 0.2 } });
        map.addLayer({ id: 'user-dot', type: 'circle', source: 'user',
          paint: { 'circle-radius': 7, 'circle-color': '#6366f1',
            'circle-stroke-color': '#fff', 'circle-stroke-width': 2.5 } });

        readyRef.current = true;
        if (pendingRef.current) {
          applyCoords(map, pendingRef.current.lat, pendingRef.current.lng);
          pendingRef.current = null;
        }
      });
    });

    return () => {
      cancelled = true; readyRef.current = false;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyCoords(map: any, sLat: number, sLng: number) {
    const sCoord: [number, number] = [Number(sLng), Number(sLat)];
    const hCoord: [number, number] = [Number(schoolLng), Number(schoolLat)];
    map.getSource('user')?.setData({ type: 'Feature',
      geometry: { type: 'Point', coordinates: sCoord }, properties: {} });
    map.getSource('line')?.setData({ type: 'Feature',
      geometry: { type: 'LineString', coordinates: [hCoord, sCoord] }, properties: {} });
    const pad = 0.003;
    map.fitBounds([
      [Math.min(Number(schoolLng), sLng) - pad, Math.min(Number(schoolLat), sLat) - pad],
      [Math.max(Number(schoolLng), sLng) + pad, Math.max(Number(schoolLat), sLat) + pad],
    ], { padding: 40, maxZoom: 17, duration: 700 });
  }

  useEffect(() => {
    if (userLat === null || userLng === null) return;
    if (!readyRef.current || !mapRef.current) {
      pendingRef.current = { lat: userLat, lng: userLng }; return;
    }
    applyCoords(mapRef.current, userLat, userLng);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLat, userLng]);

  const distance = userLat !== null && userLng !== null
    ? haversineMetres(schoolLat, schoolLng, userLat, userLng) : null;
  const withinRadius = distance !== null && distance <= radiusMeters;

  return (
    <div className="relative rounded-xl overflow-hidden border border-white/20" style={{ height: 200 }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {distance !== null ? (
        <div className={clsx(
          'absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold shadow-lg backdrop-blur-sm border',
          withinRadius ? 'bg-emerald-500/90 text-white border-emerald-400/40' : 'bg-white/90 text-gray-800 border-gray-200/50',
        )}>
          <Navigation size={11} className={withinRadius ? 'text-white' : 'text-indigo-500'} />
          {withinRadius ? '✓ Within range · ' : ''}{fmtDistance(distance)} away
        </div>
      ) : (
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-black/50 text-white backdrop-blur-sm">
          <Navigation size={11} className="animate-pulse" /> Getting your location…
        </div>
      )}
      <div className="absolute top-2 right-2 rounded-lg px-2.5 py-1 text-[10px] font-semibold bg-black/50 text-white backdrop-blur-sm">
        Allowed zone: {radiusMeters}m
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Today Hero Banner
───────────────────────────────────────────── */
function TodayHero({
  record, location, loading, busy, geoLoading, geoError,
  onClockIn, onClockOut, school, staffCoords,
}: {
  record: any; location: any; loading: boolean; busy: boolean;
  geoLoading: boolean; geoError: string;
  onClockIn: () => void; onClockOut: () => void; school: any;
  staffCoords: { lat: number; lng: number } | null;
}) {
  const primary = school?.primaryColor || '#2563eb';
  const statusCfg = record?.status ? STATUS_CFG[record.status as AttendanceStatus] : null;

  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-lg"
      style={{ background: `linear-gradient(135deg, ${primary} 0%, color-mix(in srgb, ${primary} 70%, black) 100%)` }}
    >
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute top-1/2 right-16 -translate-y-1/2 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-5">
        <div className="flex items-center gap-2 text-blue-100 text-sm font-semibold">
          <Clock size={16} /> <span>Today</span>
        </div>
        <div className="flex items-center gap-2">
          {location && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              <MapPin size={11} /> {location.name}
            </span>
          )}
          {statusCfg && (
            <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1', statusCfg.badge)}>
              <span className={clsx('h-1.5 w-1.5 rounded-full', statusCfg.dot)} />
              {record.status}{fmtLate(record.lateMinutes)}
            </span>
          )}
        </div>
      </div>

      {/* Live clock */}
      <div className="relative z-10 px-6">
        <LiveClock />
      </div>

      {/* In / Out tiles */}
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
          <Skeleton className="h-12 w-full opacity-30" />
        ) : (
          <>
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

            {/* Proximity map */}
            {location && (
              <ProximityMap
                schoolLat={location.latitude}
                schoolLng={location.longitude}
                radiusMeters={location.radiusMeters}
                userLat={staffCoords?.lat ?? null}
                userLng={staffCoords?.lng ?? null}
                primaryColor={primary}
              />
            )}

            {geoError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/20 border border-red-400/20 p-3.5 text-sm text-red-100">
                <AlertCircle size={15} className="shrink-0" /> {geoError}
              </div>
            )}

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
    { label: 'Present', value: present, bg: 'bg-emerald-50', color: 'text-emerald-600', bar: 'bg-emerald-500', icon: CheckCircle2  },
    { label: 'Late',    value: late,    bg: 'bg-amber-50',   color: 'text-amber-600',   bar: 'bg-amber-500',   icon: Clock         },
    { label: 'Absent',  value: absent,  bg: 'bg-red-50',     color: 'text-red-600',     bar: 'bg-red-500',     icon: AlertOctagon  },
  ];
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <TrendingUp size={14} className="text-blue-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-800">My Summary</h3>
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
                <div className={clsx('h-full rounded-full transition-all', bar)}
                  style={{ width: `${total ? Math.round((value / total) * 100) : 0}%` }} />
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
   Personal History Card
───────────────────────────────────────────── */
function PersonalHistoryCard({ history, histLoading, month, year, onMonthChange, onYearChange }: {
  history: any[]; histLoading: boolean; month: number; year: number;
  onMonthChange: (v: number) => void; onYearChange: (v: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const now = new Date();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-3">
        <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
          <h3 className="text-sm font-bold text-gray-800">My History</h3>
          {history.length > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5 font-semibold">{history.length}</span>
          )}
          {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </button>
        <div className="flex gap-2">
          <div className="relative">
            <select value={month} onChange={e => onMonthChange(Number(e.target.value))}
              className="appearance-none border border-gray-200 rounded-xl pl-3 pr-7 py-1.5 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm cursor-pointer">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'short' })}</option>
              ))}
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={year} onChange={e => onYearChange(Number(e.target.value))}
              className="appearance-none border border-gray-200 rounded-xl pl-3 pr-7 py-1.5 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm cursor-pointer">
              {[now.getFullYear() - 1, now.getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
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
                <div className="space-y-1.5"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-40" /></div>
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
                <div key={r.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/70 transition-colors">
                  <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', cfg.bg)}>
                    <span className={clsx('w-2 h-2 rounded-full', cfg.dot)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{fmtDate(r.date)}</p>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                      <span className="flex items-center gap-1"><LogIn size={10} /> {fmt(r.clockIn)}</span>
                      <span className="text-gray-200">·</span>
                      <span className="flex items-center gap-1"><LogOut size={10} /> {fmt(r.clockOut)}</span>
                    </p>
                  </div>
                  <span className={clsx('rounded-full px-3 py-1 text-xs font-semibold ring-1 shrink-0', cfg.badge)}>
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
   Student Attendance Card
───────────────────────────────────────────── */
function StudentAttendanceCard({ school }: { school: any }) {
  const toast = useToast();
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const [students, setStudents]         = useState<any[]>([]);
  const [statuses, setStatuses]         = useState<Record<string, 'PRESENT' | 'ABSENT'>>({});
  const [loadingStudents, setLoading]   = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [historyDates, setHistoryDates] = useState<{ date: string; present: number; absent: number; late: number; total: number }[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);
  const [showHistory, setShowHistory]   = useState(false);
  const [studentMonth, setStudentMonth] = useState(now.getMonth() + 1);
  const [studentYear, setStudentYear]   = useState(now.getFullYear());
  const [histExpanded, setHistExpanded] = useState(true);

  const isEditingPast = selectedDate !== todayStr;

  // ── QR Scan ──
  const [showScanner, setShowScanner] = useState(false);
  const [scanning, setScanning]       = useState(false);
  const [lastScanned, setLastScanned] = useState<{ name: string; status: string } | null>(null);

  const handleScan = async (uniqueId: string) => {
    setShowScanner(false);
    setScanning(true);
    try {
      const r = await api.post<any>(endpoints.staff.attendanceScanClockIn, {
        uniqueId,
        date: selectedDate,
      });
      const name = r?.data?.studentName ?? r?.studentName ?? uniqueId;
      const status = r?.data?.status ?? r?.status ?? 'PRESENT';
      setLastScanned({ name, status });
      toast.success(`✓ ${name} marked ${status}`);
      loadStudents(selectedDate);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to clock in student');
    } finally {
      setScanning(false);
    }
  };

  const loadStudents = (date: string) => {
    setLoading(true);
    api.get<any>(endpoints.staff.attendanceStudents, { date })
      .then(r => {
        const list = r.data ?? r ?? [];
        setStudents(list);
        setStatuses(() => {
          const init: Record<string, 'PRESENT' | 'ABSENT'> = {};
          list.forEach((s: any) => { init[s.uniqueId] = s.status ?? 'PRESENT'; });
          return init;
        });
      })
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false));
  };

  const loadHistoryDates = (m: number, y: number) => {
    setLoadingDates(true);
    api.get<any>(endpoints.staff.attendanceStudentsDates, { month: m, year: y })
      .then(r => setHistoryDates(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingDates(false));
  };

  useEffect(() => { loadStudents(selectedDate); }, [selectedDate]);
  useEffect(() => { loadHistoryDates(studentMonth, studentYear); }, [studentMonth, studentYear]);

  const handleMarkAll = (status: 'PRESENT' | 'ABSENT') =>
    setStatuses(Object.fromEntries(students.map(s => [s.uniqueId, status])));

  const handleSubmit = async () => {
    if (!students.length) return;
    setSubmitting(true);
    try {
      await api.post(endpoints.staff.attendanceStudents, {
        date: selectedDate,
        students: students.map(s => ({ uniqueId: s.uniqueId, status: statuses[s.uniqueId] ?? 'PRESENT' })),
      });
      toast.success('Attendance saved');
      loadStudents(selectedDate);
      loadHistoryDates(studentMonth, studentYear);
    } catch { toast.error('Failed to save attendance'); }
    finally { setSubmitting(false); }
  };

  const presentCount = Object.values(statuses).filter(s => s === 'PRESENT').length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <Users size={17} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-800">Student Attendance</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Your assigned class</p>
          </div>
        </div>
        {/* Mark / History toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Scan QR button */}
          <button
            onClick={() => { setLastScanned(null); setShowScanner(true); }}
            disabled={scanning}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-60 shadow"
          >
            <ScanLine size={14} />
            {scanning ? 'Clocking in…' : 'Scan QR'}
          </button>
          <div className="flex rounded-xl bg-gray-100 p-1">
            <button
              onClick={() => setShowHistory(false)}
              className={clsx(
                'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition',
                !showHistory ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <CheckCircle size={13} /> Mark
            </button>
            <button
              onClick={() => setShowHistory(true)}
              className={clsx(
                'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition',
                showHistory ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <History size={13} /> History
            </button>
          </div>
        </div>{/* end flex gap-2 wrapper */}
      </div>{/* end card header */}

      <div className="p-5">
        {/* ── History view ── */}
        {showHistory ? (
          <div className="space-y-4">
            {/* Month / Year filters */}
            <div className="flex gap-2">
              <div className="relative">
                <select value={studentMonth} onChange={e => setStudentMonth(Number(e.target.value))}
                  className="appearance-none border border-gray-200 rounded-xl pl-3 pr-7 py-1.5 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm cursor-pointer">
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'short' })}</option>
                  ))}
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select value={studentYear} onChange={e => setStudentYear(Number(e.target.value))}
                  className="appearance-none border border-gray-200 rounded-xl pl-3 pr-7 py-1.5 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm cursor-pointer">
                  {[now.getFullYear() - 1, now.getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {loadingDates ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : historyDates.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                  <CalendarDays className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-400">No records for this period</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-100 overflow-hidden">
                <div className="grid grid-cols-5 bg-gray-50 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  <span className="col-span-2">Date</span>
                  <span className="text-emerald-600">Present</span>
                  <span className="text-amber-600">Late</span>
                  <span className="text-red-500">Absent</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {historyDates.map(d => (
                    <button
                      key={d.date}
                      onClick={() => { setSelectedDate(d.date); setShowHistory(false); loadStudents(d.date); }}
                      className="grid w-full grid-cols-5 px-4 py-3 text-left transition hover:bg-blue-50/60"
                    >
                      <span className="col-span-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                        <CalendarDays size={13} className="text-gray-300 shrink-0" /> {fmtDate(d.date)}
                      </span>
                      <span className="text-sm font-bold text-emerald-600">{d.present}</span>
                      <span className="text-sm font-bold text-amber-600">{d.late}</span>
                      <span className="text-sm font-bold text-red-500">{d.absent}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Mark Attendance view ── */
          <div className="space-y-4">
            {/* Date + bulk controls */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-gray-500">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  max={todayStr}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
                />
                {isEditingPast && (
                  <span className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700">
                    Editing past record
                  </span>
                )}
              </div>
              {students.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMarkAll('PRESENT')}
                    className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    All Present
                  </button>
                  <button
                    onClick={() => handleMarkAll('ABSENT')}
                    className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                  >
                    All Absent
                  </button>
                </div>
              )}
            </div>

            {loadingStudents ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                  <Users className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-400">No students assigned to your class</p>
              </div>
            ) : (
              <>
                {/* Student list */}
                <div className="rounded-2xl border border-gray-100 overflow-hidden">
                  {/* Select-all header */}
                  <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Student</span>
                    <label className="flex cursor-pointer items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      <input
                        type="checkbox"
                        checked={students.every(s => statuses[s.uniqueId] === 'PRESENT')}
                        onChange={e => handleMarkAll(e.target.checked ? 'PRESENT' : 'ABSENT')}
                        className="h-4 w-4 accent-emerald-600"
                      />
                      All Present
                    </label>
                  </div>

                  <div className="divide-y divide-gray-50">
                    {students.map(s => {
                      const isPresent = statuses[s.uniqueId] === 'PRESENT';
                      return (
                        <label
                          key={s.uniqueId}
                          className="flex cursor-pointer items-center justify-between px-4 py-3 transition-colors hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <span className={clsx(
                              'flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold shrink-0',
                              isPresent ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500',
                            )}>
                              {(s.firstname?.[0] ?? '?')}{s.lastname?.[0] ?? ''}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{s.firstname} {s.lastname}</p>
                              <p className="font-mono text-xs text-gray-400">{s.uniqueId}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className={clsx('text-xs font-semibold', isPresent ? 'text-emerald-600' : 'text-red-500')}>
                              {isPresent ? 'Present' : 'Absent'}
                            </span>
                            <input
                              type="checkbox"
                              checked={isPresent}
                              onChange={e => setStatuses(p => ({ ...p, [s.uniqueId]: e.target.checked ? 'PRESENT' : 'ABSENT' }))}
                              className="h-5 w-5 accent-emerald-600"
                            />
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 btn-brand text-white rounded-xl py-3 text-sm font-bold disabled:opacity-60"
                >
                  {submitting && <Loader2 size={15} className="animate-spin" />}
                  {submitting ? 'Saving…' : `Save Attendance (${presentCount} / ${students.length} present)`}
                  {!submitting && <ChevronRight size={15} />}
                </button>
              </>
            )}
          </div>
        )}

        {/* Last scanned feedback */}
        {lastScanned && (
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
            <CheckCircle size={16} className="text-emerald-600 shrink-0" />
            <p className="text-sm font-semibold text-emerald-800">
              {lastScanned.name} &ndash; <span className="font-bold">{lastScanned.status}</span>
            </p>
            <button onClick={() => setLastScanned(null)} className="ml-auto text-emerald-400 hover:text-emerald-600 text-xs">✕</button>
          </div>
        )}
      </div>

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          title="Scan Student QR"
          hint="Point at the student's QR card to clock them in"
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export default function StaffAttendancePage() {
  const { record, location, loading, acting, clockIn, clockOut } = useStaffAttendance();
  const { school } = useSelectedSchool();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const { records: history, loading: histLoading } = useStaffAttendanceHistory(month, year);
  const [geoError, setGeoError]       = useState('');
  const [geoLoading, setGeoLoading]   = useState(false);
  const [staffCoords, setStaffCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Watch position continuously so the map updates live
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      pos => setStaffCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
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
        setStaffCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        clockIn(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => { setGeoLoading(false); setGeoError(err.message || 'Could not get your location. Please allow location access.'); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
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
        <p className="mt-0.5 text-sm text-gray-400">Clock in, track your hours and mark your class attendance</p>
      </div>

      {/* Today Hero */}
      <TodayHero
        record={record}
        location={location}
        loading={loading}
        busy={busy}
        geoLoading={geoLoading}
        geoError={geoError}
        onClockIn={handleClockIn}
        onClockOut={clockOut}
        school={school}
        staffCoords={staffCoords}
      />

      {/* Summary + Personal History */}
      <div className="grid gap-5 lg:grid-cols-3">
        <SummaryCard present={present} late={late} absent={absent} total={history.length} month={month} year={year} />
        <div className="lg:col-span-2">
          <PersonalHistoryCard
            history={history}
            histLoading={histLoading}
            month={month}
            year={year}
            onMonthChange={setMonth}
            onYearChange={setYear}
          />
        </div>
      </div>

      {/* Student Attendance */}
      <StudentAttendanceCard school={school} />
    </div>
  );
}
