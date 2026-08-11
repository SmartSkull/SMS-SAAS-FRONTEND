'use client';
import { EmptyState } from '@/components/ui/StateDisplay';
import { useToast } from '@/components/ui/Toast';
import { api, endpoints } from '@/lib/api';
import type { ApiResponse, Student } from '@/types';
import { ChevronLeft, ChevronRight, GraduationCap, Plus, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface StudentsData {
  students: Student[];
  total: number;
  classes?: string[];
}

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  telephone: '',
  class: '',
  password: '',
};

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-purple-100 text-purple-700',
  'bg-rose-100 text-rose-700',
];

export default function StaffStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [classFilter, setClassFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const limit = 20;

  // Add student modal state
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = (p = 1) => {
    setLoading(true);
    api.get<ApiResponse<Student[]>>(endpoints.staff.students, {
      page: p, limit, class: classFilter || undefined, search: search || undefined,
    })
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : [];
        setStudents(data);
        setTotal(data.length);
      })
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get<ApiResponse<{ name: string }[]>>(endpoints.staff.classes)
      .then((r) => setClasses((Array.isArray(r.data) ? r.data : []).map((c: any) => c.name).filter(Boolean)));
  }, []);

  useEffect(() => { load(1); setPage(1); }, [classFilter]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(1); setPage(1); };

  const handleRegister = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }
    if (!form.class) {
      toast.error('Please select a class');
      return;
    }
    setSaving(true);
    try {
      await api.post(endpoints.staff.registerStudent, form);
      toast.success('Student registered. Awaiting admin verification.');
      setModal(false);
      setForm(EMPTY_FORM);
      load(1);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to register student');
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="mt-0.5 text-sm text-gray-500">Manage student accounts and records</p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setModal(true); }}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700"
        >
          <Plus size={16} /> Add Student
        </button>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, ID or email…"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/60 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <button type="submit" className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800">
              Search
            </button>
          </form>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All Classes</option>
            {classes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="space-y-3 skeleton-stagger">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl">
                <div className="shimmer h-10 w-10 rounded-full" />
                <div className="shimmer h-4 w-48" />
                <div className="shimmer h-4 w-32" />
                <div className="shimmer h-4 w-40" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-5 px-5 sm:-mx-6 sm:px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-100">
                    <th className="pb-3 pl-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">Student</th>
                    <th className="pb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Student ID</th>
                    <th className="pb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Class</th>
                    <th className="pb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.length === 0 ? (
                    <tr><td colSpan={4}><EmptyState icon={GraduationCap} message="No students found." card={false} /></td></tr>
                  ) : students.map((s, idx) => (
                    <tr key={s.student_id} className="group transition-colors hover:bg-blue-50/40">
                      <td className="py-3.5 pl-1">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                            {(s.firstname?.[0] ?? '?').toUpperCase()}{(s.lastname?.[0] ?? '').toUpperCase()}
                          </span>
                          <span className="font-semibold text-gray-800">{s.firstname} {s.lastname}</span>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className="inline-flex rounded-lg bg-gray-100 px-2.5 py-1 font-mono text-xs font-medium text-gray-600">{s.student_id}</span>
                      </td>
                      <td className="py-3.5">
                        <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600">{s.class}</span>
                      </td>
                      <td className="py-3.5 text-gray-500">{s.email ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">Showing {students.length} of {total}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setPage(p => p - 1); load(page - 1); }}
                    disabled={page === 1}
                    className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50"
                  ><ChevronLeft size={14} /> Prev</button>
                  <span className="px-2 text-sm font-semibold text-gray-700">{page} / {totalPages}</span>
                  <button
                    onClick={() => { setPage(p => p + 1); load(page + 1); }}
                    disabled={page === totalPages}
                    className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50"
                  >Next <ChevronRight size={14} /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Student Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6 py-5">
              <div>
                <h2 className="font-semibold text-white">Register New Student</h2>
                <p className="text-xs text-blue-200 mt-0.5">The account stays pending until an admin verifies it.</p>
              </div>
              <button onClick={() => setModal(false)} className="rounded-full bg-white/15 p-1.5 text-white transition hover:bg-white/25">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">First Name <span className="text-red-500">*</span></label>
                  <input
                    value={form.firstName}
                    onChange={(e) => setForm(p => ({ ...p, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                    placeholder="e.g. John"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Last Name <span className="text-red-500">*</span></label>
                  <input
                    value={form.lastName}
                    onChange={(e) => setForm(p => ({ ...p, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                    placeholder="e.g. Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  placeholder="student@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.telephone}
                  onChange={(e) => setForm(p => ({ ...p, telephone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  placeholder="e.g. 08012345678"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Class <span className="text-red-500">*</span></label>
                <select
                  value={form.class}
                  onChange={(e) => setForm(p => ({ ...p, class: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">Select class</option>
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Password <span className="text-gray-400">(default: greatkings)</span></label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Leave blank to use default"
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setModal(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleRegister}
                disabled={saving}
                className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium transition hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? 'Registering…' : 'Register Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
