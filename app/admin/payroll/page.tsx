'use client';
import { useAdminPayroll } from '@/hooks/payroll';
import type { StaffSalarySetup } from '@/types';
import { Calculator, FileText, Plus, Save, Trash2, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const money = (n: number) => `NGN ${Number(n || 0).toLocaleString()}`;
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function currentPeriod() {
  const d = new Date();
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

function SalaryRow({
  staff,
  onSave,
  saving,
}: {
  staff: StaffSalarySetup;
  onSave: (staffId: string, form: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    basicSalary: staff.setup?.basicSalary ?? 0,
    housingAllowance: staff.setup?.housingAllowance ?? 0,
    transportAllowance: staff.setup?.transportAllowance ?? 0,
    otherAllowance: staff.setup?.otherAllowance ?? 0,
    taxRate: staff.setup?.taxRate ?? 0,
    pensionRate: staff.setup?.pensionRate ?? 0,
    effectiveFrom: staff.setup?.effectiveFrom ? staff.setup.effectiveFrom.slice(0, 10) : new Date().toISOString().slice(0, 10),
  });

  const gross = Number(form.basicSalary) + Number(form.housingAllowance) + Number(form.transportAllowance) + Number(form.otherAllowance);
  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: key === 'effectiveFrom' ? value : Number(value) }));

  return (
    <tr className="align-top hover:bg-gray-50">
      <td className="p-3">
        <div className="font-medium text-gray-900">{staff.name}</div>
        <div className="text-xs text-gray-400">{staff.staffNo}</div>
      </td>
      {(['basicSalary', 'housingAllowance', 'transportAllowance', 'otherAllowance', 'taxRate', 'pensionRate'] as const).map((key) => (
        <td key={key} className="p-2">
          <input
            type="number"
            min={0}
            step="0.01"
            value={form[key]}
            onChange={(e) => set(key, e.target.value)}
            className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </td>
      ))}
      <td className="p-3 text-sm font-semibold text-gray-900 whitespace-nowrap">{money(gross)}</td>
      <td className="p-2">
        <button
          onClick={() => onSave(staff.staffId, form)}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          style={{ background: 'var(--brand)' }}
        >
          <Save className="h-3.5 w-3.5" /> Save
        </button>
      </td>
    </tr>
  );
}

