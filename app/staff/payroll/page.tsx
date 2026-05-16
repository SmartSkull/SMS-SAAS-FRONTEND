'use client';
import { FileText, Wallet } from 'lucide-react';
import { useMyPayslips } from '@/hooks/payroll';
import { Skeleton } from '@/components/ui/Skeleton';

const money = (n: number) => `NGN ${Number(n || 0).toLocaleString()}`;
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function StaffPayrollPage() {
  const { payslips, loading, error } = useMyPayslips();
  const latest = payslips[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
        <p className="mt-1 text-sm text-gray-500">View your generated payslips and salary breakdowns</p>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500"><Wallet className="h-4 w-4" /> Latest Net Pay</div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{latest ? money(latest.netPay) : money(0)}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500"><FileText className="h-4 w-4" /> Latest Gross</div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{latest ? money(latest.grossPay) : money(0)}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500"><FileText className="h-4 w-4" /> Payslips</div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{payslips.length}</p>
        </div>
      </div>

      <section className="rounded-2xl border bg-white shadow-sm">
        <div className="border-b p-4">
          <h2 className="font-semibold text-gray-900">Payslip History</h2>
        </div>
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : payslips.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">No payslips have been issued yet.</div>
        ) : (
          <div className="divide-y">
            {payslips.map((p) => (
              <div key={p.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{months[p.month - 1]} {p.year}</p>
                    <p className="text-xs text-gray-500">Generated {new Date(p.generatedAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                    p.status === 'PAID' ? 'bg-green-100 text-green-700' : p.status === 'DRAFT' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'
                  }`}>{p.status}</span>
                </div>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Basic Salary</p>
                    <p className="font-semibold text-gray-900">{money(p.basicSalary)}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Allowances</p>
                    <p className="font-semibold text-gray-900">{money(p.housingAllowance + p.transportAllowance + p.otherAllowance)}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Deductions</p>
                    <p className="font-semibold text-gray-900">{money(p.taxAmount + p.pensionAmount + p.deductions)}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Net Pay</p>
                    <p className="font-semibold text-gray-900">{money(p.netPay)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
