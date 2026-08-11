'use client';
import { BadgeCheck, CalendarDays, FileText, TrendingUp, Wallet } from 'lucide-react';
import { useMyPayslips } from '@/hooks/payroll';
import { Skeleton } from '@/components/ui/Skeleton';

const money = (n: number) => `₦${Number(n || 0).toLocaleString()}`;
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const statusStyles: Record<string, string> = {
  PAID: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  DRAFT: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  PROCESSING: 'bg-blue-50 text-blue-700 ring-blue-600/20',
};

export default function StaffPayrollPage() {
  const { payslips, loading, error } = useMyPayslips();
  const latest = payslips[0];

  const totalAllowances = latest ? latest.housingAllowance + latest.transportAllowance + latest.otherAllowance : 0;
  const totalDeductions = latest ? latest.taxAmount + latest.pensionAmount + latest.deductions : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
        <p className="mt-1 text-sm text-gray-500">View your generated payslips and salary breakdowns</p>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-5 text-white shadow-lg shadow-blue-600/20">
          <div className="flex items-center justify-between">
            <p className="text-sm text-blue-100">Latest Net Pay</p>
            <div className="rounded-xl bg-white/15 p-2"><Wallet className="h-4 w-4" /></div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight">{latest ? money(latest.netPay) : '—'}</p>
          {latest && <p className="mt-1 text-xs text-blue-200">{months[latest.month - 1]} {latest.year}</p>}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Latest Gross</p>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600"><TrendingUp className="h-4 w-4" /></div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-gray-900">{latest ? money(latest.grossPay) : '—'}</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Total Deductions</p>
            <div className="rounded-xl bg-rose-50 p-2 text-rose-600"><FileText className="h-4 w-4" /></div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-gray-900">{latest ? money(totalDeductions) : '—'}</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Payslips Issued</p>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600"><BadgeCheck className="h-4 w-4" /></div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-gray-900">{payslips.length}</p>
        </div>
      </div>

      {/* Latest payslip breakdown */}
      {latest && (
        <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5">
            <div>
              <h2 className="font-semibold text-gray-900">Latest Payslip</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                {months[latest.month - 1]} {latest.year}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusStyles[latest.status] ?? 'bg-gray-50 text-gray-600 ring-gray-600/20'}`}>
              {latest.status}
            </span>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500">Basic Salary</p>
              <p className="mt-1.5 text-lg font-bold text-gray-900">{money(latest.basicSalary)}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500">Allowances</p>
              <p className="mt-1.5 text-lg font-bold text-gray-900">{money(totalAllowances)}</p>
              <div className="mt-2 space-y-1 text-[11px] text-gray-500">
                <p>Housing · {money(latest.housingAllowance)}</p>
                <p>Transport · {money(latest.transportAllowance)}</p>
                <p>Other · {money(latest.otherAllowance)}</p>
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500">Deductions</p>
              <p className="mt-1.5 text-lg font-bold text-gray-900">{money(totalDeductions)}</p>
              <div className="mt-2 space-y-1 text-[11px] text-gray-500">
                <p>Tax · {money(latest.taxAmount)}</p>
                <p>Pension · {money(latest.pensionAmount)}</p>
                <p>Other · {money(latest.deductions)}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-b-2xl bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
            <p className="text-sm font-semibold text-gray-700">Net Pay</p>
            <p className="text-2xl font-black text-blue-700">{money(latest.netPay)}</p>
          </div>
        </section>
      )}

      {/* Payslip history */}
      <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900">Payslip History</h2>
          <p className="mt-0.5 text-sm text-gray-500">All payslips issued to you</p>
        </div>
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : payslips.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-400">No payslips have been issued yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {payslips.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-5 transition-colors hover:bg-gray-50/60">
                <div>
                  <p className="font-semibold text-gray-900">{months[p.month - 1]} {p.year}</p>
                  <p className="mt-0.5 text-xs text-gray-500">Generated {new Date(p.generatedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{money(p.netPay)}</p>
                    <p className="text-[11px] text-gray-400">net pay</p>
                  </div>
                  <span className={`min-w-[90px] rounded-full px-3 py-1 text-center text-xs font-semibold ring-1 ${statusStyles[p.status] ?? 'bg-gray-50 text-gray-600 ring-gray-600/20'}`}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