export default function AdminPayrollPage() {
  const payroll = useAdminPayroll();
  const { reload } = payroll;
  const [period, setPeriod] = useState(currentPeriod());
  const [deduction, setDeduction] = useState({
    title: '',
    amount: 0,
    staffId: '',
    recurring: false,
    note: '',
  });
  // Increment after each save to force SalaryRow to remount and reset its form
  const [saveSeq, setSaveSeq] = useState(0);

  const totals = useMemo(() => payroll.payslips.reduce((acc, p) => ({
    gross: acc.gross + p.grossPay,
    deductions: acc.deductions + p.taxAmount + p.pensionAmount + p.deductions,
    net: acc.net + p.netPay,
  }), { gross: 0, deductions: 0, net: 0 }), [payroll.payslips]);

  useEffect(() => {
    reload(period);
  }, [period.month, period.year, reload]);

  const handleSaveSalary = async (staffId: string, form: Record<string, unknown>) => {
    await payroll.saveSalary(staffId, form);
    setSaveSeq((s) => s + 1);
  };

  const submitDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    await payroll.addDeduction({
      ...deduction,
      staffId: deduction.staffId || undefined,
      month: period.month,
      year: period.year,
    });
    setDeduction({ title: '', amount: 0, staffId: '', recurring: false, note: '' });
  };

  if (payroll.loading) {
    return (
      <div className="space-y-6 skeleton-stagger">
        {/* Header skeleton */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="shimmer h-8 w-48" />
            <div className="shimmer h-4 w-72 mt-2" />
          </div>
          <div className="flex items-center gap-2">
            <div className="shimmer h-10 w-20" />
            <div className="shimmer h-10 w-24" />
            <div className="shimmer h-10 w-40" />
          </div>
        </div>

        {/* Stats cards skeleton */}
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="shimmer h-4 w-24" />
              <div className="shimmer h-8 w-32 mt-4" />
            </div>
          ))}
        </div>

        {/* Salary Setup table skeleton */}
        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b p-4">
            <div className="shimmer h-6 w-40" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {[...Array(9)].map((_, i) => (
                    <th key={i} className="p-3">
                      <div className="shimmer h-4 w-16" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...Array(4)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(9)].map((_, j) => (
                      <td key={j} className="p-3">
                        <div className="shimmer h-8 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Deductions and Payslips skeleton */}
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          {/* Deductions skeleton */}
          <section className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="shimmer h-6 w-24" />
            <div className="mt-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="shimmer h-10 w-full" />
              ))}
            </div>
          </section>

          {/* Payslips table skeleton */}
          <section className="rounded-2xl border bg-white shadow-sm">
            <div className="border-b p-4">
              <div className="shimmer h-6 w-28" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {[...Array(6)].map((_, i) => (
                      <th key={i} className="p-3">
                        <div className="shimmer h-4 w-16" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[...Array(4)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(6)].map((_, j) => (
                        <td key={j} className="p-3">
                          <div className="shimmer h-8 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
          <p className="mt-1 text-sm text-gray-500">Salary setup, deductions, payslips, and automatic salary calculation</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period.month}
            onChange={(e) => setPeriod((p) => ({ ...p, month: Number(e.target.value) }))}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <input
            type="number"
            value={period.year}
            onChange={(e) => setPeriod((p) => ({ ...p, year: Number(e.target.value) }))}
            className="w-24 rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <button
            onClick={() => payroll.runPayroll(period)}
            disabled={payroll.saving}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--brand)' }}
          >
            <Calculator className="h-4 w-4" /> Auto-calculate
          </button>
        </div>
      </div>

      {payroll.error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{payroll.error}</div>}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500"><Wallet className="h-4 w-4" /> Gross Pay</div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{money(totals.gross)}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500"><Trash2 className="h-4 w-4" /> Deductions</div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{money(totals.deductions)}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500"><FileText className="h-4 w-4" /> Net Pay</div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{money(totals.net)}</p>
        </div>
      </div>

      <section className="rounded-2xl border bg-white shadow-sm">
        <div className="border-b p-4">
          <h2 className="font-semibold text-gray-900">Salary Setup</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
              <tr>
                <th className="p-3">Staff</th>
                <th className="p-3">Basic</th>
                <th className="p-3">Housing</th>
                <th className="p-3">Transport</th>
                <th className="p-3">Other</th>
                <th className="p-3">Tax %</th>
                <th className="p-3">Pension %</th>
                <th className="p-3">Gross</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payroll.salarySetups.map((staff) => (
                <SalaryRow key={`${staff.staffId}-${saveSeq}`} staff={staff} onSave={handleSaveSalary} saving={payroll.saving} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-gray-900">Deductions</h2>
          <form onSubmit={submitDeduction} className="mt-4 space-y-3">
            <input value={deduction.title} onChange={(e) => setDeduction((d) => ({ ...d, title: e.target.value }))} placeholder="Deduction title" className="w-full rounded-xl border px-3 py-2 text-sm" required />
            <input type="number" min={0} step="0.01" value={deduction.amount} onChange={(e) => setDeduction((d) => ({ ...d, amount: Number(e.target.value) }))} placeholder="Amount" className="w-full rounded-xl border px-3 py-2 text-sm" required />
            <select value={deduction.staffId} onChange={(e) => setDeduction((d) => ({ ...d, staffId: e.target.value }))} className="w-full rounded-xl border px-3 py-2 text-sm">
              <option value="">All staff</option>
              {payroll.salarySetups.map((s) => <option key={s.staffId} value={s.staffId}>{s.name}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={deduction.recurring} onChange={(e) => setDeduction((d) => ({ ...d, recurring: e.target.checked }))} />
              Recurring every month
            </label>
            <input value={deduction.note} onChange={(e) => setDeduction((d) => ({ ...d, note: e.target.value }))} placeholder="Note" className="w-full rounded-xl border px-3 py-2 text-sm" />
            <button disabled={payroll.saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ background: 'var(--brand)' }}>
              <Plus className="h-4 w-4" /> Add Deduction
            </button>
          </form>
        </section>

        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b p-4">
            <h2 className="font-semibold text-gray-900">Payslips</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
                <tr>
                  <th className="p-3">Staff</th>
                  <th className="p-3">Period</th>
                  <th className="p-3">Gross</th>
                  <th className="p-3">Deductions</th>
                  <th className="p-3">Net Pay</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payroll.payslips.length === 0 ? (
                  <tr><td colSpan={6} className="p-6 text-center text-sm text-gray-400">No payslips generated for this period.</td></tr>
                ) : payroll.payslips.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="p-3"><div className="font-medium text-gray-900">{p.staffName}</div><div className="text-xs text-gray-400">{p.staffNo}</div></td>
                    <td className="p-3 text-gray-600">{months[p.month - 1]} {p.year}</td>
                    <td className="p-3">{money(p.grossPay)}</td>
                    <td className="p-3">{money(p.taxAmount + p.pensionAmount + p.deductions)}</td>
                    <td className="p-3 font-semibold text-gray-900">{money(p.netPay)}</td>
                    <td className="p-3">
                      <select value={p.status} onChange={(e) => payroll.updateStatus(p.id, e.target.value as any)} className="rounded-lg border px-2 py-1 text-xs">
                        <option value="ISSUED">ISSUED</option>
                        <option value="PAID">PAID</option>
                        <option value="DRAFT">DRAFT</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {payroll.deductions.length > 0 && (
        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b p-4">
            <h2 className="font-semibold text-gray-900">Active Deductions</h2>
          </div>
          <div className="divide-y">
            {payroll.deductions.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <p className="font-medium text-gray-900">{d.title} <span className="text-gray-400">- {d.staffName}</span></p>
                  <p className="text-xs text-gray-500">{d.recurring ? 'Recurring' : `${months[(d.month ?? 1) - 1]} ${d.year}`} {d.note ? `- ${d.note}` : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900">{money(d.amount)}</span>
                  <button onClick={() => payroll.deleteDeduction(d.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" title="Delete deduction">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
