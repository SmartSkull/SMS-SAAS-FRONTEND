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

  const imgUrl   = getImageUrl(data?.image ?? data?.user?.image ?? null);
  const fullName = `${data?.firstName ?? data?.firstname ?? ''} ${data?.lastName ?? data?.lastname ?? ''}`.trim();
  const initials = `${(data?.firstName ?? data?.firstname ?? '?')[0]}${(data?.lastName ?? data?.lastname ?? '')[0]}`.toUpperCase();
  const cls      = data?.student?.classRoom?.name ?? data?.class ?? '—';
  const uid      = data?.uniqueId ?? data?.student_id ?? '—';

  const personalFields = [
    { icon: Hash,      label: 'Student ID',      value: uid },
    { icon: GraduationCap, label: 'Class',        value: cls },
    { icon: Mail,      label: 'Email',            value: data?.email ?? '—' },
    { icon: Phone,     label: 'Phone',            value: data?.telephone ?? data?.phone ?? '—' },
    { icon: Calendar,  label: 'Date of Birth',    value: data?.student?.dateOfBirth ? new Date(data.student.dateOfBirth).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
    { icon: Calendar,  label: 'Admission Year',   value: data?.student?.admissionYear ?? '—' },
    { icon: User,      label: 'State of Origin',  value: data?.student?.stateOfOrigin ?? '—' },
    { icon: User,      label: 'Religion',         value: data?.student?.religion ?? '—' },
    { icon: BookOpen,  label: 'Blood Group',      value: data?.student?.bloodGroup ?? '—' },
    { icon: User,      label: 'Father\'s Name',   value: data?.student?.fatherName ?? '—' },
    { icon: User,      label: 'Mother\'s Name',   value: data?.student?.motherName ?? '—' },
    { icon: Mail,      label: 'Parent Email',     value: data?.student?.parentEmail ?? '—' },
    { icon: User,      label: 'Home Address',     value: data?.student?.homeAddress ?? '—' },
  ].filter(f => f.value && f.value !== '—');

  const att = data?.attendanceSummary;
  const results: any[] = data?.recentResults ?? [];
  const assignmentCount: number = data?.assignmentCount ?? 0;

  const gradeColor = (g: string) => {
    if (!g) return 'bg-gray-100 text-gray-600';
    if (g === 'A') return 'bg-emerald-100 text-emerald-700';
    if (g === 'B') return 'bg-blue-100 text-blue-700';
    if (g === 'C') return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-600';
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="font-bold text-gray-900 text-base">Student Details</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            <div className="flex items-center gap-4">
              <div className="shimmer w-16 h-16 rounded-full shrink-0" />
              <div className="space-y-2 flex-1"><div className="shimmer h-5 w-40" /><div className="shimmer h-4 w-28" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-1.5"><div className="shimmer h-3 w-20" /><div className="shimmer h-4 w-32" /></div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">

            {/* Profile banner */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-5 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/20 border-2 border-white/30 shrink-0 flex items-center justify-center">
                  {imgUrl
                    ? <img src={imgUrl} alt={fullName} className="w-full h-full object-cover" />
                    : <span className="text-xl font-black text-white">{initials}</span>}
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-black text-white leading-tight truncate">{fullName || '—'}</p>
                  <p className="text-sm text-blue-200 mt-0.5">{cls}</p>
                  <span className="inline-block mt-1.5 bg-white/20 text-white text-xs font-mono font-semibold px-2.5 py-0.5 rounded-lg">{uid}</span>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-6">

              {/* ── Attendance Summary ── */}
              {att && att.total > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Attendance This Month</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Present', value: att.present, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                      { label: 'Late',    value: att.late,    color: 'bg-amber-50 text-amber-700 border-amber-100' },
                      { label: 'Absent',  value: att.absent,  color: 'bg-red-50 text-red-600 border-red-100' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className={`rounded-xl border p-3 text-center ${color}`}>
                        <p className="text-2xl font-black">{value}</p>
                        <p className="text-xs font-semibold mt-0.5 opacity-80">{label}</p>
                      </div>
                    ))}
                  </div>
                  {att.total > 0 && (
                    <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden flex">
                      <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(att.present / att.total) * 100}%` }} />
                      <div className="bg-amber-400 h-full transition-all" style={{ width: `${(att.late / att.total) * 100}%` }} />
                      <div className="bg-red-400 h-full transition-all" style={{ width: `${(att.absent / att.total) * 100}%` }} />
                    </div>
                  )}
                </div>
              )}

              {/* ── Quick stats ── */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-3.5">
                  <p className="text-2xl font-black text-blue-700">{assignmentCount}</p>
                  <p className="text-xs font-semibold text-blue-500 mt-0.5">Class Assignments</p>
                </div>
                <div className="rounded-xl bg-purple-50 border border-purple-100 p-3.5">
                  <p className="text-2xl font-black text-purple-700">{results.length}</p>
                  <p className="text-xs font-semibold text-purple-500 mt-0.5">Result Records</p>
                </div>
              </div>

              {/* ── Recent Results ── */}
              {results.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Recent Results</p>
                  <div className="rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                    {results.map((r, i) => {
                      // Clean up hyphenated subject names e.g. "Agricultural-Science" → "Agricultural Science"
                      const subjectName = (r.subject ?? 'Unknown').replace(/-/g, ' ');
                      const total = r.totalScore ?? 0;
                      const hasScore = total > 0 || r.testScore > 0 || r.examScore > 0;
                      return (
                        <div key={i} className="px-4 py-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                                <BookOpen size={13} className="text-blue-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{subjectName}</p>
                                {(r.session || r.term) && (
                                  <p className="text-[10px] text-gray-400 truncate">{[r.term, r.session].filter(Boolean).join(' · ')}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <span className={`text-sm font-bold ${hasScore ? 'text-gray-700' : 'text-gray-400'}`}>
                                {total}%
                              </span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${gradeColor(r.grade)}`}>
                                {r.grade ?? '—'}
                              </span>
                            </div>
                          </div>
                          {/* Test / Exam breakdown */}
                          {hasScore && (
                            <div className="flex gap-4 pl-9">
                              <span className="text-[11px] text-gray-400">
                                CA: <span className="font-semibold text-gray-600">{r.testScore ?? 0}</span>
                              </span>
                              <span className="text-[11px] text-gray-400">
                                Exam: <span className="font-semibold text-gray-600">{r.examScore ?? 0}</span>
                              </span>
                              {r.remark && (
                                <span className="text-[11px] text-gray-400 truncate">
                                  {r.remark}
                                </span>
                              )}
                            </div>
                          )}
                          {!hasScore && (
                            <p className="text-[11px] text-amber-500 pl-9">Score not yet entered</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Personal Info ── */}
              {personalFields.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Personal Information</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    {personalFields.map(({ icon: Icon, label, value }) => (
                      <div key={label} className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Icon size={11} className="text-gray-400 shrink-0" />
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
                        </div>
                        <p className="text-sm font-semibold text-gray-800 break-words">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── About ── */}
              {data?.student?.about && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">About</p>
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                    <p className="text-sm text-gray-700 leading-relaxed">{data.student.about}</p>
                  </div>
                </div>
              )}

            </div>
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
                          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
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
