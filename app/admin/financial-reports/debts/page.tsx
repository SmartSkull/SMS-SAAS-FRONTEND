'use client';

import { useEffect, useState } from 'react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Loader2 } from 'lucide-react';

export default function DebtsPage() {
  const [debts, setDebts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    api.get<{ success: boolean; data: any[] }>(endpoints.admin.financeDebts)
      .then(r => setDebts(r.data))
      .catch(() => toast.error('Failed to load outstanding debts'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>;

  const totalDebt = debts.reduce((sum, d) => sum + Number(d.balance), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Outstanding Debts</h2>
        <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold">
          Total Unpaid: ₦{totalDebt.toLocaleString()}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-3 text-left font-medium text-gray-500">Student</th>
              <th className="p-3 text-left font-medium text-gray-500">Class</th>
              <th className="p-3 text-left font-medium text-gray-500">Session/Term</th>
              <th className="p-3 text-right font-medium text-gray-500">Billed</th>
              <th className="p-3 text-right font-medium text-gray-500">Paid</th>
              <th className="p-3 text-right font-medium text-gray-500">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {debts.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">No outstanding debts found</td></tr>
            ) : debts.map((d: any, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="p-3">
                  <div className="font-medium text-gray-900">{d.student?.firstName} {d.student?.lastName}</div>
                  <div className="text-xs text-gray-500">{d.student?.studentNo}</div>
                </td>
                <td className="p-3 text-gray-600">{d.classRoom?.name}</td>
                <td className="p-3 text-gray-600">{d.session?.name} - {d.term?.name}</td>
                <td className="p-3 text-right text-gray-600">₦{Number(d.amountBilled).toLocaleString()}</td>
                <td className="p-3 text-right text-green-600">₦{Number(d.amountPaid).toLocaleString()}</td>
                <td className="p-3 text-right font-medium text-red-600">₦{Number(d.balance).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
