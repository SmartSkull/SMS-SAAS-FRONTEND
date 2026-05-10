'use client';
import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, ChevronLeft, ChevronRight, Search, CreditCard } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import type { ApiResponse } from '@/types';
import { EmptyState } from '@/components/ui/StateDisplay';

interface Payment {
  id: number; student_id: string; student_name: string; amount: number;
  status: string; reference: string; description: string; created_at: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [schoolFees, setSchoolFees] = useState<Payment[]>([]);
  const [tab, setTab] = useState<'pending' | 'fees'>('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const limit = 20;

  const load = useCallback(() => {
    setLoading(true);
    if (tab === 'pending') {
      api.get<ApiResponse<{ payments: Payment[]; total: number }>>(`${endpoints.admin.payments}/pending`, { page, limit })
        .then((r) => { setPayments(r.data.payments ?? []); setTotal(r.data.total ?? 0); })
        .catch(() => toast.error('Failed to load payments'))
        .finally(() => setLoading(false));
    } else {
      api.get<ApiResponse<{ payments: Payment[]; total: number }>>(endpoints.admin.schoolFeesPayments, { page, limit })
        .then((r) => { setSchoolFees(r.data.payments ?? []); setTotal(r.data.total ?? 0); })
        .catch(() => toast.error('Failed to load school fees'))
        .finally(() => setLoading(false));
    }
  }, [tab, page]);

  useEffect(() => { load(); }, [load]);

  const verify = async (id: number) => {
    try {
      await api.post(`${endpoints.admin.payments}/${id}/verify`, {});
      toast.success('Payment verified'); load();
    } catch { toast.error('Failed to verify'); }
  };

  const data = tab === 'pending' ? payments : schoolFees;
  const filtered = data.filter((p) =>
    !search || `${p.student_name} ${p.student_id} ${p.reference}`.toLowerCase().includes(search.toLowerCase())
  );
  const pages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Payments</h1>

      <div className="flex gap-2">
        {(['pending', 'fees'] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm'}`}>
            {t === 'pending' ? 'Pending Payments' : 'School Fees'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl card shadow-sm p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payments..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
      </div>

      <div className="bg-white rounded-2xl card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-3 text-left font-medium text-gray-600">Student</th>
                <th className="p-3 text-left font-medium text-gray-600">Amount</th>
                <th className="p-3 text-left font-medium text-gray-600">Description</th>
                <th className="p-3 text-left font-medium text-gray-600">Reference</th>
                <th className="p-3 text-left font-medium text-gray-600">Date</th>
                <th className="p-3 text-left font-medium text-gray-600">Status</th>
                {tab === 'pending' && <th className="p-3 text-left font-medium text-gray-600">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="p-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7}><EmptyState icon={CreditCard} message="No payments found." card={false} /></td></tr>
              ) : filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <div className="font-medium text-gray-900">{p.student_name}</div>
                    <div className="text-gray-400 text-xs">{p.student_id}</div>
                  </td>
                  <td className="p-3 font-medium text-gray-900">₦{p.amount?.toLocaleString()}</td>
                  <td className="p-3 text-gray-600">{p.description}</td>
                  <td className="p-3 text-gray-500 text-xs font-mono">{p.reference}</td>
                  <td className="p-3 text-gray-500 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.status === 'verified' ? 'bg-blue-100 text-blue-700' :
                      p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>{p.status}</span>
                  </td>
                  {tab === 'pending' && (
                    <td className="p-3">
                      {p.status === 'pending' && (
                        <button onClick={() => verify(p.id)} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium">
                          <CheckCircle size={14} /> Verify
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
            <span>{total} total</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronLeft size={16} /></button>
              <span>Page {page} of {pages}</span>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
