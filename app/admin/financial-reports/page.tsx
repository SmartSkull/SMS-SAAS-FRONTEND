'use client';

import { useEffect, useState } from 'react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Loader2, ArrowUpCircle, ArrowDownCircle, DollarSign } from 'lucide-react';

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    api.get<{ success: boolean; data: any }>(endpoints.admin.financeReports)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load reports'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>;
  if (!data) return <div className="text-gray-500">Failed to load data</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
            <ArrowUpCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Income</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">₦{data.totalIncome?.toLocaleString() ?? 0}</h3>
            <p className="text-xs text-gray-400 mt-1">Fees: ₦{data.breakdown?.totalFeeIncome?.toLocaleString() ?? 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <ArrowDownCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Expenses</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">₦{data.totalExpense?.toLocaleString() ?? 0}</h3>
            <p className="text-xs text-gray-400 mt-1">Payroll: ₦{data.breakdown?.totalPayrollExpense?.toLocaleString() ?? 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-start gap-4">
          <div className={`p-3 rounded-xl ${data.netProfit >= 0 ? 'bg-purple-50 text-purple-600' : 'bg-red-50 text-red-600'}`}>
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Net Profit</p>
            <h3 className={`text-2xl font-bold mt-1 ${data.netProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              ₦{data.netProfit?.toLocaleString() ?? 0}
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
}
