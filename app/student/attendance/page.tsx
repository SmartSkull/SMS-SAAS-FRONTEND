'use client';
import { useState } from 'react';
import { MapPin, Clock, LogIn, LogOut, AlertCircle, CheckCircle, Timer } from 'lucide-react';
import { useStudentAttendance, useStudentAttendanceHistory } from '@/hooks/attendance';
import { Skeleton } from '@/components/ui/Skeleton';
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

export default function StudentAttendancePage() {
  const { record, location, loading, acting, clockIn, clockOut } = useStudentAttendance();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { records: history, loading: histLoading } = useStudentAttendanceHistory(month, year);
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
            <Clock size={18} /> Today — {now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
          </h2>
          {record && (
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLE[record.status as AttendanceStatus]}`}>
              {record.status}{fmtLate(record.lateMinutes)}
            </span>
          )}
        </div>

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

            {geoError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3">
                <AlertCircle size={16} /> {geoError}
              </div>
            )}

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
    </div>
  );
}
