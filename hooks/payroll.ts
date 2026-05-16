'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, endpoints } from '@/lib/api';
import type { ApiResponse, PayrollDeduction, PayrollStatus, Payslip, StaffSalarySetup } from '@/types';

export function useAdminPayroll() {
  const [salarySetups, setSalarySetups] = useState<StaffSalarySetup[]>([]);
  const [deductions, setDeductions] = useState<PayrollDeduction[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (period?: { month?: number; year?: number }) => {
    setLoading(true);
    setError('');
    try {
      const [salaryRes, deductionRes, payslipRes] = await Promise.all([
        api.get<ApiResponse<StaffSalarySetup[]>>(endpoints.admin.payrollSalarySetups),
        api.get<ApiResponse<PayrollDeduction[]>>(endpoints.admin.payrollDeductions, period ?? {}),
        api.get<ApiResponse<Payslip[]>>(endpoints.admin.payrollPayslips, period ?? {}),
      ]);
      setSalarySetups(salaryRes.data ?? []);
      setDeductions(deductionRes.data ?? []);
      setPayslips(payslipRes.data ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load payroll');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveSalary = useCallback(async (staffId: string, payload: Record<string, unknown>) => {
    setSaving(true);
    setError('');
    try {
      await api.put(endpoints.admin.payrollSalarySetup(staffId), payload);
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save salary setup');
      throw e;
    } finally {
      setSaving(false);
    }
  }, [load]);

  const addDeduction = useCallback(async (payload: Record<string, unknown>) => {
    setSaving(true);
    setError('');
    try {
      await api.post(endpoints.admin.payrollDeductions, payload);
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to add deduction');
      throw e;
    } finally {
      setSaving(false);
    }
  }, [load]);

  const deleteDeduction = useCallback(async (id: string) => {
    await api.delete(endpoints.admin.payrollDeduction(id));
    await load();
  }, [load]);

  const runPayroll = useCallback(async (payload: { month: number; year: number; staffId?: string }) => {
    setSaving(true);
    setError('');
    try {
      await api.post(endpoints.admin.payrollRun, payload);
      await load({ month: payload.month, year: payload.year });
    } catch (e: any) {
      setError(e?.message ?? 'Failed to run payroll');
      throw e;
    } finally {
      setSaving(false);
    }
  }, [load]);

  const updateStatus = useCallback(async (id: string, status: PayrollStatus) => {
    await api.put(endpoints.admin.payrollPayslipStatus(id), { status });
    await load();
  }, [load]);

  return {
    salarySetups,
    deductions,
    payslips,
    loading,
    saving,
    error,
    reload: load,
    saveSalary,
    addDeduction,
    deleteDeduction,
    runPayroll,
    updateStatus,
  };
}

export function useMyPayslips() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<Payslip[]>>(endpoints.staff.payrollPayslips);
      setPayslips(res.data ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load payslips');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { payslips, loading, error, reload: load };
}
