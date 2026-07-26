'use client';
import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, Search, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useSchoolData } from '@/hooks/useSchoolData';
import { EmptyState } from '@/components/ui/StateDisplay';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Payment {
  id: number; student_id: string; firstname: string; lastname: string;
  amount: number; status: string; reference: string; createdAt: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tab, setTab] = useState<'all' | 'pending'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  const [termFilter, setTermFilter] = useState('');
  const toast = useToast();
  const { classes, sessions, terms } = useSchoolData();

  const [summary, setSummary] = useState<{ class: string; paid_count: number; unpaid_count: number; total_amount: number }[]>([]);

  const loadSummary = useCallback(() => {
    api.get<any>(endpoints.admin.schoolFeesPaymentsSummary, {
      session: sessionFilter || undefined,
      term: termFilter || undefined,
    }).then((r) => setSummary(r.data?.classes ?? [])).catch(() => toast.error('Failed to load payments summary'));
  }, [sessionFilter, termFilter]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const load = useCallback(() => {
    setLoading(true);
    if (tab === 'pending') {
      api.get<any>(endpoints.admin.paymentsPending)
        .then((r) => { setPayments(r.data ?? []); setMeta({ total: r.data?.length ?? 0, last_page: 1 }); })
        .catch(() => toast.error('Failed to load'))
        .finally(() => setLoading(false));
    } else {
      api.get<any>(endpoints.admin.payments, { 
        page,
        class: classFilter || undefined,
        session: sessionFilter || undefined,
        term: termFilter || undefined,
      })
        .then((r) => { setPayments(r.data ?? []); setMeta(r.meta ?? { total: 0, last_page: 1 }); })
        .catch(() => toast.error('Failed to load'))
        .finally(() => setLoading(false));
    }
  }, [tab, page, classFilter, sessionFilter, termFilter]);

  useEffect(() => { load(); }, [load]);

  const verify = async (id: number) => {
    try { await api.post(`${endpoints.admin.payments}/${id}/verify`, {}); toast.success('Verified'); load(); }
    catch { toast.error('Failed to verify'); }
  };

  const filtered = payments.filter((p) =>
    !search || `${p.firstname} ${p.lastname} ${p.student_id} ${p.reference}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Payments <span className="text-gray-400 font-normal text-lg">({meta.total})</span></h1>

      <div className="flex gap-2">
        {(['all', 'pending'] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm'}`}>
            {t === 'all' ? 'All Payments' : 'Pending'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl card shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payments..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <select value={classFilter} onChange={e => { setClassFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500">
          <option value="">All Classes</option>
          {classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sessionFilter} onChange={e => { setSessionFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500">
          <option value="">All Sessions</option>
          {sessions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={termFilter} onChange={e => { setTermFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500">
          <option value="">All Terms</option>
          {terms.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      </div>

      {summary.length > 0 && (() => {
        const totalPaid    = summary.reduce((s, c) => s + (c.paid_count ?? 0), 0);
        const totalUnpaid  = summary.reduce((s, c) => s + (c.unpaid_count ?? 0), 0);
        const totalAmount  = summary.reduce((s, c) => s + Number(c.total_amount ?? 0), 0);
        const totalStudents = totalPaid + totalUnpaid;
        const paidPct = totalStudents > 0 ? Math.round((totalPaid / totalStudents) * 100) : 0;

        return (
          <>
            {/* ── Summary cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white rounded-2xl card shadow-sm border border-gray-100 p-4">
                <p className="text-xs font-medium text-gray-500 uppercase">Total Collected</p>
                <p className="mt-1 text-2xl font-bold text-green-700">₦{totalAmount.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-0.5">across all classes</p>
              </div>
              <div className="bg-white rounded-2xl card shadow-sm border border-gray-100 p-4">
                <p className="text-xs font-medium text-gray-500 uppercase">Paid</p>
                <p className="mt-1 text-2xl font-bold text-purple-700">{totalPaid.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-0.5">{paidPct}% of students</p>
              </div>
              <div className="bg-white rounded-2xl card shadow-sm border border-gray-100 p-4">
                <p className="text-xs font-medium text-gray-500 uppercase">Outstanding</p>
                <p className="mt-1 text-2xl font-bold text-yellow-600">{totalUnpaid.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-0.5">yet to pay</p>
              </div>
              <div className="bg-white rounded-2xl card shadow-sm border border-gray-100 p-4">
                <p className="text-xs font-medium text-gray-500 uppercase">Collection Rate</p>
                <p className="mt-1 text-2xl font-bold text-blue-700">{paidPct}%</p>
                <div className="mt-1.5 w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${paidPct}%` }} />
                </div>
              </div>
            </div>

            {/* ── Per-class breakdown table ── */}
            <div className="bg-white rounded-2xl card shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 pb-3">
                <h2 className="font-semibold text-gray-900">Breakdown by Class</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Class</th>
                      <th className="p-3 text-right text-xs font-semibold text-gray-500 uppercase">Paid</th>
                      <th className="p-3 text-right text-xs font-semibold text-gray-500 uppercase">Unpaid</th>
                      <th className="p-3 text-right text-xs font-semibold text-gray-500 uppercase">Total Collected</th>
                      <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {summary.map((row) => {
                      const total = (row.paid_count ?? 0) + (row.unpaid_count ?? 0);
                      const pct   = total > 0 ? Math.round(((row.paid_count ?? 0) / total) * 100) : 0;
                      return (
                        <tr key={row.class} className="hover:bg-gray-50">
                          <td className="p-3 font-medium text-gray-900">{row.class}</td>
                          <td className="p-3 text-right text-green-700 font-semibold">{row.paid_count ?? 0}</td>
                          <td className="p-3 text-right text-yellow-600 font-semibold">{row.unpaid_count ?? 0}</td>
                          <td className="p-3 text-right font-bold text-gray-900">₦{Number(row.total_amount ?? 0).toLocaleString()}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2 min-w-[90px]">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-gray-500 w-9 text-right">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                    <tr>
                      <td className="p-3 font-bold text-gray-700">Total</td>
                      <td className="p-3 text-right font-bold text-green-700">{totalPaid}</td>
                      <td className="p-3 text-right font-bold text-yellow-600">{totalUnpaid}</td>
                      <td className="p-3 text-right font-bold text-gray-900">₦{totalAmount.toLocaleString()}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 min-w-[90px]">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${paidPct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-9 text-right">{paidPct}%</span>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* ── Bar chart ── */}
            <div className="bg-white rounded-2xl card shadow-sm border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Payments by Class</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={summary} margin={{ top: 4, right: 8, left: -16, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="class" tick={{ fontSize: 9, fill: '#6b7280' }} angle={-45} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 13 }}
                    cursor={{ fill: '#f3f4f6' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar dataKey="paid_count" name="Paid" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="unpaid_count" name="Unpaid" fill="#e5e7eb" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        );
      })()}

      <div className="bg-white rounded-2xl card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-3 text-left font-medium text-gray-600">Student</th>
                <th className="p-3 text-left font-medium text-gray-600">Amount</th>
                <th className="p-3 text-left font-medium text-gray-600">Reference</th>
                <th className="p-3 text-left font-medium text-gray-600">Date</th>
                <th className="p-3 text-left font-medium text-gray-600">Status</th>
                <th className="p-3 text-left font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="p-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6}><EmptyState icon={CreditCard} message="No payments found." card={false} /></td></tr>
              ) : filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <div className="font-medium text-gray-900">{p.firstname} {p.lastname}</div>
                    <div className="text-gray-400 text-xs">{p.student_id}</div>
                  </td>
                  <td className="p-3 font-medium text-gray-900">₦{Number(p.amount)?.toLocaleString()}</td>
                  <td className="p-3 text-gray-500 text-xs font-mono truncate max-w-[160px]">{p.reference}</td>
                  <td className="p-3 text-gray-500 text-xs">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.status === 'SUCCESS' ? 'bg-blue-100 text-blue-700' :
                      p.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>{p.status}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {p.status === 'PENDING' && (
                        <button onClick={() => verify(p.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors">
                          <CheckCircle size={13} /> Verify
                        </button>
                      )}
                      {p.status === 'SUCCESS' && (
                        <span className="flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-semibold">
                          <CheckCircle size={12} /> Verified
                        </span>
                      )}
                      {p.status === 'FAILED' && (
                        <span className="px-2.5 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-semibold">Failed</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {meta.last_page > 1 && tab === 'all' && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
            <span>{meta.total} total · page {page} of {meta.last_page}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
