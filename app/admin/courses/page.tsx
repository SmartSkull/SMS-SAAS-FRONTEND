'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, X, Search, BookMarked } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import type { ApiResponse } from '@/types';
import { EmptyState } from '@/components/ui/StateDisplay';
import { useSchoolData } from '@/hooks/useSchoolData';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface Course { id: number; course_id: string; course: string; class?: string; }
interface CourseForm { course_id: string; course: string; class: string; }
const EMPTY: CourseForm = { course_id: '', course: '', class: '' };

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; course?: Course }>({ open: false });
  const [form, setForm] = useState<CourseForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const { classes } = useSchoolData();
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get<ApiResponse<{ courses: Course[] }>>(endpoints.admin.courses)
      .then((r) => setCourses(r.data.courses ?? []))
      .catch(() => toast.error('Failed to load courses'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY); setModal({ open: true }); };
  const openEdit = (c: Course) => {
    setForm({ course_id: c.course_id, course: c.course, class: c.class ?? '' });
    setModal({ open: true, course: c });
  };

  const save = async () => {
    setSaving(true);
    try {
      if (modal.course) {
        await api.put(`${endpoints.admin.courses}/${modal.course.id}`, form);
        toast.success('Course updated');
      } else {
        await api.post(endpoints.admin.courses, form);
        toast.success('Course created');
      }
      setModal({ open: false }); load();
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? 'Failed to save');
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!confirmId) return;
    try { await api.delete(`${endpoints.admin.courses}/${confirmId}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
    finally { setConfirmId(null); }
  };

  const filtered = courses.filter((c) =>
    !search || `${c.course} ${c.course_id} ${c.class}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700">
          <Plus size={16} /> Add Course
        </button>
      </div>

      <div className="bg-white rounded-2xl card shadow-sm p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
      </div>

      <div className="bg-white rounded-2xl card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-3 text-left font-medium text-gray-600">Course</th>
                <th className="p-3 text-left font-medium text-gray-600">Course ID</th>
                <th className="p-3 text-left font-medium text-gray-600">Class</th>
                <th className="p-3 text-left font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={4} className="p-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4}><EmptyState icon={BookMarked} message="No courses found." card={false} /></td></tr>
              ) : filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-900">{c.course}</td>
                  <td className="p-3 text-gray-600">{c.course_id}</td>
                  <td className="p-3 text-gray-600">{c.class ?? '—'}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(c)} className="text-blue-600 hover:text-blue-800"><Edit2 size={16} /></button>
                      <button onClick={() => setConfirmId(c.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl card shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{modal.course ? 'Edit Course' : 'Add Course'}</h2>
              <button onClick={() => setModal({ open: false })}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              {(['course_id', 'course'] as const).map((f) => (
                <div key={f}>
                  <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{f.replace('_', ' ')}</label>
                  <input value={form[f]} onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <select value={form.class} onChange={(e) => setForm(p => ({ ...p, class: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
                  <option value="">Select class</option>
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setModal({ open: false })} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-60">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmId !== null && (
        <ConfirmModal onConfirm={remove} onCancel={() => setConfirmId(null)} />
      )}
    </div>
  );
}
