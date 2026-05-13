'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, BarChart2, HelpCircle, Pencil } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/StateDisplay';
import { useSchoolData } from '@/hooks/useSchoolData';
import type { ApiResponse, CbtQuestion } from '@/types';

interface CbtResult {
  id: string;
  score: string;
  percentage: string;
  submittedAt: string;
  firstname: string;
  lastname: string;
  student?: { user?: { uniqueId?: string } };
  testId?: string;
}

const EMPTY = { question: '', option_a: '', option_b: '', option_c: '', option_d: '', answer: 'A', course: '', class: '' };

export default function StaffCbt() {
  const [tab, setTab] = useState<'questions' | 'results'>('questions');
  const [questions, setQuestions] = useState<CbtQuestion[]>([]);
  const [results, setResults] = useState<CbtResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const loadQuestions = () => {
    setLoading(true);
    api.get<any>(endpoints.staff.cbtQuestions)
      .then((r) => setQuestions(r.data ?? []))
      .catch(() => toast.error('Failed to load questions'))
      .finally(() => setLoading(false));
  };

  const loadResults = () => {
    setLoading(true);
    api.get<any>(endpoints.staff.cbtResults)
      .then((r) => setResults(r.data ?? []))
      .catch(() => toast.error('Failed to load results'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (tab === 'questions') loadQuestions();
    else loadResults();
  }, [tab]);

  const openEdit = (q: any) => {
    setEditingId(q.id);
    setForm({ question: q.question, option_a: q.optionA, option_b: q.optionB, option_c: q.optionC, option_d: q.optionD, answer: q.answer, course: '', class: '' });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`${endpoints.staff.cbtQuestions}/${editingId}`, {
          question: form.question, optionA: form.option_a, optionB: form.option_b,
          optionC: form.option_c, optionD: form.option_d, answer: form.answer,
        });
        toast.success('Question updated');
      } else {
        await api.post(endpoints.staff.cbtQuestions, {
          question: form.question, optionA: form.option_a, optionB: form.option_b,
          optionC: form.option_c, optionD: form.option_d, answer: form.answer,
          course: form.course, class: form.class,
        });
        toast.success('Question added');
      }
      setShowForm(false); setEditingId(null); setForm(EMPTY); loadQuestions();
    } catch { toast.error('Failed to save question'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this question?')) return;
    try {
      await api.delete(`${endpoints.staff.cbtQuestions}/${id}`);
      toast.success('Question deleted');
      loadQuestions();
    } catch {
      toast.error('Failed to delete question');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">CBT Management</h1>
        {tab === 'questions' && (
          <button onClick={() => { setEditingId(null); setForm(EMPTY); setShowForm(true); }}
            className="flex items-center gap-2 btn-brand text-white px-4 py-2 rounded-xl text-sm font-medium ">
            <Plus size={16} /> Add Question
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {(['questions', 'results'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
              tab === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>
            {t === 'results' ? <span className="flex items-center gap-1.5"><BarChart2 size={14} /> Results</span> : 'Questions'}
          </button>
        ))}
      </div>

      {showForm && tab === 'questions' && (
        <div className="bg-white rounded-2xl card shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">{editingId ? 'Edit Question' : 'Add Question'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingId && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <input required value={form.course} onChange={(e) => setForm((p) => ({ ...p, course: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <input required value={form.class} onChange={(e) => setForm((p) => ({ ...p, class: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
              <textarea required rows={2} value={form.question} onChange={(e) => setForm((p) => ({ ...p, question: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(['option_a', 'option_b', 'option_c', 'option_d'] as const).map((opt) => (
                <div key={opt}>
                  <label className="block text-sm font-medium text-gray-700 mb-1 uppercase">{opt.replace('_', ' ')}</label>
                  <input required value={form[opt]} onChange={(e) => setForm((p) => ({ ...p, [opt]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
              <select value={form.answer} onChange={(e) => setForm((p) => ({ ...p, answer: e.target.value }))}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['A', 'B', 'C', 'D'].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
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
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'questions' ? (
          questions.length === 0 ? (
            <EmptyState icon={HelpCircle} message="No questions yet." card={false} />
          ) : (
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div key={q.id} className="flex items-start justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{i + 1}. {q.question}</p>
                    <div className="grid grid-cols-2 gap-1 mt-2">
                      {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                        const opt = (q as any)[`option${letter}`];
                        return (
                          <p key={letter} className={`text-xs px-2 py-1 rounded-lg ${
                            q.answer === letter ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-500'
                          }`}>{letter}. {opt}</p>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-4 shrink-0">
                    <button onClick={() => openEdit(q)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(q.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          results.length === 0 ? (
            <EmptyState icon={BarChart2} message="No CBT results yet." card={false} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-3 font-medium">Student</th>
                    <th className="pb-3 font-medium">Student ID</th>
                    <th className="pb-3 font-medium">Score</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {results.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-800">{r.firstname} {r.lastname}</td>
                      <td className="py-3 text-gray-500 font-mono text-xs">{r.student?.user?.uniqueId ?? '—'}</td>
                      <td className="py-3">
                        <span className="font-semibold text-gray-800">{r.score}</span>
                        <span className="text-gray-400 text-xs ml-1">({r.percentage}%)</span>
                      </td>
                      <td className="py-3 text-gray-500">{new Date(r.submittedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
