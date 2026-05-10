'use client';
import { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Edit2, Trash2, CheckCircle, ChevronLeft, ChevronRight, X, UserCog } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/StateDisplay';

interface StaffMember {
  staff_id: string; unique_id: string; firstname: string; lastname: string;
  email: string; telephone: string; image: string; admin_verify: string; role: string;
}
interface Meta { total: number; page: number; per_page: number; }

const EMPTY = { firstname: '', lastname: '', email: '', telephone: '', subject: '', class: '', password: '' };

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, per_page: 20 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; member?: StaffMember }>({ open: false });
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    api.get<{ success: boolean; data: StaffMember[]; meta: Meta }>(endpoints.admin.staff, { page, search: search || undefined })
      .then((r) => { setStaff(r.data ?? []); setMeta(r.meta); })
      .catch(() => toast.error('Failed to load staff'))
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      if (modal.member) {
        await api.put(endpoints.admin.staffMember(modal.member.staff_id), form);
        toast.success('Staff updated');
      } else {
        await api.post(endpoints.admin.staff, form);
        toast.success('Staff created');
      }
      setModal({ open: false }); load();
    } catch (e: any) { toast.error(e?.message ?? 'Failed to save'); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this staff member?')) return;
    try { await api.delete(endpoints.admin.staffMember(id)); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const verify = async (id: string) => {
    try { await api.post(endpoints.admin.staffVerify(id)); toast.success('Verified'); load(); }
    catch { toast.error('Failed to verify'); }
  };

  const lastPage = Math.ceil(meta.total / meta.per_page);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Staff <span className="text-gray-400 font-normal text-lg">({meta.total})</span></h1>
        <button onClick={() => { setForm(EMPTY); setModal({ open: true }); }}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700">
          <Plus size={16} /> Add Staff
        </button>
      </div>

      <div className="bg-white rounded-2xl card shadow-sm p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search staff…" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500" />
        </div>
      </div>

      <div className="bg-white rounded-2xl card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Staff</th>
              <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
              <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
              <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? [...Array(5)].map((_, i) => (
              <tr key={i}><td colSpan={5} className="p-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
            )) : staff.length === 0 ? (
              <tr><td colSpan={5}><EmptyState icon={UserCog} message="No staff found." card={false} /></td></tr>
            ) : staff.map((m) => (
              <tr key={m.staff_id} className="hover:bg-gray-50">
                <td className="p-3">
                  <p className="font-medium text-gray-900">{m.firstname} {m.lastname}</p>
                  <p className="text-xs text-gray-400">{m.email}</p>
                </td>
                <td className="p-3 text-gray-500 font-mono text-xs">{m.unique_id}</td>
                <td className="p-3 text-gray-600">{m.telephone}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.admin_verify === '1' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {m.admin_verify === '1' ? 'Verified' : 'Pending'}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {m.admin_verify !== '1' && (
                      <button onClick={() => verify(m.staff_id)} className="text-blue-600 hover:text-blue-800"><CheckCircle size={16} /></button>
                    )}
                    <button onClick={() => { setForm({ firstname: m.firstname, lastname: m.lastname, email: m.email, telephone: m.telephone, subject: '', class: '', password: '' }); setModal({ open: true, member: m }); }}
                      className="text-blue-600 hover:text-blue-800"><Edit2 size={16} /></button>
                    <button onClick={() => remove(m.staff_id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {lastPage > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
            <span>{meta.total} total · page {page} of {lastPage}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={page === lastPage} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {modal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl card shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{modal.member ? 'Edit Staff' : 'Add Staff'}</h2>
              <button onClick={() => setModal({ open: false })}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-3">
              {(['firstname', 'lastname', 'email', 'telephone', 'subject', 'class'] as const).map((f) => (
                <div key={f}>
                  <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">{f}</label>
                  <input value={(form as any)[f]} onChange={(e) => setForm(p => ({ ...p, [f]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500" />
                </div>
              ))}
              {!modal.member && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                  <input type="password" value={form.password} onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500" />
                </div>
              )}
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setModal({ open: false })} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
