'use client';
import { useState, useEffect } from 'react';
import { MapPin, Clock, LogIn, LogOut, AlertCircle, CheckCircle, Timer, Users, Loader2, CalendarDays, ChevronRight, History } from 'lucide-react';
import { useStaffAttendance, useStaffAttendanceHistory } from '@/hooks/attendance';
import { Skeleton } from '@/components/ui/Skeleton';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import type { AttendanceStatus } from '@/types';

const STATUS_STYLE: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  LATE: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  ABSENT: 'bg-red-50 text-red-700 ring-red-600/20',
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

export default function StaffAttendancePage() {
  const { record, location, loading, acting, clockIn, clockOut } = useStaffAttendance();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { records: history, loading: histLoading } = useStaffAttendanceHistory(month, year);
  const [geoError, setGeoError] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);

  const handleClockIn = () => {
    setGeoError('');
    if (!navigator.geolocation) { setGeoError('Geolocation not supported by your browser'); return; }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        clockIn(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setGeoLoading(false);
        setGeoError(err.message || 'Could not get your location. Please allow location access.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const busy = acting || geoLoading;

  // Student attendance state
  const toast = useToast();
  const [students, setStudents] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<Record<string, 'PRESENT' | 'ABSENT'>>({});
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [historyDates, setHistoryDates] = useState<{ date: string; present: number; absent: number; late: number; total: number }[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [studentMonth, setStudentMonth] = useState(now.getMonth() + 1);
  const [studentYear, setStudentYear] = useState(now.getFullYear());

  const loadStudents = (date: string) => {
    setLoadingStudents(true);
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
      .finally(() => setLoadingStudents(false));
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

  const handleSubmitAttendance = async () => {
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

  // Summary counts for history
  const present = history.filter((r) => r.status === 'PRESENT').length;
  const late = history.filter((r) => r.status === 'LATE').length;
  const absent = history.filter((r) => r.status === 'ABSENT').length;
  const presentCount = Object.values(statuses).filter(s => s === 'PRESENT').length;

  const todayStr = new Date().toISOString().split('T')[0];
  const isEditingPast = selectedDate !== todayStr;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
          <p className="mt-1 text-sm text-gray-500">Clock in, track your hours and mark your class attendance</p>
        </div>
        {record && (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${STATUS_STYLE[record.status as AttendanceStatus]}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${record.status === 'ABSENT' ? 'bg-red-500' : record.status === 'LATE' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            {record.status}{fmtLate(record.lateMinutes)}
          </span>
        )}
      </div>

      {/* Today card */}
      <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 text-white">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-blue-100">
              <Clock size={18} /> Today
            </h2>
            {location && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                <MapPin size={12} /> {location.name}
              </span>
            )}
          </div>
          <LiveClock />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-4 text-center backdrop-blur">
              <p className="text-xs font-medium text-blue-200">Clock In</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{fmt(record?.clockIn ?? null)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 text-center backdrop-blur">
              <p className="text-xs font-medium text-blue-200">Clock Out</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{fmt(record?.clockOut ?? null)}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-6">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <>
              {/* Location info */}
              {location ? (
                <div className="flex items-start gap-2.5 rounded-xl bg-gray-50 p-3.5 text-sm text-gray-500">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-700">{location.name}</p>
                    <p className="text-xs">{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} · {location.radiusMeters}m radius</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3.5 text-sm text-amber-700">
                  <AlertCircle size={16} className="shrink-0" />
                  No attendance location set by admin yet.
                </div>
              )}

              {/* Geo error */}
              {geoError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-sm text-red-600">
                  <AlertCircle size={16} className="shrink-0" /> {geoError}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                {!record?.clockIn && (
                  <button
                    onClick={handleClockIn}
                    disabled={busy || !location}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {busy ? <Timer size={18} className="animate-spin" /> : <LogIn size={18} />}
                    {geoLoading ? 'Getting location…' : 'Clock In'}
                  </button>
                )}
                {record?.clockIn && !record?.clockOut && (
                  <button
                    onClick={clockOut}
                    disabled={busy}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {busy ? <Timer size={18} className="animate-spin" /> : <LogOut size={18} />}
                    Clock Out
                  </button>
                )}
                {record?.clockIn && record?.clockOut && (
                  <div className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-50 py-3.5 font-semibold text-emerald-700">
                    <CheckCircle size={18} /> Done for today
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Month summary + history */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Summary */}
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">This Month</h3>
          <p className="text-xs text-gray-400">
            {new Date(year, month - 1).toLocaleString('default', { month: 'long' })} {year}
          </p>
          <div className="mt-4 space-y-3">
            {[
              { label: 'Present', value: present, cls: 'bg-emerald-50 text-emerald-600', bar: 'bg-emerald-500' },
              { label: 'Late', value: late, cls: 'bg-amber-50 text-amber-600', bar: 'bg-amber-500' },
              { label: 'Absent', value: absent, cls: 'bg-red-50 text-red-600', bar: 'bg-red-500' },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2.5">
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${s.cls}`}>{s.value}</span>
                  <span className="text-sm font-medium text-gray-600">{s.label}</span>
                </span>
                <span className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
                  <span
                    className={`block h-full rounded-full ${s.bar}`}
                    style={{ width: `${history.length ? Math.round((s.value / history.length) * 100) : 0}%` }}
                  />
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* History list */}
        <div className="rounded-3xl border border-gray-100 bg-white shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-5">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">History</h3>
              <p className="text-xs text-gray-400">Daily clock-in records</p>
            </div>
            <div className="flex gap-2">
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i).toLocaleString('default', { month: 'short' })}
                  </option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                {[now.getFullYear() - 1, now.getFullYear()].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-2">
            {histLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <CalendarDays className="h-9 w-9 text-gray-300" />
                <p className="mt-2 text-sm text-gray-400">No records for this period.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {history.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl px-3 py-3 transition-colors hover:bg-gray-50/70">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{fmtDate(r.date)}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400">
                        <LogIn size={11} /> {fmt(r.clockIn)} · <LogOut size={11} /> {fmt(r.clockOut)}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${STATUS_STYLE[r.status as AttendanceStatus]}`}>
                      {r.status}{fmtLate(r.lateMinutes)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Student Attendance */}
      <div className="rounded-3xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Users size={17} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Mark Student Attendance</h2>
              <p className="text-xs text-gray-400">Your assigned class</p>
            </div>
          </div>
          <div className="flex rounded-xl bg-gray-100 p-1">
            <button
              onClick={() => setShowHistory(false)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${!showHistory ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <CheckCircle size={13} /> Mark
            </button>
            <button
              onClick={() => setShowHistory(true)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${showHistory ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <History size={13} /> History
            </button>
          </div>
        </div>

        <div className="p-5">
          {showHistory ? (
            /* ── History view ── */
            <div className="space-y-4">
              <div className="flex gap-2">
                <select value={studentMonth} onChange={e => setStudentMonth(Number(e.target.value))} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'short' })}</option>
                  ))}
                </select>
                <select value={studentYear} onChange={e => setStudentYear(Number(e.target.value))} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                  {[now.getFullYear() - 1, now.getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              {loadingDates ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : historyDates.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <CalendarDays className="h-9 w-9 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-400">No attendance records for this period.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-gray-100">
                  <div className="grid grid-cols-5 bg-gray-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
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
                          <CalendarDays size={14} className="text-gray-300" /> {fmtDate(d.date)}
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
            /* ── Mark attendance view ── */
            <>
              {/* Date + mark-all controls */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-600">Date:</label>
                  <input
                    type="date"
                    value={selectedDate}
                    max={todayStr}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                  {isEditingPast && (
                    <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">Editing past record</span>
                  )}
                </div>
                {students.length > 0 && (
                  <div className="flex gap-2">
                    <button onClick={() => handleMarkAll('PRESENT')}
                      className="rounded-xl bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200">
                      All Present
                    </button>
                    <button onClick={() => handleMarkAll('ABSENT')}
                      className="rounded-xl bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-200">
                      All Absent
                    </button>
                  </div>
                )}
              </div>

              {loadingStudents ? (
                <div className="mt-4 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : students.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <Users className="h-9 w-9 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-400">No students assigned to your class.</p>
                </div>
              ) : (
                <>
                  <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100">
                    <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Student</span>
                      <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <input type="checkbox"
                          checked={students.every(s => statuses[s.uniqueId] === 'PRESENT')}
                          onChange={e => handleMarkAll(e.target.checked ? 'PRESENT' : 'ABSENT')}
                          className="h-4 w-4 accent-emerald-600" />
                        All Present
                      </label>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {students.map(s => (
                        <label key={s.uniqueId} className="flex cursor-pointer items-center justify-between px-4 py-3 transition-colors hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${statuses[s.uniqueId] === 'PRESENT' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                              {(s.firstname?.[0] ?? '?')}{s.lastname?.[0] ?? ''}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{s.firstname} {s.lastname}</p>
                              <p className="font-mono text-xs text-gray-400">{s.uniqueId}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className={`text-xs font-semibold ${statuses[s.uniqueId] === 'PRESENT' ? 'text-emerald-600' : 'text-red-500'}`}>
                              {statuses[s.uniqueId] === 'PRESENT' ? 'Present' : 'Absent'}
                            </span>
                            <input type="checkbox"
                              checked={statuses[s.uniqueId] === 'PRESENT'}
                              onChange={e => setStatuses(p => ({ ...p, [s.uniqueId]: e.target.checked ? 'PRESENT' : 'ABSENT' }))}
                              className="h-5 w-5 accent-emerald-600" />
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleSubmitAttendance} disabled={submitting}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-60">
                    {submitting && <Loader2 size={15} className="animate-spin" />}
                    {submitting ? 'Saving…' : `Save Attendance (${presentCount} / ${students.length} present)`}
                    {!submitting && <ChevronRight size={15} />}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
