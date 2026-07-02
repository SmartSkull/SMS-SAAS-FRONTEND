'use client';
import { EmptyState } from '@/components/ui/StateDisplay';
import { useToast } from '@/components/ui/Toast';
import { useSchoolData } from '@/hooks/useSchoolData';
import { api, endpoints } from '@/lib/api';
import type { CbtQuestion } from '@/types';
import { BarChart2, HelpCircle, Pencil, Plus, Trash2, Upload, FileText, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Tesseract from 'tesseract.js';
import mammoth from 'mammoth';

interface CbtResult {
  id: string; score: string; percentage: string; submittedAt: string;
  firstname: string; lastname: string;
  student?: { user?: { uniqueId?: string } };
}

interface ParsedQuestion {
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  answer: string;
}

const EMPTY = { question: '', option_a: '', option_b: '', option_c: '', option_d: '', answer: 'A', course: '', class: '', session: '', term: '', duration: '30' };
const SEL_CLS = "border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function StaffCbt() {
  const [tab, setTab] = useState<'questions' | 'results'>('questions');
  const [questions, setQuestions] = useState<CbtQuestion[]>([]);
  const [results, setResults] = useState<CbtResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState({ class: '', course: '', session: '', term: '' });
  const toast = useToast();
  const { classes, subjects, sessions, terms } = useSchoolData();

  // OCR / Bulk upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const loadQuestions = () => {
    setLoading(true);
    const params: any = {};
    if (filter.class)   params.class   = filter.class;
    if (filter.course)  params.course  = filter.course;
    if (filter.session) params.session = filter.session;
    if (filter.term)    params.term    = filter.term;
    api.get<any>(endpoints.staff.cbtQuestions, params)
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
  }, [tab, filter]);

  const openEdit = (q: any) => {
    setEditingId(q.id);
    setForm({ question: q.question, option_a: q.optionA, option_b: q.optionB, option_c: q.optionC, option_d: q.optionD, answer: q.answer, course: '', class: '', session: '', term: '', duration: '30' });
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
          course: form.course, class: form.class, session: form.session, term: form.term,
          duration: form.duration,
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
      toast.success('Question deleted'); loadQuestions();
    } catch { toast.error('Failed to delete question'); }
  };

  const sf = (k: keyof typeof filter) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setFilter(p => ({ ...p, [k]: e.target.value }));

  // --- OCR / Document Upload Logic ---

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['png', 'jpg', 'jpeg', 'pdf', 'docx', 'doc', 'txt'].includes(ext || '')) {
      toast.error('Unsupported file type. Use image, PDF, Word, or text files.');
      return;
    }
    setUploadFile(file);
    setParsedQuestions([]);
  };

  const processFile = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadProgress('Reading file...');
    try {
      const ext = uploadFile.name.split('.').pop()?.toLowerCase();
      let rawText = '';

      if (ext === 'docx' || ext === 'doc') {
        setUploadProgress('Extracting text from Word document...');
        const arrayBuffer = await uploadFile.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        rawText = result.value;
      } else if (ext === 'txt') {
        rawText = await uploadFile.text();
      } else {
        setUploadProgress('Running OCR on image... This may take a moment.');
        const dataUrl = await readFileAsDataURL(uploadFile);
        const result = await Tesseract.recognize(dataUrl, 'eng', {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setUploadProgress(`OCR: ${Math.round((m.progress || 0) * 100)}%`);
            }
          },
        });
        rawText = result.data.text;
      }

      setUploadProgress('Parsing questions...');
      const questions = parseQuestions(rawText);
      setParsedQuestions(questions);
      if (!questions.length) {
        toast.error('No questions could be detected in the document');
      } else {
        toast.success(`Extracted ${questions.length} questions`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to process file');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const parseQuestions = (text: string): ParsedQuestion[] => {
    const questions: ParsedQuestion[] = [];
    let cleaned = text.replace(/\r\n?/g, '\n');
    cleaned = cleaned.replace(/<[^>]*>/g, ' ');

    const blocks = cleaned.split(/\n{2,}/).filter(Boolean).map(b => b.replace(/\s+/g, ' ').trim());

    for (const block of blocks) {
      const trimmed = block;
      if (trimmed.length < 10) continue;

      const questionEnd = trimmed.search(/\s+[A-D][\.\)]\s/);
      const questionText = questionEnd > -1 ? trimmed.slice(0, questionEnd).trim() : trimmed;
      const rest = questionEnd > -1 ? trimmed.slice(questionEnd) : '';

      const allOptionMatches = [...rest.matchAll(/\b([A-D])[\.\)]\s*(.+?)(?=\s+[A-D][\.\)]|Answer\s*:|Ans\s*:|Correct\s*:|$)/g)];

      if (allOptionMatches.length < 2) continue;

      const options: Record<string, string> = {};
      allOptionMatches.forEach(x => { options[x[1]] = x[2].trim(); });

      const answerMatch = rest.match(/Answer\s*:\s*([A-D])|Ans\s*:\s*([A-D])|Correct\s*:\s*([A-D])/i);
      const answer = answerMatch ? (answerMatch[1] || answerMatch[2] || answerMatch[3]).toUpperCase() : '';

      questions.push({
        question: questionText,
        option1: options['A'] || '',
        option2: options['B'] || '',
        option3: options['C'] || '',
        option4: options['D'] || '',
        answer: answer || 'A',
      });
    }

    return questions;
  };

  const extractOption = (text: string, letter: string): string => {
    const patterns = [
      new RegExp(`\\n${letter}[\.\)]\s+(.+?)(?=\\n[A-D][\.\)]|\\n\\d+[\.\)\-]|\\nAnswer:|\\nAns:|\\nCorrect:|\\Z)`, 's'),
      new RegExp(`\\n${letter}[\.\)]\s+(.+?)(?=\\n|$)`, 's'),
    ];
    for (const pat of patterns) {
      const m = text.match(pat);
      if (m) return m[1].trim();
    }
    return '';
  };

  const extractAnswer = (text: string): string => {
    const answerPatterns = [
      /Answer:\s*([A-D])/i,
      /Ans:\s*([A-D])/i,
      /Correct:\s*([A-D])/i,
      /Correct Answer:\s*([A-D])/i,
      /\b([A-D])\s*is\s*correct/i,
      /\*\*?([A-D])\*\*?/,
    ];
    for (const pat of answerPatterns) {
      const m = text.match(pat);
      if (m) return m[1].toUpperCase();
    }
    return '';
  };

  const updateParsedQuestion = (index: number, field: keyof ParsedQuestion, value: string) => {
    setParsedQuestions(p => p.map((q, i) => i === index ? { ...q, [field]: value } : q));
  };

  const removeParsedQuestion = (index: number) => {
    setParsedQuestions(p => p.filter((_, i) => i !== index));
  };

  const handleBulkCreate = async () => {
    if (!parsedQuestions.length) return;
    if (!form.session || !form.term || !form.course || !form.class) {
      toast.error('Please fill in Session, Term, Course, and Class before bulk uploading');
      return;
    }
    setBulkSubmitting(true);
    try {
      let count = 0;
      for (const q of parsedQuestions) {
        try {
          await api.post(endpoints.staff.cbtQuestions, {
            question: q.question,
            optionA: q.option1,
            optionB: q.option2,
            optionC: q.option3,
            optionD: q.option4,
            answer: q.answer,
            course: form.course,
            class: form.class,
            session: form.session,
            term: form.term,
            duration: form.duration,
          });
          count++;
        } catch { /* skip failed */ }
      }
      toast.success(`Successfully imported ${count} questions`);
      setParsedQuestions([]);
      setUploadFile(null);
      loadQuestions();
    } catch { toast.error('Bulk upload failed'); }
    finally { setBulkSubmitting(false); }
  };

  const sfLocal = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">CBT Management</h1>
        {tab === 'questions' && (
          <button onClick={() => { setEditingId(null); setForm(EMPTY); setShowForm(true); }}
            className="flex items-center gap-2 btn-brand text-white px-4 py-2 rounded-xl text-sm font-medium">
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

      {tab === 'questions' && (
        <div className="flex flex-wrap gap-3">
          <select value={filter.session} onChange={sf('session')} className={SEL_CLS}>
            <option value="">All Sessions</option>
            {sessions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filter.term} onChange={sf('term')} className={SEL_CLS}>
            <option value="">All Terms</option>
            {terms.map(t => <option key={t} value={t}>{t} Term</option>)}
          </select>
          <select value={filter.class} onChange={sf('class')} className={SEL_CLS}>
            <option value="">All Classes</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filter.course} onChange={sf('course')} className={SEL_CLS}>
            <option value="">All Courses</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {/* OCR / Bulk Upload Section */}
      {tab === 'questions' && (
        <div className="bg-white rounded-2xl card shadow-sm p-6 border border-dashed border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Upload size={18} className="text-blue-500" /> Upload Questions (OCR / Document)
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Upload an image, PDF, Word document, or text file. Tesseract.js will extract questions (numbered with A/B/C/D options and answers).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
              <select value={form.session} onChange={sfLocal('session')} className={`w-full ${SEL_CLS}`}>
                <option value="">Select session</option>
                {sessions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
              <select value={form.term} onChange={sfLocal('term')} className={`w-full ${SEL_CLS}`}>
                <option value="">Select term</option>
                {terms.map(t => <option key={t} value={t}>{t} Term</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
              <select value={form.course} onChange={sfLocal('course')} className={`w-full ${SEL_CLS}`}>
                <option value="">Select course</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <select value={form.class} onChange={sfLocal('class')} className={`w-full ${SEL_CLS}`}>
                <option value="">Select class</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
              <input 
                type="number" 
                min="1" 
                max="300" 
                value={form.duration} 
                onChange={(e) => setForm(p => ({ ...p, duration: e.target.value }))}
                className={`w-full ${SEL_CLS}`}
                placeholder="30"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium cursor-pointer hover:bg-gray-200">
              <Upload size={16} /> Choose File
              <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.pdf,.docx,.doc,.txt" className="hidden" onChange={handleFileChange} />
            </label>
            {uploadFile && (
              <span className="text-sm text-gray-600 flex items-center gap-2">
                <FileText size={16} /> {uploadFile.name}
                <button onClick={() => { setUploadFile(null); setParsedQuestions([]); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-red-500 hover:text-red-700"><X size={16} /></button>
              </span>
            )}
            {uploadFile && !uploading && parsedQuestions.length === 0 && (
              <button onClick={processFile} className="btn-brand text-white px-4 py-2 rounded-xl text-sm font-medium">
                Extract Questions
              </button>
            )}
          </div>

          {uploadProgress && (
            <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-xl text-sm">
              {uploadProgress}
            </div>
          )}

          {/* Parsed Questions Preview */}
          {parsedQuestions.length > 0 && (
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Extracted Questions ({parsedQuestions.length})</h3>
                <div className="flex gap-2">
                  <button onClick={handleBulkCreate} disabled={bulkSubmitting}
                    className="btn-brand text-white px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50">
                    {bulkSubmitting ? 'Importing…' : 'Import All'}
                  </button>
                  <button onClick={() => setParsedQuestions([])} className="border border-gray-200 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50">
                    Clear
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-600 sticky top-0">
                    <tr>
                      <th className="p-2 text-left w-10">#</th>
                      <th className="p-2 text-left min-w-[200px]">Question</th>
                      <th className="p-2 text-left min-w-[120px]">Option A</th>
                      <th className="p-2 text-left min-w-[120px]">Option B</th>
                      <th className="p-2 text-left min-w-[120px]">Option C</th>
                      <th className="p-2 text-left min-w-[120px]">Option D</th>
                      <th className="p-2 text-left w-20">Answer</th>
                      <th className="p-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsedQuestions.map((q, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="p-2 text-gray-500">{i + 1}</td>
                        <td className="p-2">
                          <textarea value={q.question} onChange={(e) => updateParsedQuestion(i, 'question', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg p-2 text-sm" rows={2} />
                        </td>
                        <td className="p-2">
                          <input value={q.option1} onChange={(e) => updateParsedQuestion(i, 'option1', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
                        </td>
                        <td className="p-2">
                          <input value={q.option2} onChange={(e) => updateParsedQuestion(i, 'option2', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
                        </td>
                        <td className="p-2">
                          <input value={q.option3} onChange={(e) => updateParsedQuestion(i, 'option3', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
                        </td>
                        <td className="p-2">
                          <input value={q.option4} onChange={(e) => updateParsedQuestion(i, 'option4', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
                        </td>
                        <td className="p-2">
                          <select value={q.answer} onChange={(e) => updateParsedQuestion(i, 'answer', e.target.value)} className={SEL_CLS}>
                            {['A', 'B', 'C', 'D'].map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <button onClick={() => removeParsedQuestion(i)} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && tab === 'questions' && (
        <div className="bg-white rounded-2xl card shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">{editingId ? 'Edit Question' : 'Add Question'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingId && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
                  <select required value={form.session} onChange={(e) => setForm(p => ({ ...p, session: e.target.value }))} className={`w-full ${SEL_CLS}`}>
                    <option value="">Select session</option>
                    {sessions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
                  <select required value={form.term} onChange={(e) => setForm(p => ({ ...p, term: e.target.value }))} className={`w-full ${SEL_CLS}`}>
                    <option value="">Select term</option>
                    {terms.map(t => <option key={t} value={t}>{t} Term</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                  <select required value={form.course} onChange={(e) => setForm(p => ({ ...p, course: e.target.value }))} className={`w-full ${SEL_CLS}`}>
                    <option value="">Select course</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                  <select required value={form.class} onChange={(e) => setForm(p => ({ ...p, class: e.target.value }))} className={`w-full ${SEL_CLS}`}>
                    <option value="">Select class</option>
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2 lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="300" 
                    required
                    value={form.duration} 
                    onChange={(e) => setForm(p => ({ ...p, duration: e.target.value }))}
                    className={`w-full ${SEL_CLS}`}
                    placeholder="e.g. 30"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
              <textarea required rows={2} value={form.question} onChange={(e) => setForm(p => ({ ...p, question: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(['option_a', 'option_b', 'option_c', 'option_d'] as const).map((opt) => (
                <div key={opt}>
                  <label className="block text-sm font-medium text-gray-700 mb-1 uppercase">{opt.replace('_', ' ')}</label>
                  <input required value={form[opt]} onChange={(e) => setForm(p => ({ ...p, [opt]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
              <select value={form.answer} onChange={(e) => setForm(p => ({ ...p, answer: e.target.value }))} className={SEL_CLS}>
                {['A', 'B', 'C', 'D'].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="btn-brand text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-50">
                {submitting ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="border border-gray-200 px-5 py-2 rounded-xl text-sm font-medium hover:bg-gray-50">
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
                  <div className="shimmer h-4 w-3/4" />
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="shimmer h-8 w-full" />
                    ))}
                  </div>
                </div>
                <div className="shimmer w-12 h-12 rounded-lg shrink-0" />
              </div>
            ))}
          </div>
        ) : tab === 'questions' ? (
          questions.length === 0 ? (
            <EmptyState icon={HelpCircle} message="No questions found." card={false} />
          ) : (
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div key={q.id} className="flex items-start justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{i + 1}. {q.question}</p>
                    <div className="grid grid-cols-2 gap-1 mt-2">
                      {(['A', 'B', 'C', 'D'] as const).map((letter) => (
                        <p key={letter} className={`text-xs px-2 py-1 rounded-lg ${
                          q.answer === letter ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-500'
                        }`}>{letter}. {(q as any)[`option${letter}`]}</p>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-4 shrink-0">
                    <button onClick={() => openEdit(q)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={15} /></button>
                    <button onClick={() => handleDelete(q.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
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
                      <td className="py-3"><span className="font-semibold text-gray-800">{r.score}</span><span className="text-gray-400 text-xs ml-1">({r.percentage}%)</span></td>
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
