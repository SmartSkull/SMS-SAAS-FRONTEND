'use client';
import { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Edit2, Trash2, CheckCircle, ChevronLeft, ChevronRight, X, GraduationCap } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/StateDisplay';

interface Student {
  student_id: string; firstname: string; lastname: string;
  email: string; class: string; image: string; admin_verify: string;
}
interface Meta { total: number; page: number; per_page: number; last_page: number; }

const EMPTY = { firstname: '', lastname: '', email: '', phone: '', class: '', session: '', password: '' };

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, per_page: 20, last_page: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [modal, setModal] = useState<{ open: boolean; student?: Student }>({ open: false });
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    api.get<{ success: boolean; data: Student[]; meta: Meta }>(endpoints.admin.students, {
      page, search: search || undefined,
    })
      .then((r) => { setStudents(r.data ?? []); setMeta(r.meta); })
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      if (modal.student) {
        await api.put(endpoints.admin.student(modal.student.student_id), form);
        toast.success('Student updated');
      } else {
        await api.post(endpoints.admin.students, form);
        toast.success('Student created');
      }
      setModal({ open: false }); load();
    } catch (e: any) { toast.error(e?.message ?? 'Failed to save'); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this student?')) return;
    try { await api.delete(endpoints.admin.student(id)); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const verify = async (id: string) => {
    try { await api.post(endpoints.admin.studentsVerify, { student_id: id }); toast.success('Verified'); load(); }
    catch { toast.error('Failed to verify'); }
  };

  const bulkVerify = async () => {
    try { await api.post(endpoints.admin.studentsBulkVerify, { student_ids: selected }); toast.success(`${selected.length} verified`); setSelected([]); load(); }
    catch { toast.error('Bulk verify failed'); }
  };

  const toggleSelect = (id: string) => setSelected((p) => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAll = () => setSelected(selected.length === students.length ? [] : students.map(s => s.student_id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Students <span className="text-gray-400 font-normal text-lg">({meta.total})</span></h1>
        <button onClick={() => { setForm(EMPTY); setModal({ open: true }); }}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700">
          <Plus size={16} /> Add Student
        </button>
      </div>

      <div className="bg-white rounded-2xl card shadow-sm p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search students…" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500" />
        </div>
        {selected.length > 0 && (
          <button onClick={bulkVerify} className="flex items-center gap-2 btn-brand text-white px-4 py-2 rounded-xl text-sm font-medium ">
            <CheckCircle size={16} /> Verify {selected.length}
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-3 w-10"><input type="checkbox" checked={selected.length === students.length && students.length > 0} onChange={toggleAll} /></th>
              <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Student</th>
              <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
              <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Class</th>
              <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? [...Array(5)].map((_, i) => (
              <tr key={i}><td colSpan={6} className="p-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
            )) : students.length === 0 ? (
              <tr><td colSpan={6}><EmptyState icon={GraduationCap} message="No students found." card={false} /></td></tr>
            ) : students.map((s) => (
              <tr key={s.student_id} className="hover:bg-gray-50">
                <td className="p-3"><input type="checkbox" checked={selected.includes(s.student_id)} onChange={() => toggleSelect(s.student_id)} /></td>
                <td className="p-3">
                  <p className="font-medium text-gray-900">{s.firstname} {s.lastname}</p>
                  <p className="text-xs text-gray-400">{s.email}</p>
                </td>
                <td className="p-3 text-gray-500 font-mono text-xs">{s.student_id || '—'}</td>
                <td className="p-3 text-gray-600">{s.class || '—'}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.admin_verify === '1' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {s.admin_verify === '1' ? 'Verified' : 'Pending'}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {s.admin_verify !== '1' && (
                      <button onClick={() => verify(s.student_id)} title="Verify" className="text-blue-600 hover:text-blue-800"><CheckCircle size={16} /></button>
                    )}
                    <button onClick={() => { setForm({ firstname: s.firstname, lastname: s.lastname, email: s.email, phone: '', class: s.class, session: '', password: '' }); setModal({ open: true, student: s }); }} className="text-blue-600 hover:text-blue-800"><Edit2 size={16} /></button>
                    <button onClick={() => remove(s.student_id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {meta.last_page > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
            <span>{meta.total} total · page {meta.page} of {meta.last_page}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {modal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl card shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{modal.student ? 'Edit Student' : 'Add Student'}</h2>
              <button onClick={() => setModal({ open: false })}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-3">
              {(['firstname', 'lastname', 'email', 'phone', 'class', 'session'] as const).map((f) => (
                <div key={f}>
                  <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">{f}</label>
                  <input value={(form as any)[f]} onChange={(e) => setForm(p => ({ ...p, [f]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500" />
                </div>
              ))}
              {!modal.student && (
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
