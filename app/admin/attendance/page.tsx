'use client';
import { useState, useEffect } from 'react';
import { MapPin, Users, AlertCircle, Save, RefreshCw } from 'lucide-react';
import { useAdminAttendanceLocation, useAdminAttendanceReport, useAdminStudentAttendanceReport } from '@/hooks/attendance';
import { useSchoolData } from '@/hooks/useSchoolData';
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

export default function AdminAttendancePage() {
  const { location, loading: locLoading, saving, save } = useAdminAttendanceLocation();
  const [form, setForm] = useState({ name: '', latitude: '', longitude: '', radiusMeters: '100', resumptionTime: '08:00' });
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [geoAccuracy, setGeoAccuracy] = useState<number | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [tab, setTab] = useState<'staff' | 'students'>('staff');
  const { classes } = useSchoolData();

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
    setGeoError('');
    setGeoAccuracy(null);
    setResolvedAddress('');
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
        setForm((f) => ({ ...f, latitude: String(latitude), longitude: String(longitude) }));
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
            a.city ?? a.county,
            a.state,
            a.country,
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
  const previewLat = Number(form.latitude);
  const previewLng = Number(form.longitude);
  const previewRadius = Number(form.radiusMeters) || 100;
  const hasLocationPreview = Number.isFinite(previewLat) && Number.isFinite(previewLng);
  const previewSpan = Math.min(Math.max((previewRadius / 111000) * 4, 0.002), 0.03);
  const locationPreviewUrl = hasLocationPreview
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${previewLng - previewSpan}%2C${previewLat - previewSpan}%2C${previewLng + previewSpan}%2C${previewLat + previewSpan}&layer=mapnik&marker=${previewLat}%2C${previewLng}`
    : '';

  const { records: staffRecords, loading: staffLoading, markAbsent: markStaffAbsent, reload: reloadStaff } = useAdminAttendanceReport({ date: reportDate });
  const { records: studentRecords, loading: studentLoading, markAbsent: markStudentsAbsent, reload: reloadStudents } = useAdminStudentAttendanceReport({ date: reportDate, className: classFilter || undefined });

  const staffPresent = staffRecords.filter((r) => r.status === 'PRESENT').length;
  const staffLate = staffRecords.filter((r) => r.status === 'LATE').length;
  const staffAbsent = staffRecords.filter((r) => r.status === 'ABSENT').length;

  const stuPresent = studentRecords.filter((r) => r.status === 'PRESENT').length;
  const stuLate = studentRecords.filter((r) => r.status === 'LATE').length;
  const stuAbsent = studentRecords.filter((r) => r.status === 'ABSENT').length;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Attendance</h1>

      {/* Location setup */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
        <h2 className="font-semibold text-gray-700 flex items-center gap-2">
          <MapPin size={18} className="text-blue-500" /> Attendance Location
        </h2>
        <p className="text-sm text-gray-500">
          Set the GPS location where staff and students must be present to clock in. Anyone outside the radius will be blocked.
        </p>

        {locLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 gap-3"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
            <div className="flex gap-3"><Skeleton className="h-10 w-40" /><Skeleton className="h-10 w-36" /><Skeleton className="h-10 w-40" /></div>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              placeholder="Location name (e.g. Main Campus)"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input placeholder="Latitude" value={form.latitude} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))} className="border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              <input placeholder="Longitude" value={form.longitude} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))} className="border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[10rem_9rem_auto] gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 font-medium">Radius (metres)</label>
                <input placeholder="Radius (metres)" value={form.radiusMeters} onChange={(e) => setForm((f) => ({ ...f, radiusMeters: e.target.value }))} className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 font-medium">Resumption time</label>
                <input type="time" value={form.resumptionTime} onChange={(e) => setForm((f) => ({ ...f, resumptionTime: e.target.value }))} className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
                <button onClick={useMyLocation} disabled={geoLoading} className="flex w-full items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-xl px-4 py-2.5 transition disabled:opacity-60">
                  <MapPin size={15} /> {geoLoading ? 'Getting…' : 'Use my location'}
                </button>
              </div>
            </div>

            {geoError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3">
                <AlertCircle size={15} /> {geoError}
              </div>
            )}
            {geoAccuracy !== null && !geoError && (
              <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
                Browser accuracy: approximately {Math.round(geoAccuracy)} metres
              </div>
            )}
            {resolvedAddress && (
              <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 rounded-xl p-3">
                <MapPin size={15} className="mt-0.5 shrink-0" />
                <span><strong>Detected location:</strong> {resolvedAddress}</span>
              </div>
            )}
            {location && (
              <div className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">
                Current: <strong>{location.name}</strong> · {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} · {location.radiusMeters}m radius · resumption <strong>{location.resumptionTime}</strong>
              </div>
            )}
            {hasLocationPreview && (
              <div className="overflow-hidden rounded-xl border bg-gray-50">
                <iframe
                  title="Attendance location preview"
                  src={locationPreviewUrl}
                  className="h-64 w-full"
                  loading="lazy"
                />
                <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-gray-500">
                  <span>Location preview for the selected coordinates</span>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${previewLat}&mlon=${previewLng}#map=18/${previewLat}/${previewLng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-blue-600 hover:text-blue-800"
                  >
                    Open map
                  </a>
                </div>
              </div>
            )}
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl transition">
              <Save size={16} /> {saving ? 'Saving…' : 'Save Location'}
            </button>
          </div>
        )}
      </div>

      {/* Report */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <Users size={18} className="text-green-500" /> Attendance Report
          </h2>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            {tab === 'students' && (
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              >
                <option value="">All Classes</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <button onClick={() => tab === 'staff' ? reloadStaff() : reloadStudents()} className="p-2 border rounded-xl hover:bg-gray-50 transition">
              <RefreshCw size={16} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab('staff')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === 'staff' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Staff
          </button>
          <button
            onClick={() => setTab('students')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === 'students' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Students
          </button>
        </div>

        {/* Staff tab */}
        {tab === 'staff' && (
          <>
            <div className="grid grid-cols-3 gap-3 text-center">
              {staffLoading ? (
                <><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></>
              ) : (
                <>
                  <div className="bg-green-50 rounded-xl p-3"><p className="text-2xl font-bold text-green-700">{staffPresent}</p><p className="text-xs text-gray-500">Present</p></div>
                  <div className="bg-yellow-50 rounded-xl p-3"><p className="text-2xl font-bold text-yellow-700">{staffLate}</p><p className="text-xs text-gray-500">Late</p></div>
                  <div className="bg-red-50 rounded-xl p-3"><p className="text-2xl font-bold text-red-700">{staffAbsent}</p><p className="text-xs text-gray-500">Absent</p></div>
                </>
              )}
            </div>
            <button onClick={() => markStaffAbsent(reportDate)} className="text-sm text-red-600 hover:text-red-800 border border-red-200 rounded-xl px-4 py-2 transition">
              Mark non-clocked staff as Absent
            </button>
            {staffLoading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex items-center gap-4 py-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-16" /><Skeleton className="h-6 w-16 rounded-full ml-auto" /></div>)}</div>
            ) : staffRecords.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No records for this date.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2 font-medium">Staff</th><th className="pb-2 font-medium">Staff No</th><th className="pb-2 font-medium">Clock In</th><th className="pb-2 font-medium">Clock Out</th><th className="pb-2 font-medium">Status</th></tr></thead>
                  <tbody className="divide-y">
                    {staffRecords.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 font-medium text-gray-800">{r.staff.name}</td>
                        <td className="py-3 text-gray-500">{r.staff.staffNo}</td>
                        <td className="py-3 text-gray-600">{fmt(r.clockIn)}</td>
                        <td className="py-3 text-gray-600">{fmt(r.clockOut)}</td>
                        <td className="py-3"><span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLE[r.status as AttendanceStatus]}`}>{r.status}{fmtLate(r.lateMinutes)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Students tab */}
        {tab === 'students' && (
          <>
            <div className="grid grid-cols-3 gap-3 text-center">
              {studentLoading ? (
                <><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></>
              ) : (
                <>
                  <div className="bg-green-50 rounded-xl p-3"><p className="text-2xl font-bold text-green-700">{stuPresent}</p><p className="text-xs text-gray-500">Present</p></div>
                  <div className="bg-yellow-50 rounded-xl p-3"><p className="text-2xl font-bold text-yellow-700">{stuLate}</p><p className="text-xs text-gray-500">Late</p></div>
                  <div className="bg-red-50 rounded-xl p-3"><p className="text-2xl font-bold text-red-700">{stuAbsent}</p><p className="text-xs text-gray-500">Absent</p></div>
                </>
              )}
            </div>
            <button onClick={() => markStudentsAbsent(reportDate)} className="text-sm text-red-600 hover:text-red-800 border border-red-200 rounded-xl px-4 py-2 transition">
              Mark non-clocked students as Absent
            </button>
            {studentLoading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex items-center gap-4 py-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-16" /><Skeleton className="h-6 w-16 rounded-full ml-auto" /></div>)}</div>
            ) : studentRecords.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No records for this date.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2 font-medium">Student</th><th className="pb-2 font-medium">Student No</th><th className="pb-2 font-medium">Clock In</th><th className="pb-2 font-medium">Clock Out</th><th className="pb-2 font-medium">Status</th></tr></thead>
                  <tbody className="divide-y">
                    {studentRecords.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 font-medium text-gray-800">{r.student.name}</td>
                        <td className="py-3 text-gray-500">{r.student.studentNo}</td>
                        <td className="py-3 text-gray-600">{fmt(r.clockIn)}</td>
                        <td className="py-3 text-gray-600">{fmt(r.clockOut)}</td>
                        <td className="py-3"><span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLE[r.status as AttendanceStatus]}`}>{r.status}{fmtLate(r.lateMinutes)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
