'use client';
import { useEffect, useState, useCallback } from 'react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import type { ApiResponse, AttendanceLocation, StaffAttendanceRecord, StaffAttendanceReportItem, StudentAttendanceRecord, StudentAttendanceReportItem } from '@/types';

/* ── Staff: today status + clock in/out ───────────────────────────────── */
export function useStaffAttendance() {
  const [record, setRecord] = useState<StaffAttendanceRecord | null>(null);
  const [location, setLocation] = useState<AttendanceLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    api.get<ApiResponse<{ record: StaffAttendanceRecord | null; location: AttendanceLocation | null }>>(
      endpoints.staff.attendanceToday,
    )
      .then((r) => { setRecord(r.data.record); setLocation(r.data.location); })
      .catch(() => toast.error('Failed to load attendance'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const clockIn = async (latitude: number, longitude: number) => {
    setActing(true);
    try {
      const r = await api.post<ApiResponse<StaffAttendanceRecord>>(endpoints.staff.attendanceClockIn, { latitude, longitude });
      toast.success(r.message ?? 'Clocked in');
      load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Clock-in failed');
    } finally {
      setActing(false);
    }
  };

  const clockOut = async () => {
    setActing(true);
    try {
      const coords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
        if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return; }
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p.coords),
          (e) => reject(new Error(e.message || 'Could not get location')),
          { enableHighAccuracy: true, timeout: 10000 },
        );
      });
      const r = await api.post<ApiResponse<StaffAttendanceRecord>>(endpoints.staff.attendanceClockOut, {
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      toast.success(r.message ?? 'Clocked out');
      load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Clock-out failed');
    } finally {
      setActing(false);
    }
  };

  return { record, location, loading, acting, clockIn, clockOut, reload: load };
}

/* ── Staff: attendance history ────────────────────────────────────────── */
export function useStaffAttendanceHistory(month: number, year: number) {
  const [records, setRecords] = useState<StaffAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    api.get<ApiResponse<StaffAttendanceRecord[]>>(endpoints.staff.attendanceHistory, { month, year })
      .then((r) => setRecords(r.data ?? []))
      .catch(() => toast.error('Failed to load history'))
      .finally(() => setLoading(false));
  }, [month, year]);

  return { records, loading };
}

/* ── Admin: location management ───────────────────────────────────────── */
export function useAdminAttendanceLocation() {
  const [location, setLocation] = useState<AttendanceLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    api.get<ApiResponse<AttendanceLocation | null>>(endpoints.admin.attendanceLocation)
      .then((r) => setLocation(r.data))
      .catch(() => toast.error('Failed to load location'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (data: { name: string; latitude: number; longitude: number; radiusMeters: number; resumptionTime?: string }) => {
    setSaving(true);
    try {
      const r = await api.post<ApiResponse<AttendanceLocation>>(endpoints.admin.attendanceLocation, data);
      toast.success('Location saved');
      setLocation(r.data);
    } catch {
      toast.error('Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  return { location, loading, saving, save, reload: load };
}

/* ── Admin: attendance report ─────────────────────────────────────────── */
export function useAdminAttendanceReport(params: { date?: string; month?: number; year?: number }) {
  const [records, setRecords] = useState<StaffAttendanceReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    api.get<ApiResponse<StaffAttendanceReportItem[]>>(endpoints.admin.attendanceReport, params as any)
      .then((r) => setRecords(r.data ?? []))
      .catch(() => toast.error('Failed to load report'))
      .finally(() => setLoading(false));
  }, [params.date, params.month, params.year]);

  useEffect(() => { load(); }, [load]);

  const markAbsent = async (date?: string) => {
    try {
      const r = await api.post<ApiResponse<unknown>>(endpoints.admin.attendanceMarkAbsent, { date });
      toast.success((r as any).message ?? 'Marked absent');
      load();
    } catch {
      toast.error('Failed to mark absent');
    }
  };

  return { records, loading, markAbsent, reload: load };
}

/* ── Student: today status + clock in/out ─────────────────────────────── */
export function useStudentAttendance() {
  const [record, setRecord] = useState<StudentAttendanceRecord | null>(null);
  const [location, setLocation] = useState<AttendanceLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    api.get<ApiResponse<{ record: StudentAttendanceRecord | null; location: AttendanceLocation | null }>>(
      endpoints.student.attendanceToday,
    )
      .then((r) => { setRecord(r.data.record); setLocation(r.data.location); })
      .catch(() => toast.error('Failed to load attendance'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const clockIn = async (latitude: number, longitude: number) => {
    setActing(true);
    try {
      const r = await api.post<ApiResponse<StudentAttendanceRecord>>(endpoints.student.attendanceClockIn, { latitude, longitude });
      toast.success(r.message ?? 'Clocked in');
      load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Clock-in failed');
    } finally {
      setActing(false);
    }
  };

  const clockOut = async () => {
    setActing(true);
    try {
      const coords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
        if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return; }
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p.coords),
          (e) => reject(new Error(e.message || 'Could not get location')),
          { enableHighAccuracy: true, timeout: 10000 },
        );
      });
      const r = await api.post<ApiResponse<StudentAttendanceRecord>>(endpoints.student.attendanceClockOut, {
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      toast.success(r.message ?? 'Clocked out');
      load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Clock-out failed');
    } finally {
      setActing(false);
    }
  };

  return { record, location, loading, acting, clockIn, clockOut, reload: load };
}

/* ── Student: attendance history ──────────────────────────────────────── */
export function useStudentAttendanceHistory(month: number, year: number) {
  const [records, setRecords] = useState<StudentAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    api.get<ApiResponse<StudentAttendanceRecord[]>>(endpoints.student.attendanceHistory, { month, year })
      .then((r) => setRecords(r.data ?? []))
      .catch(() => toast.error('Failed to load history'))
      .finally(() => setLoading(false));
  }, [month, year]);

  return { records, loading };
}

/* ── Admin: student attendance report ─────────────────────────────────── */
export function useAdminStudentAttendanceReport(params: { date?: string; month?: number; year?: number; className?: string }) {
  const [records, setRecords] = useState<StudentAttendanceReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    api.get<ApiResponse<StudentAttendanceReportItem[]>>(endpoints.admin.attendanceStudentReport, params as any)
      .then((r) => setRecords(r.data ?? []))
      .catch(() => toast.error('Failed to load student report'))
      .finally(() => setLoading(false));
  }, [params.date, params.month, params.year, params.className]);

  useEffect(() => { load(); }, [load]);

  const markAbsent = async (date?: string) => {
    try {
      const r = await api.post<ApiResponse<unknown>>(endpoints.admin.attendanceMarkStudentsAbsent, { date });
      toast.success((r as any).message ?? 'Marked absent');
      load();
    } catch {
      toast.error('Failed to mark absent');
    }
  };

  return { records, loading, markAbsent, reload: load };
}
