'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, MessageSquare, Upload, FileBarChart2, Search, X } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/StateDisplay';
import { useSchoolData } from '@/hooks/useSchoolData';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

const EMPTY_ROW = { student_id: '', test_score: '', exam_score: '' };

export default function StaffResults() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  const [termFilter, setTermFilter] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadCourse, setUploadCourse] = useState('');
  const [rows, setRows] = useState([{ ...EMPTY_ROW }]);
  const [submitting, setSubmitting] = useState(false);
  const [commentModal, setCommentModal] = useState<{ student_id: string; comment: string } | null>(null);
  const [attendanceModal, setAttendanceModal] = useState(false);
  const [attendance, setAttendance] = useState({ student_id: '', present: '', absent: '' });
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const { classes, subjects, sessions, terms } = useSchoolData();
  const toast = useToast();

  const load = useCallback(() => {
    if (!classFilter) return;
    setLoading(true);
    api.get<any>(endpoints.staff.results, {
      class: classFilter,
      course: courseFilter || undefined,
      session: sessionFilter || undefined,
      term: termFilter || undefined,
    })
      .then(r => setResults(r.data ?? []))
      .catch(() => toast.error('Failed to load results'))
      .finally(() => setLoading(false));
  }, [classFilter, courseFilter, sessionFilter, termFilter]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadCourse) return toast.error('Select a course');
    const validRows = rows.filter(r => r.student_id && r.test_score !== '' && r.exam_score !== '');
    if (!validRows.length) return toast.error('Add at least one result row');
    setSubmitting(true);
    try {
      await api.post(endpoints.staff.results, {
        course: uploadCourse,
        results: validRows.map(r => ({ student_id: r.student_id, test_score: Number(r.test_score), exam_score: Number(r.exam_score) })),
      });
      toast.success('Results uploaded');
      setShowUpload(false);
      setRows([{ ...EMPTY_ROW }]);
      setUploadCourse('');
      load();
    } catch (e: any) { toast.error(e?.message ?? 'Failed to upload'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.post(`${endpoints.staff.results}/delete`, {
        course: confirmDelete.course,
        session: sessionFilter || undefined,
        term: termFilter || undefined,
        student_ids: [confirmDelete.student_id],
      });
      toast.success('Result deleted'); load();
    } catch { toast.error('Failed to delete'); }
    finally { setConfirmDelete(null); }
  };

  const handleComment = async () => {
    if (!commentModal) return;
    try {
      await api.post(endpoints.staff.comment, {
        student_id: commentModal.student_id,
        comment: commentModal.comment,
        session: sessionFilter,
        term: termFilter,
      });
      toast.success('Comment saved'); setCommentModal(null);
    } catch { toast.error('Failed to save comment'); }
  };

  const handleAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(endpoints.staff.attendance, {
        student_id: attendance.student_id,
        present: Number(attendance.present),
        absent: Number(attendance.absent),
      });
      toast.success('Attendance updated'); setAttendanceModal(false);
      setAttendance({ student_id: '', present: '', absent: '' });
    } catch { toast.error('Failed to update attendance'); }
  };

  const getGrade = (total: number) => {
    if (total >= 70) return { g: 'A', cls: 'bg-green-100 text-green-700' };
    if (total >= 60) return { g: 'B', cls: 'bg-blue-100 text-blue-700' };
    if (total >= 50) return { g: 'C', cls: 'bg-yellow-100 text-yellow-700' };
    if (total >= 40) return { g: 'D', cls: 'bg-orange-100 text-orange-700' };
    return { g: 'F', cls: 'bg-red-100 text-red-700' };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Results</h1>
        <div className="flex gap-2">
          <button onClick={() => setAttendanceModal(true)}
            className="flex items-center gap-2 border border-blue-600 text-blue-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-50">
            <Upload size={16} /> Attendance
          </button>
          <button onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
            <Plus size={16} /> Upload Results
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl card shadow-sm p-4 flex flex-wrap gap-3">
        <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white">
          <option value="">Select Class</option>
          {classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white">
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={sessionFilter} onChange={e => setSessionFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white">
          <option value="">Current Session</option>
          {sessions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={termFilter} onChange={e => setTermFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white">
          <option value="">Current Term</option>
          {terms.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-2xl card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Student</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Subject</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">CA</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Exam</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Total</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Grade</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!classFilter ? (
                <tr><td colSpan={8}><EmptyState icon={Search} message="Select a class to view results." card={false} /></td></tr>
              ) : loading ? (
                [...Array(5)].map((_, i) => <tr key={i}><td colSpan={8} className="p-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>)
              ) : results.length === 0 ? (
                <tr><td colSpan={8}><EmptyState icon={FileBarChart2} message="No results found." card={false} /></td></tr>
              ) : results.map((r, i) => {
                const total = Number(r.test_score) + Number(r.exam_score);
                const { g, cls } = getGrade(total);
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="p-3">
                      <p className="font-medium text-gray-900">{r.firstname} {r.lastname}</p>
                      <p className="text-xs text-gray-400 font-mono">{r.student_id}</p>
                    </td>
                    <td className="p-3 text-gray-600">{r.course}</td>
                    <td className="p-3 text-gray-600">{r.test_score}</td>
                    <td className="p-3 text-gray-600">{r.exam_score}</td>
                    <td className="p-3 font-semibold text-gray-900">{total}</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{g}</span></td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.approvedAt ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {r.approvedAt ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setCommentModal({ student_id: r.student_id, comment: '' })}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Comment">
                          <MessageSquare size={15} />
                        </button>
                        <button onClick={() => setConfirmDelete(r)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl card shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Upload Results</h2>
              <button onClick={() => setShowUpload(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleUpload} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                <select value={uploadCourse} onChange={e => setUploadCourse(e.target.value)} required
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white">
                  <option value="">Select subject</option>
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left text-xs font-medium text-gray-500">Student ID</th>
                      <th className="p-2 text-left text-xs font-medium text-gray-500">CA (40)</th>
                      <th className="p-2 text-left text-xs font-medium text-gray-500">Exam (60)</th>
                      <th className="p-2 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i}>
                        <td className="p-1"><input value={row.student_id} onChange={e => setRows(p => p.map((r, j) => j === i ? { ...r, student_id: e.target.value } : r))}
                          placeholder="fpis/2024/xxxx" className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" /></td>
                        <td className="p-1"><input type="number" min={0} max={40} value={row.test_score} onChange={e => setRows(p => p.map((r, j) => j === i ? { ...r, test_score: e.target.value } : r))}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" /></td>
                        <td className="p-1"><input type="number" min={0} max={60} value={row.exam_score} onChange={e => setRows(p => p.map((r, j) => j === i ? { ...r, exam_score: e.target.value } : r))}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" /></td>
                        <td className="p-1"><button type="button" onClick={() => setRows(p => p.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><X size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={() => setRows(p => [...p, { ...EMPTY_ROW }])}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium">+ Add Row</button>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                  {submitting ? 'Uploading…' : 'Upload Results'}
                </button>
                <button type="button" onClick={() => setShowUpload(false)}
                  className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {commentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl card p-6 w-full max-w-md space-y-4">
            <h3 className="font-semibold text-gray-900">Teacher Comment</h3>
            <textarea value={commentModal.comment} onChange={e => setCommentModal(p => p ? { ...p, comment: e.target.value } : null)}
              rows={4} placeholder="Enter comment…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-3">
              <button onClick={handleComment} className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Save</button>
              <button onClick={() => setCommentModal(null)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {attendanceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl card p-6 w-full max-w-md space-y-4">
            <h3 className="font-semibold text-gray-900">Update Attendance</h3>
            <form onSubmit={handleAttendance} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Student ID</label>
                <input value={attendance.student_id} onChange={e => setAttendance(p => ({ ...p, student_id: e.target.value }))} required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Days Present</label>
                  <input type="number" min={0} value={attendance.present} onChange={e => setAttendance(p => ({ ...p, present: e.target.value }))} required
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Days Absent</label>
                  <input type="number" min={0} value={attendance.absent} onChange={e => setAttendance(p => ({ ...p, absent: e.target.value }))} required
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Save</button>
                <button type="button" onClick={() => setAttendanceModal(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && <ConfirmModal onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />}
    </div>
  );
}
