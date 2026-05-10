'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, X, Users } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/StateDisplay';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface SchoolClass {
  id: string; name: string; teacher_name: string | null; student_count: number;
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; cls?: SchoolClass }>({ open: false });
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<SchoolClass | null>(null);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    api.get<{ success: boolean; data: SchoolClass[] }>(endpoints.admin.classes)
      .then((r) => setClasses(r.data ?? []))
      .catch(() => toast.error('Failed to load classes'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (modal.cls) {
        await api.put(endpoints.admin.classItem(modal.cls.name), { name });
        toast.success('Class updated');
      } else {
        await api.post(endpoints.admin.classes, { name });
        toast.success('Class created');
      }
      setModal({ open: false }); load();
    } catch (e: any) { toast.error(e?.message ?? 'Failed to save'); }
    finally { setSaving(false); }
  };

  const remove = async (cls: SchoolClass) => {
    try { await api.delete(endpoints.admin.classItem(cls.name)); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
    finally { setConfirmTarget(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
        <button onClick={() => { setName(''); setModal({ open: true }); }}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700">
          <Plus size={16} /> Add Class
        </button>
      </div>

      <div className="bg-white rounded-2xl card shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : classes.length === 0 ? (
          <EmptyState icon={Users} message="No classes found." card={false} />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Class</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Class Teacher</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Students</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {classes.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-900">{c.name}</td>
                  <td className="p-3 text-gray-500">{c.teacher_name ?? '—'}</td>
                  <td className="p-3">
                    <span className="flex items-center gap-1 text-gray-600"><Users size={14} />{c.student_count}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setName(c.name); setModal({ open: true, cls: c }); }} className="text-blue-600 hover:text-blue-800"><Edit2 size={16} /></button>
                      <button onClick={() => setConfirmTarget(c)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {modal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl card shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{modal.cls ? 'Edit Class' : 'Add Class'}</h2>
              <button onClick={() => setModal({ open: false })}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-6">
              <label className="block text-xs font-medium text-gray-600 mb-1">Class Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()}
                placeholder="e.g. Jss-1" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500" />
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

      {confirmTarget && (
        <ConfirmModal
          message={`Delete class "${confirmTarget.name}"? This cannot be undone.`}
          onConfirm={() => remove(confirmTarget)}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  );
}
