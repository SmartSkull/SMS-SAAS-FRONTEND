'use client';

import { useEffect, useState } from 'react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Loader2, Plus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

export default function ExpensesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ amount: '', category: '', date: '', description: '', reference: '' });
  const toast = useToast();

  const loadData = () => {
    setLoading(true);
    api.get<{ success: boolean; data: any }>(endpoints.admin.financeExpenses)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load expenses'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(endpoints.admin.financeExpenses, {
        ...form, amount: Number(form.amount)
      });
      toast.success('Expense recorded');
      setShowModal(false);
      setForm({ amount: '', category: '', date: '', description: '', reference: '' });
      loadData();
    } catch {
      toast.error('Failed to record expense');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>;

  const allExpenses = [
    ...(data?.manual || []).map((e: any) => ({ ...e, source: 'Manual', date: e.date })),
    ...(data?.payroll || []).map((p: any) => ({ 
      id: `payroll-${p.id}`, amount: p.netPay, source: 'Payroll', date: p.generatedAt, category: 'Staff Salary', 
      description: `${p.staff?.user?.firstName} ${p.staff?.user?.lastName} - ${p.month}/${p.year}` 
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Expense Records</h2>
        <button onClick={() => setShowModal(true)} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm">
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-3 text-left font-medium text-gray-500">Date</th>
              <th className="p-3 text-left font-medium text-gray-500">Source</th>
              <th className="p-3 text-left font-medium text-gray-500">Category</th>
              <th className="p-3 text-left font-medium text-gray-500">Description</th>
              <th className="p-3 text-right font-medium text-gray-500">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {allExpenses.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">No expense records found</td></tr>
            ) : allExpenses.map((exp: any, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="p-3 text-gray-500">{new Date(exp.date).toLocaleDateString()}</td>
                <td className="p-3"><span className="px-2 py-0.5 bg-gray-100 rounded-lg text-xs">{exp.source}</span></td>
                <td className="p-3 text-gray-900 font-medium">{exp.category}</td>
                <td className="p-3 text-gray-500 max-w-xs truncate">{exp.description}</td>
                <td className="p-3 text-right font-medium text-red-600">-₦{Number(exp.amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record Manual Expense">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦)</label>
            <input type="number" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="input-field w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input type="text" required value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g. Maintenance, Supplies" className="input-field w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="input-field w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input-field w-full" rows={3}></textarea>
          </div>
          <button type="submit" disabled={submitting} className="w-full btn-brand py-2 rounded-xl text-white font-medium">
            {submitting ? 'Saving...' : 'Save Expense'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
