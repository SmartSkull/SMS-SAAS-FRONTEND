'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, MessageSquare, ChevronLeft, ChevronRight, Upload, FileBarChart2 } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import type { ApiResponse, Result } from '@/types';
import { EmptyState } from '@/components/ui/StateDisplay';

interface ResultsData { results: Result[]; total: number; }

const EMPTY = { student_id: '', course: '', ca: '', exam: '', session: '', term: '' };

export default function StaffResults() {
  const [results, setResults] = useState<Result[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [commentModal, setCommentModal] = useState<{ id: string; comment: string } | null>(null);
  const [attendanceModal, setAttendanceModal] = useState(false);
  const [attendance, setAttendance] = useState({ student_id: '', days_present: '', total_days: '' });
  const toast = useToast();
  const limit = 20;

  const load = (p = 1) => {
    setLoading(true);
    api.get<ApiResponse<ResultsData>>(endpoints.staff.results, { page: p, limit })
      .then((r) => { setResults(r.data.results ?? []); setTotal(r.data.total ?? 0); })
      .catch(() => toast.error('Failed to load results'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(endpoints.staff.results, { ...form, ca: Number(form.ca), exam: Number(form.exam) });
      toast.success('Result uploaded');
      setShowForm(false);
      setForm(EMPTY);
      load(1);
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? 'Failed to upload result');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this result?')) return;
    try {
      await api.delete(endpoints.staff.results, { id });
      toast.success('Result deleted');
      load(page);
    } catch {
      toast.error('Failed to delete result');
    }
  };

  const handleComment = async () => {
    if (!commentModal) return;
    try {
      await api.post(endpoints.staff.comment, { result_id: commentModal.id, comment: commentModal.comment });
      toast.success('Comment saved');
      setCommentModal(null);
    } catch {
      toast.error('Failed to save comment');
    }
  };

  const handleAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(endpoints.staff.attendance, {
        student_id: attendance.student_id,
        days_present: Number(attendance.days_present),
        total_days: Number(attendance.total_days),
      });
      toast.success('Attendance updated');
      setAttendanceModal(false);
      setAttendance({ student_id: '', days_present: '', total_days: '' });
    } catch {
      toast.error('Failed to update attendance');
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Results</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setAttendanceModal(true)}
            className="flex items-center gap-2 border border-blue-600 text-blue-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-50"
          >
            <Upload size={16} /> Attendance
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 btn-brand text-white px-4 py-2 rounded-xl text-sm font-medium "
          >
            <Plus size={16} /> Add Result
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl card shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Upload Result</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(['student_id', 'course', 'ca', 'exam', 'session', 'term'] as const).map((f) => (
              <div key={f}>
                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{f.replace('_', ' ')}</label>
                <input
                  required
                  type={['ca', 'exam'].includes(f) ? 'number' : 'text'}
                  value={form[f]}
                  onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            <div className="sm:col-span-2 lg:col-span-3 flex gap-3">
              <button type="submit" disabled={submitting}
                className="btn-brand text-white px-5 py-2 rounded-xl text-sm font-medium  disabled:opacity-50">
                {submitting ? 'Saving…' : 'Save Result'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="border border-gray-200 px-5 py-2 rounded-xl text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl card shadow-sm p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-3 font-medium">Student</th>
                    <th className="pb-3 font-medium">Course</th>
                    <th className="pb-3 font-medium">CA</th>
                    <th className="pb-3 font-medium">Exam</th>
                    <th className="pb-3 font-medium">Total</th>
                    <th className="pb-3 font-medium">Grade</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {results.length === 0 ? (
                    <tr><td colSpan={8}><EmptyState icon={FileBarChart2} message="No results found." card={false} /></td></tr>
                  ) : results.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="py-3 font-mono text-xs text-gray-600">{r.student_id}</td>
                      <td className="py-3 text-gray-800">{r.course}</td>
                      <td className="py-3 text-gray-600">{r.ca}</td>
                      <td className="py-3 text-gray-600">{r.exam}</td>
                      <td className="py-3 font-semibold text-gray-800">{r.total}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          r.grade === 'A' ? 'bg-blue-100 text-blue-700' :
                          r.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                          r.grade === 'C' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>{r.grade}</span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.approved ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                          {r.approved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setCommentModal({ id: r.id, comment: '' })}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Add comment">
                            <MessageSquare size={15} />
                          </button>
                          <button onClick={() => handleDelete(r.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Delete">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">Showing {results.length} of {total}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setPage(p => p - 1); load(page - 1); }} disabled={page === 1}
                    className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm text-gray-600">{page} / {totalPages}</span>
                  <button onClick={() => { setPage(p => p + 1); load(page + 1); }} disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Comment Modal */}
      {commentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl card p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Comment</h3>
            <textarea
              value={commentModal.comment}
              onChange={(e) => setCommentModal((p) => p ? { ...p, comment: e.target.value } : null)}
              rows={4}
              placeholder="Enter comment…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={handleComment} className="btn-brand text-white px-5 py-2 rounded-xl text-sm font-medium ">
                Save
              </button>
              <button onClick={() => setCommentModal(null)} className="border border-gray-200 px-5 py-2 rounded-xl text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {attendanceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl card p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Update Attendance</h3>
            <form onSubmit={handleAttendance} className="space-y-4">
              {(['student_id', 'days_present', 'total_days'] as const).map((f) => (
                <div key={f}>
                  <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{f.replace('_', ' ')}</label>
                  <input
                    required
                    type={f === 'student_id' ? 'text' : 'number'}
                    value={attendance[f]}
                    onChange={(e) => setAttendance((p) => ({ ...p, [f]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div className="flex gap-3">
                <button type="submit" className="btn-brand text-white px-5 py-2 rounded-xl text-sm font-medium ">
                  Save
                </button>
                <button type="button" onClick={() => setAttendanceModal(false)}
                  className="border border-gray-200 px-5 py-2 rounded-xl text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
