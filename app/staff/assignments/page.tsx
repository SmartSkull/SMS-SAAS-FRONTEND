'use client';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/StateDisplay';
import { useToast } from '@/components/ui/Toast';
import { useSchoolData } from '@/hooks/useSchoolData';
import { api, endpoints } from '@/lib/api';
import type { ApiResponse, Assignment } from '@/types';
import clsx from 'clsx';
import { ChevronDown, ChevronUp, Eye, EyeOff, FileText, Paperclip, Pencil, Plus, Trash2, X, Award, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

const EMPTY = { subject: '', assignment: '', class: '', deadline: '', status: 'PUBLISHED' };

interface Submission {
  id: string;
  studentName: string;
  note?: string;
  fileUrl?: string;
  submittedAt: string;
  grade?: string | null;
  feedback?: string | null;
  gradedAt?: string | null;
}

export default function StaffAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Record<string, Submission[]>>({});
  const [loadingSubs, setLoadingSubs] = useState<string | null>(null);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const toast = useToast();
  const { classes, subjects } = useSchoolData();

  // ── Grading state ─────────────────────────────────────────────────────────
  // gradingId: the submission currently being graded (shows the inline form)
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);

  const openGrade = (s: Submission) => {
    setGradingId(s.id);
    setGradeInput(s.grade ?? '');
    setFeedbackInput(s.feedback ?? '');
  };

  const saveGrade = async (assignmentId: string, submissionId: string) => {
    setSavingGrade(true);
    try {
      await api.patch<any>(endpoints.staff.assignmentGradeSubmission(+assignmentId, submissionId), {
        grade: gradeInput.trim(),
        feedback: feedbackInput.trim(),
      });
      // Update local state so the badge reflects immediately
      setSubmissions(prev => ({
        ...prev,
        [assignmentId]: prev[assignmentId].map(s =>
          s.id === submissionId
            ? { ...s, grade: gradeInput.trim() || null, feedback: feedbackInput.trim() || null, gradedAt: new Date().toISOString() }
            : s
        ),
      }));
      setGradingId(null);
      toast.success('Grade saved');
    } catch {
      toast.error('Failed to save grade');
    } finally {
      setSavingGrade(false);
    }
  };

  const load = () => {
    setLoading(true);
    api.get<ApiResponse<Assignment[]>>(endpoints.staff.assignments)
      .then((r) => setAssignments(Array.isArray(r.data) ? r.data : (r.data as any).assignments ?? []))
      .catch(() => toast.error('Failed to load assignments'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleSubmissions = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (submissions[id]) return;
    setLoadingSubs(id);
    try {
      const r = await api.get<ApiResponse<Submission[]>>(endpoints.staff.assignmentSubmissions(+id));
      setSubmissions(p => ({ ...p, [id]: Array.isArray(r.data) ? r.data : [] }));
    } catch { toast.error('Failed to load submissions'); }
    finally { setLoadingSubs(null); }
  };

  const openCreate = () => { setEditing(null); setForm(EMPTY); setFile(null); setShowForm(true); };
  const openEdit = (a: Assignment) => {
    setEditing(a);
    setForm({
      subject: a.subject ?? a.title,
      assignment: a.assignment ?? a.description,
      class: a.class,
      deadline: a.deadline ?? a.due_date,
      status: a.status === 'HIDDEN' ? 'HIDDEN' : 'PUBLISHED',
    });
    setFile(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (file) {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, v));
        fd.append('file', file);
        if (editing) {
          await api.upload(`${endpoints.staff.assignments}/${editing.id}`, fd, 'PUT');
        } else {
          await api.upload(endpoints.staff.assignments, fd);
        }
      } else if (editing) {
        await api.put(`${endpoints.staff.assignments}/${editing.id}`, form);
      } else {
        await api.post(endpoints.staff.assignments, form);
      }
      toast.success(editing ? 'Assignment updated' : 'Assignment created');
      setShowForm(false);
      load();
    } catch {
      toast.error('Failed to save assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmId) return;
    try { await api.delete(`${endpoints.staff.assignments}/${confirmId}`); toast.success('Assignment deleted'); load(); }
    catch { toast.error('Failed to delete assignment'); }
    finally { setConfirmId(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Assignments</h1>
        <button onClick={openCreate}
          className="flex items-center gap-2 btn-brand text-white px-4 py-2 rounded-xl text-sm font-medium ">
          <Plus size={16} /> New Assignment
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl card shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">{editing ? 'Edit' : 'Create'} Assignment</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select required value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Select subject</option>
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <select required value={form.class} onChange={e => setForm(p => ({ ...p, class: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Select class</option>
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input required type="date" value={form.deadline}
                  onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Visibility</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="PUBLISHED">Visible to students</option>
                  <option value="HIDDEN">Hidden from students</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assignment</label>
              <textarea
                required
                rows={3}
                value={form.assignment}
                onChange={(e) => setForm((p) => ({ ...p, assignment: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Attachment (optional)</label>
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm text-gray-600" />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={submitting}
                className="btn-brand text-white px-5 py-2 rounded-xl text-sm font-medium  disabled:opacity-50">
                {submitting ? 'Saving…' : 'Save'}
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
          <div className="space-y-3 skeleton-stagger">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-start justify-between p-4 border border-gray-100 rounded-xl">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="shimmer h-5 w-48" />
                    <div className="shimmer h-5 w-20" />
                    <div className="shimmer h-5 w-24" />
                  </div>
                  <div className="shimmer h-4 w-full" />
                  <div className="shimmer h-3 w-3/4" />
                  <div className="flex items-center gap-3 mt-2">
                    <div className="shimmer h-3 w-32" />
                    <div className="shimmer h-3 w-24" />
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <div className="shimmer w-8 h-8 rounded-lg" />
                  <div className="shimmer w-8 h-8 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : assignments.length === 0 ? (
          <EmptyState icon={FileText} message="No assignments yet." card={false} />
        ) : (
          <div className="space-y-3">
            {assignments.map((a) => (
              <div key={a.id} className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="flex items-start justify-between p-4 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800">{a.subject ?? a.title}</p>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{a.subject ?? a.course}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{a.class}</span>
                      {a.status === 'HIDDEN' ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          <EyeOff size={12} /> Hidden
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                          <Eye size={12} /> Visible
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{a.assignment ?? a.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>Due: {new Date(a.deadline ?? a.due_date).toLocaleDateString()}</span>
                      {(a.file || a.file_url) && <span className="flex items-center gap-1"><Paperclip size={12} /> Attachment</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <button onClick={() => toggleSubmissions(String(a.id))}
                      className="flex items-center gap-1 px-2 py-1.5 text-xs text-purple-600 hover:bg-purple-50 rounded-lg font-medium">
                      Submissions {expandedId === String(a.id) ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    <button onClick={() => openEdit(a)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => setConfirmId(a.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {expandedId === String(a.id) && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                    {loadingSubs === String(a.id) ? (
                      <p className="text-xs text-gray-400">Loading submissions…</p>
                    ) : (submissions[String(a.id)]?.length ?? 0) === 0 ? (
                      <p className="text-xs text-gray-400">No submissions yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {submissions[String(a.id)].map(s => (
                          <div key={s.id} className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                            {/* ── submission info row ── */}
                            <div className="flex items-center justify-between px-3 py-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-medium text-gray-800">{s.studentName}</p>
                                  {s.grade ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                                      <Award size={11} /> {s.grade}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-400">Not graded</span>
                                  )}
                                </div>
                                {s.note && <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{s.note}</p>}
                                {s.feedback && s.grade && (
                                  <p className="text-xs text-emerald-600 mt-0.5 italic truncate max-w-xs">"{s.feedback}"</p>
                                )}
                                <p className="text-xs text-gray-400">{new Date(s.submittedAt).toLocaleString()}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-3">
                                {s.fileUrl && (
                                  s.fileUrl.toLowerCase().includes('.pdf') ? (
                                    <a href={s.fileUrl} target="_blank" rel="noreferrer"
                                      className="flex items-center gap-1 text-xs bg-red-600 text-white hover:bg-red-700 px-2 py-1 rounded-lg font-medium">
                                      <FileText size={13} /> PDF
                                    </a>
                                  ) : (
                                    <a href={s.fileUrl} target="_blank" rel="noreferrer"
                                      className="flex items-center gap-1 text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg font-medium">
                                      <Paperclip size={13} /> File
                                    </a>
                                  )
                                )}
                                <button
                                  onClick={() => gradingId === s.id ? setGradingId(null) : openGrade(s)}
                                  className={clsx(
                                    'flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium transition-colors',
                                    gradingId === s.id
                                      ? 'bg-gray-100 text-gray-500'
                                      : s.grade
                                        ? 'text-emerald-600 hover:bg-emerald-50'
                                        : 'text-purple-600 hover:bg-purple-50'
                                  )}
                                >
                                  <Award size={13} />
                                  {gradingId === s.id ? 'Cancel' : s.grade ? 'Edit grade' : 'Grade'}
                                </button>
                              </div>
                            </div>

                            {/* ── inline grade form ── */}
                            {gradingId === s.id && (
                              <div className="border-t border-gray-100 bg-purple-50/40 px-3 py-3">
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Grade</label>
                                    <input
                                      autoFocus
                                      value={gradeInput}
                                      onChange={e => setGradeInput(e.target.value)}
                                      placeholder="e.g. A, B+, 85/100"
                                      className="w-32 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-purple-400 bg-white"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1 flex-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Feedback (optional)</label>
                                    <input
                                      value={feedbackInput}
                                      onChange={e => setFeedbackInput(e.target.value)}
                                      onKeyDown={e => e.key === 'Enter' && saveGrade(String(a.id), s.id)}
                                      placeholder="Well done! Great effort…"
                                      className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-purple-400 bg-white"
                                    />
                                  </div>
                                  <div className="flex items-end">
                                    <button
                                      onClick={() => saveGrade(String(a.id), s.id)}
                                      disabled={savingGrade || !gradeInput.trim()}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-colors"
                                    >
                                      <CheckCircle2 size={13} />
                                      {savingGrade ? 'Saving…' : 'Save'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PDF Preview Modal */}
      {pdfPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700">PDF Preview</p>
              <div className="flex items-center gap-3">
                <a href={pdfPreview.replace('/image/upload/', '/raw/upload/')} download target="_blank" rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline font-medium">Download</a>
                <button onClick={() => setPdfPreview(null)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
              </div>
            </div>
            <object
              data={pdfPreview}
              type="application/pdf"
              className="flex-1 w-full rounded-b-2xl"
            >
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500 text-sm gap-3">
                <p>Your browser cannot display this PDF inline.</p>
                <a href={pdfPreview} target="_blank" rel="noreferrer"
                  className="text-blue-600 hover:underline font-medium">Open PDF in new tab</a>
              </div>
            </object>
          </div>
        </div>
      )}

      {confirmId !== null && <ConfirmModal onConfirm={handleDelete} onCancel={() => setConfirmId(null)} />}
    </div>
  );
}

