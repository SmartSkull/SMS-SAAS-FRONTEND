'use client';
import { useState, useEffect } from 'react';
import { MapPin, Clock, LogIn, LogOut, AlertCircle, CheckCircle, Timer, Users, Loader2 } from 'lucide-react';
import { useStaffAttendance, useStaffAttendanceHistory } from '@/hooks/attendance';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { useSchoolData } from '@/hooks/useSchoolData';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import type { AttendanceStatus } from '@/types';

const STATUS_STYLE: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-green-100 text-green-700',
  LATE: 'bg-yellow-100 text-yellow-700',
  ABSENT: 'bg-red-100 text-red-700',
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
    <div className="flex flex-col items-center py-4">
      <div className="flex items-end gap-1 tabular-nums">
        <span className="text-6xl font-bold tracking-tight text-gray-800">{hh}</span>
        <span className="text-5xl font-bold text-blue-500 mb-1 animate-pulse">:</span>
        <span className="text-6xl font-bold tracking-tight text-gray-800">{mm}</span>
        <span className="text-5xl font-bold text-blue-500 mb-1 animate-pulse">:</span>
        <span className="text-4xl font-semibold tracking-tight text-gray-400 mb-1">{ss}</span>
      </div>
      <p className="text-sm text-gray-400 mt-1">
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

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">My Attendance</h1>

      {/* Today card */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <Clock size={18} /> Today
          </h2>
          {record && (
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLE[record.status as AttendanceStatus]}`}>
              {record.status}{fmtLate(record.lateMinutes)}
            </span>
          )}
        </div>

        <LiveClock />

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
              <div className="flex items-start gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl p-3">
                <MapPin size={16} className="mt-0.5 text-blue-500 shrink-0" />
                <div>
                  <p className="font-medium text-gray-700">{location.name}</p>
                  <p>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} · {location.radiusMeters}m radius</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-xl p-3">
                <AlertCircle size={16} />
                No attendance location set by admin yet.
              </div>
            )}

            {/* Clock times */}
            {record && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Clock In</p>
                  <p className="font-bold text-green-700 text-lg">{fmt(record.clockIn)}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Clock Out</p>
                  <p className="font-bold text-blue-700 text-lg">{fmt(record.clockOut)}</p>
                </div>
              </div>
            )}

            {/* Geo error */}
            {geoError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3">
                <AlertCircle size={16} /> {geoError}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              {!record?.clockIn && (
                <button
                  onClick={handleClockIn}
                  disabled={busy || !location}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition"
                >
                  {busy ? <Timer size={18} className="animate-spin" /> : <LogIn size={18} />}
                  {geoLoading ? 'Getting location…' : 'Clock In'}
                </button>
              )}
              {record?.clockIn && !record?.clockOut && (
                <button
                  onClick={clockOut}
                  disabled={busy}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition"
                >
                  {busy ? <Timer size={18} className="animate-spin" /> : <LogOut size={18} />}
                  Clock Out
                </button>
              )}
              {record?.clockIn && record?.clockOut && (
                <div className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-500 font-semibold py-3 rounded-xl">
                  <CheckCircle size={18} className="text-green-500" /> Done for today
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-semibold text-gray-700">History</h2>
          <div className="flex gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="border rounded-lg px-2 py-1 text-sm"
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
              className="border rounded-lg px-2 py-1 text-sm"
            >
              {[now.getFullYear() - 1, now.getFullYear()].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary */}
        {!histLoading && history.length > 0 && (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-green-700">{present}</p>
              <p className="text-xs text-gray-500">Present</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-yellow-700">{late}</p>
              <p className="text-xs text-gray-500">Late</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-red-700">{absent}</p>
              <p className="text-xs text-gray-500">Absent</p>
            </div>
          </div>
        )}

        {histLoading ? (
          <div className="space-y-2">
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
          <p className="text-gray-400 text-sm text-center py-4">No records for this period.</p>
        ) : (
          <div className="divide-y">
            {history.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">{fmtDate(r.date)}</p>
                  <p className="text-xs text-gray-400">In: {fmt(r.clockIn)} · Out: {fmt(r.clockOut)}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLE[r.status as AttendanceStatus]}`}>
                  {r.status}{fmtLate(r.lateMinutes)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Student Attendance */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-blue-600" />
            <h2 className="font-semibold text-gray-700">Mark Student Attendance</h2>
          </div>
          <button
            onClick={() => setShowHistory(h => !h)}
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            {showHistory ? 'Mark Attendance' : 'View History'}
          </button>
        </div>

        {showHistory ? (
          /* ── History view ── */
          <div className="space-y-3">
            <div className="flex gap-2">
              <select value={studentMonth} onChange={e => setStudentMonth(Number(e.target.value))} className="border rounded-lg px-2 py-1 text-sm">
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'short' })}</option>
                ))}
              </select>
              <select value={studentYear} onChange={e => setStudentYear(Number(e.target.value))} className="border rounded-lg px-2 py-1 text-sm">
                {[now.getFullYear() - 1, now.getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {loadingDates ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : historyDates.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No attendance records for this period.</p>
            ) : (
              <div className="divide-y border rounded-xl overflow-hidden">
                <div className="grid grid-cols-5 px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                  <span className="col-span-2">Date</span>
                  <span className="text-green-600">Present</span>
                  <span className="text-yellow-600">Late</span>
                  <span className="text-red-500">Absent</span>
                </div>
                {historyDates.map(d => (
                  <button
                    key={d.date}
                    onClick={() => { setSelectedDate(d.date); setShowHistory(false); loadStudents(d.date); }}
                    className="w-full grid grid-cols-5 px-4 py-3 hover:bg-blue-50 text-left transition"
                  >
                    <span className="col-span-2 text-sm font-medium text-gray-700">{fmtDate(d.date)}</span>
                    <span className="text-sm text-green-700 font-semibold">{d.present}</span>
                    <span className="text-sm text-yellow-700 font-semibold">{d.late}</span>
                    <span className="text-sm text-red-600 font-semibold">{d.absent}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── Mark attendance view ── */
          <>
            {/* Date picker */}
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600 font-medium">Date:</label>
              <input
                type="date"
                value={selectedDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setSelectedDate(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm"
              />
              {selectedDate !== new Date().toISOString().split('T')[0] && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">Editing past record</span>
              )}
            </div>

            <div className="flex gap-3 flex-wrap">
              {students.length > 0 && (
                <div className="flex gap-2">
                  <button onClick={() => handleMarkAll('PRESENT')}
                    className="px-3 py-2 text-xs font-medium bg-green-100 text-green-700 rounded-xl hover:bg-green-200">
                    All Present
                  </button>
                  <button onClick={() => handleMarkAll('ABSENT')}
                    className="px-3 py-2 text-xs font-medium bg-red-100 text-red-700 rounded-xl hover:bg-red-200">
                    All Absent
                  </button>
                </div>
              )}
            </div>

            {loadingStudents ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : students.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No students assigned to your class.</p>
            ) : (
              <>
                <div className="divide-y border rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Student</span>
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase cursor-pointer">
                      <input type="checkbox"
                        checked={students.every(s => statuses[s.uniqueId] === 'PRESENT')}
                        onChange={e => handleMarkAll(e.target.checked ? 'PRESENT' : 'ABSENT')}
                        className="w-4 h-4 accent-green-600" />
                      All Present
                    </label>
                  </div>
                  {students.map(s => (
                    <label key={s.uniqueId} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{s.firstname} {s.lastname}</p>
                        <p className="text-xs text-gray-400 font-mono">{s.uniqueId}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${statuses[s.uniqueId] === 'PRESENT' ? 'text-green-600' : 'text-red-500'}`}>
                          {statuses[s.uniqueId] === 'PRESENT' ? 'Present' : 'Absent'}
                        </span>
                        <input type="checkbox"
                          checked={statuses[s.uniqueId] === 'PRESENT'}
                          onChange={e => setStatuses(p => ({ ...p, [s.uniqueId]: e.target.checked ? 'PRESENT' : 'ABSENT' }))}
                          className="w-5 h-5 accent-green-600" />
                      </div>
                    </label>
                  ))}
                </div>
                <button onClick={handleSubmitAttendance} disabled={submitting}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
                  {submitting && <Loader2 size={15} className="animate-spin" />}
                  {submitting ? 'Saving…' : `Save Attendance (${Object.values(statuses).filter(s => s === 'PRESENT').length} / ${students.length} present)`}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
