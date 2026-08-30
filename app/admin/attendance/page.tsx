'use client';
import { useState, useEffect } from 'react';
import {
  MapPin, Users, AlertCircle, Save, RefreshCw,
  CheckCircle2, Clock, XCircle, ChevronDown,
  Settings2, BarChart3, GraduationCap, UserCheck,
  ScanLine, CheckCircle,
} from 'lucide-react';
import { useAdminAttendanceLocation, useAdminAttendanceReport, useAdminStudentAttendanceReport } from '@/hooks/attendance';
import { useSchoolData } from '@/hooks/useSchoolData';
import { useSelectedSchool } from '@/hooks/useSelectedSchool';
import { Skeleton } from '@/components/ui/Skeleton';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import BarcodeScanner from '@/components/ui/BarcodeScanner';
import type { AttendanceStatus } from '@/types';
import clsx from 'clsx';

const STATUS_CFG: Record<AttendanceStatus, { bg: string; color: string; badge: string; dot: string; label: string }> = {
  PRESENT: { bg: 'bg-emerald-50', color: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', label: 'Present' },
  LATE:    { bg: 'bg-amber-50',   color: 'text-amber-600',   badge: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500',   label: 'Late'    },
  ABSENT:  { bg: 'bg-red-50',     color: 'text-red-600',     badge: 'bg-red-100 text-red-700',         dot: 'bg-red-500',     label: 'Absent'  },
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

/* ─────────────────────────────────────────────
   Stats Row
───────────────────────────────────────────── */
function StatsRow({ present, late, absent, loading }: { present: number; late: number; absent: number; loading: boolean }) {
  const total = present + late + absent;
  const stats = [
    { label: 'Present', value: present, bg: 'bg-emerald-50', color: 'text-emerald-600', bar: 'bg-emerald-500', icon: CheckCircle2 },
    { label: 'Late',    value: late,    bg: 'bg-amber-50',   color: 'text-amber-600',   bar: 'bg-amber-500',   icon: Clock       },
    { label: 'Absent',  value: absent,  bg: 'bg-red-50',     color: 'text-red-600',     bar: 'bg-red-500',     icon: XCircle     },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map(({ label, value, bg, color, bar, icon: Icon }) => (
        loading ? (
          <Skeleton key={label} className="h-20 rounded-2xl" />
        ) : (
          <div key={label} className={clsx('rounded-2xl p-4 flex flex-col gap-2', bg)}>
            <div className="flex items-center justify-between">
              <Icon size={16} className={color} />
              <span className={clsx('text-2xl font-black', color)}>{value}</span>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">{label}</p>
              <div className="mt-1.5 h-1 rounded-full bg-black/10 overflow-hidden">
                <div className={clsx('h-full rounded-full', bar)} style={{ width: `${total ? Math.round((value / total) * 100) : 0}%` }} />
              </div>
            </div>
          </div>
        )
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Records Table
───────────────────────────────────────────── */
function RecordsTable({ records, loading, type }: { records: any[]; loading: boolean; type: 'staff' | 'students' }) {
  if (loading) return (
    <div className="space-y-2 p-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-2 py-2">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );

  if (!records.length) return (
    <div className="flex flex-col items-center py-12 text-center">
      <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
        <Users className="w-6 h-6 text-gray-300" />
      </div>
      <p className="text-sm font-medium text-gray-400">No records for this date</p>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[480px]">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="pb-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Name</th>
            <th className="pb-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              {type === 'staff' ? 'Staff No' : 'Student No'}
            </th>
            <th className="pb-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">In</th>
            <th className="pb-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Out</th>
            <th className="pb-3 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-400">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {records.map((r) => {
            const person = type === 'staff' ? r.staff : r.student;
            const cfg = STATUS_CFG[r.status as AttendanceStatus];
            return (
              <tr key={r.id} className="hover:bg-gray-50/60 transition-colors group">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold', cfg.bg, cfg.color)}>
                      {(person?.name?.[0] ?? '?').toUpperCase()}
                    </div>
                    <span className="font-semibold text-gray-800">{person?.name}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 font-mono text-xs text-gray-400">
                  {type === 'staff' ? person?.staffNo : person?.studentNo}
                </td>
                <td className="py-3 pr-4 text-gray-600 tabular-nums">{fmt(r.clockIn)}</td>
                <td className="py-3 pr-4 text-gray-600 tabular-nums">{fmt(r.clockOut)}</td>
                <td className="py-3 text-right">
                  <span className={clsx('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold', cfg.badge)}>
                    <span className={clsx('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                    {cfg.label}{fmtLate(r.lateMinutes)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export default function AdminAttendancePage() {
  const { location, loading: locLoading, saving, save } = useAdminAttendanceLocation();
  const { school } = useSelectedSchool();
  const [form, setForm] = useState({
    name: '', latitude: '', longitude: '', radiusMeters: '100', resumptionTime: '08:00',
  });
  const [geoLoading, setGeoLoading]       = useState(false);
  const [geoError, setGeoError]           = useState('');
  const [geoAccuracy, setGeoAccuracy]     = useState<number | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [tab, setTab] = useState<'staff' | 'students'>('staff');
  const { classes } = useSchoolData();

  const primary = school?.primaryColor || '#2563eb';

  useEffect(() => {
    if (location) {
      setForm({
        name: location.name,
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        radiusMeters: String(location.radiusMeters),
        resumptionTime: location.resumptionTime ?? '08:00',
      });
    }
  }, [location]);

  const useMyLocation = () => {
    setGeoError(''); setGeoAccuracy(null); setResolvedAddress('');
    if (!navigator.geolocation) { setGeoError('Geolocation not supported'); return; }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const accuracyMeters = Number(accuracy);
        setGeoAccuracy(Number.isFinite(accuracyMeters) ? accuracyMeters : null);
        const minimumAccuracy = Math.max(Number(form.radiusMeters || 100) * 2, 150);
        if (Number.isFinite(accuracyMeters) && accuracyMeters > minimumAccuracy) {
          setGeoLoading(false);
          setGeoError(`Browser location is only accurate to about ${Math.round(accuracyMeters)}m, so it may point to the wrong place. Use a phone GPS near the school or enter the coordinates manually.`);
          return;
        }
        setForm(f => ({ ...f, latitude: String(latitude), longitude: String(longitude) }));
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } },
          );
          const data = await res.json();
          const a = data.address ?? {};
          const parts = [
            a.house_number && a.road ? `${a.house_number} ${a.road}` : a.road,
            a.neighbourhood ?? a.suburb ?? a.village ?? a.town,
            a.city ?? a.county, a.state, a.country,
          ].filter(Boolean);
          setResolvedAddress(parts.length ? parts.join(', ') : (data.display_name ?? ''));
        } catch { /* non-fatal */ }
        setGeoLoading(false);
      },
      (err) => { setGeoLoading(false); setGeoError(err.message); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSave = () => {
    if (!form.latitude || !form.longitude) { setGeoError('Latitude and longitude are required'); return; }
    save({
      name: form.name || 'School Location',
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      radiusMeters: Number(form.radiusMeters) || 100,
      resumptionTime: form.resumptionTime || '08:00',
    });
  };

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const [reportDate, setReportDate] = useState(todayStr);
  const [classFilter, setClassFilter] = useState('');

  const previewLat    = Number(form.latitude);
  const previewLng    = Number(form.longitude);
  const previewRadius = Number(form.radiusMeters) || 100;
  const hasPreview    = Number.isFinite(previewLat) && Number.isFinite(previewLng) && form.latitude && form.longitude;
  const previewSpan   = Math.min(Math.max((previewRadius / 111000) * 4, 0.002), 0.03);
  const previewUrl    = hasPreview
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${previewLng - previewSpan}%2C${previewLat - previewSpan}%2C${previewLng + previewSpan}%2C${previewLat + previewSpan}&layer=mapnik&marker=${previewLat}%2C${previewLng}`
    : '';

  const { records: staffRecords,   loading: staffLoading,   markAbsent: markStaffAbsent,    reload: reloadStaff    } = useAdminAttendanceReport({ date: reportDate });
  const { records: studentRecords, loading: studentLoading, markAbsent: markStudentsAbsent, reload: reloadStudents } = useAdminStudentAttendanceReport({ date: reportDate, className: classFilter || undefined });

  // ── QR Scan ──
  const toast = useToast();
  const [showScanner, setShowScanner] = useState(false);
  const [scanTarget, setScanTarget]   = useState<'staff' | 'students'>('students');
  const [scanning, setScanning]       = useState(false);
  const [lastScanned, setLastScanned] = useState<{ name: string; status: string } | null>(null);

  const handleScan = async (uniqueId: string) => {
    setShowScanner(false);
    setScanning(true);
    try {
      const r = await api.post<any>(endpoints.admin.attendanceScanClockIn, {
        uniqueId,
        date: reportDate,
      });
      const name   = r?.data?.studentName ?? r?.studentName ?? uniqueId;
      const status = r?.data?.status ?? r?.status ?? 'PRESENT';
      setLastScanned({ name, status });
      toast.success(`✓ ${name} marked ${status}`);
      // Refresh whichever report is visible
      if (tab === 'staff') reloadStaff(); else reloadStudents();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to clock in');
    } finally {
      setScanning(false);
    }
  };

  const staffPresent = staffRecords.filter(r => r.status === 'PRESENT').length;
  const staffLate    = staffRecords.filter(r => r.status === 'LATE').length;
  const staffAbsent  = staffRecords.filter(r => r.status === 'ABSENT').length;

  const stuPresent = studentRecords.filter(r => r.status === 'PRESENT').length;
  const stuLate    = studentRecords.filter(r => r.status === 'LATE').length;
  const stuAbsent  = studentRecords.filter(r => r.status === 'ABSENT').length;

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="mt-0.5 text-sm text-gray-400">Manage location settings and view daily reports</p>
      </div>

      {/* ── Location Setup Hero ── */}
      <div
        className="relative rounded-2xl overflow-hidden shadow-lg"
        style={{ background: `linear-gradient(135deg, ${primary} 0%, color-mix(in srgb, ${primary} 70%, black) 100%)` }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
              <Settings2 size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold">Attendance Location</h2>
              <p className="text-white/60 text-xs mt-0.5">
                Set the GPS location where staff and students must be present to clock in
              </p>
            </div>
          </div>

          {locLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-11 w-full opacity-30" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-11 opacity-30" />
                <Skeleton className="h-11 opacity-30" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Name */}
              <input
                placeholder="Location name (e.g. Main Campus)"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
              />

              {/* Lat / Lng */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  placeholder="Latitude"
                  value={form.latitude}
                  onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))}
                  className="bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                <input
                  placeholder="Longitude"
                  value={form.longitude}
                  onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))}
                  className="bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>

              {/* Radius + Resumption + Use my location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[10rem_9rem_auto] gap-3 items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-white/60 font-medium">Radius (metres)</label>
                  <input
                    placeholder="100"
                    value={form.radiusMeters}
                    onChange={e => setForm(f => ({ ...f, radiusMeters: e.target.value }))}
                    className="bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-white/60 font-medium">Resumption time</label>
                  <input
                    type="time"
                    value={form.resumptionTime}
                    onChange={e => setForm(f => ({ ...f, resumptionTime: e.target.value }))}
                    className="bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
                  <button
                    onClick={useMyLocation}
                    disabled={geoLoading}
                    className="flex w-full items-center justify-center gap-2 bg-white/15 border border-white/25 hover:bg-white/20 text-white text-sm font-medium rounded-xl px-4 py-2.5 transition disabled:opacity-50"
                  >
                    <MapPin size={14} /> {geoLoading ? 'Getting…' : 'Use my location'}
                  </button>
                </div>
              </div>

              {/* Feedback messages */}
              {geoError && (
                <div className="flex items-center gap-2 bg-red-500/20 border border-red-400/20 rounded-xl p-3.5 text-sm text-red-100">
                  <AlertCircle size={14} className="shrink-0" /> {geoError}
                </div>
              )}
              {geoAccuracy !== null && !geoError && (
                <div className="bg-white/10 border border-white/10 rounded-xl p-3 text-xs text-white/70">
                  Browser accuracy: approximately {Math.round(geoAccuracy)} metres
                </div>
              )}
              {resolvedAddress && (
                <div className="flex items-start gap-2 bg-emerald-500/20 border border-emerald-400/20 rounded-xl p-3.5 text-sm text-emerald-100">
                  <MapPin size={14} className="mt-0.5 shrink-0" />
                  <span><strong>Detected:</strong> {resolvedAddress}</span>
                </div>
              )}
              {location && (
                <div className="bg-white/10 border border-white/10 rounded-xl p-3 text-xs text-white/60">
                  Current: <strong className="text-white/80">{location.name}</strong> · {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} · {location.radiusMeters}m · resumption <strong className="text-white/80">{location.resumptionTime}</strong>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map preview + Save — below the hero */}
      {(hasPreview || !locLoading) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {hasPreview && (
            <>
              <iframe
                title="Attendance location preview"
                src={previewUrl}
                className="h-56 w-full"
                loading="lazy"
              />
              <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-gray-50 text-xs text-gray-400">
                <span>Preview for selected coordinates</span>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${previewLat}&mlon=${previewLng}#map=18/${previewLat}/${previewLng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-blue-600 hover:text-blue-800"
                >
                  Open full map ↗
                </a>
              </div>
            </>
          )}
          <div className="px-5 py-4 flex items-center justify-between gap-3 border-t border-gray-50">
            <p className="text-xs text-gray-400">Anyone outside the radius will be blocked from clocking in.</p>
            <button
              onClick={handleSave}
              disabled={saving || locLoading}
              className="flex items-center gap-2 btn-brand text-white text-sm font-semibold px-5 py-2.5 rounded-xl disabled:opacity-50"
            >
              <Save size={14} /> {saving ? 'Saving…' : 'Save Location'}
            </button>
          </div>
        </div>
      )}

      {/* ── Attendance Report ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Report header */}
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <BarChart3 size={17} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">Attendance Report</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Daily overview for all staff and students</p>
            </div>
          </div>

          {/* Date + class filter + refresh */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={reportDate}
              onChange={e => setReportDate(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
            />
            {tab === 'students' && (
              <div className="relative">
                <select
                  value={classFilter}
                  onChange={e => setClassFilter(e.target.value)}
                  className="appearance-none border border-gray-200 rounded-xl pl-3 pr-8 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm cursor-pointer"
                >
                  <option value="">All Classes</option>
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            )}
            <button
              onClick={() => tab === 'staff' ? reloadStaff() : reloadStudents()}
              className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm"
              title="Refresh"
            >
              <RefreshCw size={15} className="text-gray-500" />
            </button>
            {/* Scan QR */}
            <button
              onClick={() => { setLastScanned(null); setScanTarget(tab); setShowScanner(true); }}
              disabled={scanning}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-60 shadow"
            >
              <ScanLine size={14} />
              {scanning ? 'Clocking in…' : 'Scan QR'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            <button
              onClick={() => setTab('staff')}
              className={clsx(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition',
                tab === 'staff' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <UserCheck size={14} /> Staff
            </button>
            <button
              onClick={() => setTab('students')}
              className={clsx(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition',
                tab === 'students' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <GraduationCap size={14} /> Students
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {tab === 'staff' && (
            <>
              <StatsRow present={staffPresent} late={staffLate} absent={staffAbsent} loading={staffLoading} />
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">{staffRecords.length} record{staffRecords.length !== 1 ? 's' : ''}</p>
                <button
                  onClick={() => markStaffAbsent(reportDate)}
                  className="text-xs font-semibold text-red-600 hover:text-red-800 border border-red-200 bg-red-50 hover:bg-red-100 rounded-xl px-4 py-2 transition"
                >
                  Mark non-clocked as Absent
                </button>
              </div>
              <RecordsTable records={staffRecords} loading={staffLoading} type="staff" />
            </>
          )}

          {tab === 'students' && (
            <>
              <StatsRow present={stuPresent} late={stuLate} absent={stuAbsent} loading={studentLoading} />
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">{studentRecords.length} record{studentRecords.length !== 1 ? 's' : ''}</p>
                <button
                  onClick={() => markStudentsAbsent(reportDate)}
                  className="text-xs font-semibold text-red-600 hover:text-red-800 border border-red-200 bg-red-50 hover:bg-red-100 rounded-xl px-4 py-2 transition"
                >
                  Mark non-clocked as Absent
                </button>
              </div>
              <RecordsTable records={studentRecords} loading={studentLoading} type="students" />
            </>
          )}

          {/* Last scanned feedback */}
          {lastScanned && (
            <div className="mt-2 flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
              <CheckCircle size={16} className="text-emerald-600 shrink-0" />
              <p className="text-sm font-semibold text-emerald-800">
                {lastScanned.name} &ndash; <span className="font-bold">{lastScanned.status}</span>
              </p>
              <button onClick={() => setLastScanned(null)} className="ml-auto text-emerald-400 hover:text-emerald-600 text-xs">✕</button>
            </div>
          )}
        </div>
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
