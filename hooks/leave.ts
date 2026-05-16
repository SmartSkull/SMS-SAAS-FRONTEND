'use client';
import { useState, useEffect, useCallback } from 'react';
import { api, endpoints, getImageUrl } from '@/lib/api';
import type { ApiResponse, LeaveRequest, LeaveRequestWithStaff, LeaveBalance } from '@/types';

// ── Staff: own leaves ──────────────────────────────────────────────────────
export function useMyLeaves() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<LeaveRequest[]>>(endpoints.staff.leaveMyLeaves);
      setLeaves(res.data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { leaves, loading, reload: load };
}

// ── Staff: leave balance ───────────────────────────────────────────────────
export function useLeaveBalance() {
  const [balance, setBalance] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ApiResponse<LeaveBalance[]>>(endpoints.staff.leaveBalance)
      .then((r) => setBalance(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { balance, loading };
}

// ── Staff: request leave ───────────────────────────────────────────────────
export function useRequestLeave(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = useCallback(async (formData: FormData) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.upload<ApiResponse<LeaveRequest>>(endpoints.staff.leaveRequest, formData);
      setSuccess(res.message ?? 'Leave request submitted');
      onSuccess?.();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  }, [onSuccess]);

  return { submit, loading, error, success };
}

// ── Admin: all leaves ──────────────────────────────────────────────────────
export function useAdminLeaves(status?: string) {
  const [leaves, setLeaves] = useState<LeaveRequestWithStaff[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (status) params.status = status;
      const res = await api.get<ApiResponse<LeaveRequestWithStaff[]>>(endpoints.admin.leaveAll, params);
      setLeaves(res.data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [status]);

  useEffect(() => { load(); }, [load]);
  return { leaves, loading, reload: load };
}

// ── Admin: review leave ────────────────────────────────────────────────────
export function useReviewLeave(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const review = useCallback(async (id: string, status: 'APPROVED' | 'REJECTED', adminNote?: string) => {
    setLoading(true);
    setError('');
    try {
      await api.put(endpoints.admin.leaveReview(id), { status, adminNote });
      onSuccess?.();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to review leave');
    } finally {
      setLoading(false);
    }
  }, [onSuccess]);

  return { review, loading, error };
}

// ── Admin: staff balance ───────────────────────────────────────────────────
export function useStaffLeaveBalance(staffId: string | null) {
  const [balance, setBalance] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!staffId) return;
    setLoading(true);
    api.get<ApiResponse<LeaveBalance[]>>(endpoints.admin.leaveStaffBalance(staffId))
      .then((r) => setBalance(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [staffId]);

  return { balance, loading };
}


// ── Admin: entitlements ────────────────────────────────────────────────────
export function useLeaveEntitlements() {
  const [entitlements, setEntitlements] = useState<{ type: string; days: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<{ type: string; days: number }[]>>(endpoints.admin.leaveEntitlements);
      setEntitlements(res.data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (type: string, days: number) => {
    setSaving(true);
    setError('');
    try {
      await api.put(endpoints.admin.leaveEntitlements, { type, days });
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [load]);

  return { entitlements, loading, saving, error, save };
}
