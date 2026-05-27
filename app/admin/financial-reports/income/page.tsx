'use client';

import { useEffect, useState } from 'react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Loader2, Plus, ArrowUpCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

export default function IncomePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ amount: '', category: '', date: '', description: '', reference: '' });
  const toast = useToast();

  const loadData = () => {
    setLoading(true);
    api.get<{ success: boolean; data: any }>(endpoints.admin.financeIncome)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load income'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(endpoints.admin.financeIncome, {
        ...form, amount: Number(form.amount)
      });
      toast.success('Income recorded');
      setShowModal(false);
      setForm({ amount: '', category: '', date: '', description: '', reference: '' });
      loadData();
    } catch {
      toast.error('Failed to record income');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>;

  const allIncomes = [
    ...(data?.manual || []).map((i: any) => ({ ...i, source: 'Manual', date: i.date })),
    ...(data?.fees || []).map((f: any) => ({ 
      id: `fee-${f.id}`, amount: f.amount, source: 'School Fee', date: f.paidAt, category: 'School Fees', 
      description: `${f.student?.user?.firstName} ${f.student?.user?.lastName} - ${f.session?.name} ${f.term?.name}` 
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Income Records</h2>
        <button onClick={() => setShowModal(true)} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm">
          <Plus className="w-4 h-4" /> Add Income
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
            {allIncomes.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">No income records found</td></tr>
            ) : allIncomes.map((inc: any, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="p-3 text-gray-500">{new Date(inc.date).toLocaleDateString()}</td>
                <td className="p-3"><span className="px-2 py-0.5 bg-gray-100 rounded-lg text-xs">{inc.source}</span></td>
                <td className="p-3 text-gray-900 font-medium">{inc.category}</td>
                <td className="p-3 text-gray-500 max-w-xs truncate">{inc.description}</td>
                <td className="p-3 text-right font-medium text-green-600">+₦{Number(inc.amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record Manual Income">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦)</label>
            <input type="number" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="input-field w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input type="text" required value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g. Donation, Sales" className="input-field w-full" />
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
            {submitting ? 'Saving...' : 'Save Income'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
