'use client';
import { EmptyState } from '@/components/ui/StateDisplay';
import { useToast } from '@/components/ui/Toast';
import { api, endpoints, getImageUrl } from '@/lib/api';
import type { ApiResponse, Student } from '@/types';
import {
  ChevronLeft, ChevronRight, GraduationCap, Plus, Search, X,
  User, Mail, Phone, BookOpen, Hash, Calendar, Eye,
} from 'lucide-react';
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

/* ─────────────────────────────────────────────
   Student Detail Modal
───────────────────────────────────────────── */
function StudentDetailModal({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    api.get<ApiResponse<any>>(endpoints.staff.student(studentId))
      .then(r => setData(r.data ?? r))
      .catch(() => toast.error('Failed to load student details'))
      .finally(() => setLoading(false));
  }, [studentId]);

  const imgUrl = getImageUrl(data?.image ?? data?.user?.image ?? null);
  const fullName = `${data?.firstname ?? data?.firstName ?? ''} ${data?.lastname ?? data?.lastName ?? ''}`.trim();
  const initials = `${(data?.firstname ?? data?.firstName ?? '?')[0]}${(data?.lastname ?? data?.lastName ?? '')[0]}`.toUpperCase();

  const fields = [
    { icon: Hash,      label: 'Student ID',      value: data?.student_id ?? data?.uniqueId ?? '—' },
    { icon: GraduationCap, label: 'Class',        value: data?.class ?? data?.className ?? '—' },
    { icon: Mail,      label: 'Email',            value: data?.email ?? '—' },
    { icon: Phone,     label: 'Phone',            value: data?.phone ?? data?.telephone ?? '—' },
    { icon: Calendar,  label: 'Admission Year',   value: data?.admissionYear ?? '—' },
    { icon: User,      label: 'Father\'s Name',   value: data?.fatherName ?? '—' },
    { icon: User,      label: 'Mother\'s Name',   value: data?.motherName ?? '—' },
    { icon: BookOpen,  label: 'Blood Group',      value: data?.bloodGroup ?? '—' },
    { icon: Calendar,  label: 'Date of Birth',    value: data?.dateOfBirth ? new Date(data.dateOfBirth).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
    { icon: User,      label: 'State of Origin',  value: data?.stateOfOrigin ?? '—' },
    { icon: User,      label: 'Home Address',     value: data?.homeAddress ?? '—' },
    { icon: Mail,      label: 'Parent Email',     value: data?.parentEmail ?? '—' },
    { icon: User,      label: 'Religion',         value: data?.religion ?? '—' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-base">Student Details</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            <div className="flex items-center gap-4">
              <div className="shimmer w-16 h-16 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="shimmer h-5 w-40" />
                <div className="shimmer h-4 w-28" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="shimmer h-3 w-20" />
                  <div className="shimmer h-4 w-32" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Profile banner */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/20 border-2 border-white/30 shrink-0 flex items-center justify-center">
                  {imgUrl
                    ? <img src={imgUrl} alt={fullName} className="w-full h-full object-cover" />
                    : <span className="text-xl font-black text-white">{initials}</span>}
                </div>
                <div>
                  <p className="text-lg font-black text-white leading-tight">{fullName || '—'}</p>
                  <p className="text-sm text-blue-200 mt-0.5">{data?.class ?? '—'}</p>
                  <span className="inline-block mt-1.5 bg-white/20 text-white text-xs font-mono font-semibold px-2.5 py-0.5 rounded-lg">
                    {data?.student_id ?? data?.uniqueId ?? '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Fields grid */}
            <div className="p-5 grid grid-cols-2 gap-4">
              {fields.map(({ icon: Icon, label, value }) => (
                value && value !== '—' ? (
                  <div key={label} className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Icon size={11} className="text-gray-400 shrink-0" />
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 truncate">{label}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 break-words">{value}</p>
                  </div>
                ) : null
              ))}
            </div>

            {/* About section */}
            {data?.about && (
              <div className="px-5 pb-5">
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">About</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{data.about}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
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

  // View student detail
  const [viewingId, setViewingId] = useState<string | null>(null);

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
                    <th className="pb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.length === 0 ? (
                    <tr><td colSpan={5}><EmptyState icon={GraduationCap} message="No students found." card={false} /></td></tr>
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
                      <td className="py-3.5">
                        <button
                          onClick={() => setViewingId(s.student_id)}
                          title="View student details"
                          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 opacity-0 group-hover:opacity-100"
                        >
                          <Eye size={13} /> View
                        </button>
                      </td>
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

      {/* Student Detail Modal */}
      {viewingId && (
        <StudentDetailModal
          studentId={viewingId}
          onClose={() => setViewingId(null)}
        />
      )}

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
