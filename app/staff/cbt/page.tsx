'use client';
import { EmptyState } from '@/components/ui/StateDisplay';
import { useToast } from '@/components/ui/Toast';
import { useSchoolData } from '@/hooks/useSchoolData';
import { api, endpoints } from '@/lib/api';
import type { CbtQuestion } from '@/types';
import { BarChart2, HelpCircle, Pencil, Plus, Trash2, Upload, FileText, X, Clock, Calendar, CheckCircle2, AlertCircle, Search, CheckSquare, Square } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Tesseract from 'tesseract.js';
import mammoth from 'mammoth';
import clsx from 'clsx';
import RichTextEditor from '@/components/ui/RichTextEditor';

interface CbtResult {
  id: string; score: string; percentage: string; submittedAt: string;
  firstname: string; lastname: string;
  student?: { user?: { uniqueId?: string } };
}

interface CbtTest {
  id: string;
  title: string;
  class: string;
  course: string;
  duration: number;
  questionCount: number;
  startTime: string | null;
  endTime: string | null;
}

interface ParsedQuestion {
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  answer: string;
}

const EMPTY_META = { course: '', class: '', session: '', term: '', duration: '30' };
const EMPTY_Q = { question: '', option_a: '', option_b: '', option_c: '', option_d: '', answer: 'A' };
const EMPTY = { ...EMPTY_Q, ...EMPTY_META };
const SEL_CLS = "border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

type ManualQ = typeof EMPTY_Q & { savedId?: string }; // savedId = DB id once persisted

const DRAFT_KEY = 'cbt_manual_draft';

function saveDraft(meta: typeof EMPTY_META, qs: ManualQ[], step: string) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ meta, qs, step })); } catch {}
}
function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}
function loadDraft(): { meta: typeof EMPTY_META; qs: ManualQ[]; step: string } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function StaffCbt() {
  const [tab, setTab] = useState<'questions' | 'results' | 'tests'>('questions');
  const [questions, setQuestions] = useState<CbtQuestion[]>([]);
  const [results, setResults] = useState<CbtResult[]>([]);
  const [tests, setTests] = useState<CbtTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ class: '', course: '', session: '', term: '', search: '' });
  const toast = useToast();
  const { classes, subjects, sessions, terms } = useSchoolData();

  // ── Schedule modal ────────────────────────────────────────────────────────
  const [scheduleModal, setScheduleModal] = useState<{ open: boolean; test?: CbtTest }>({ open: false });
  const [scheduleForm, setScheduleForm] = useState({ startTime: '', endTime: '' });
  const [scheduleSaving, setScheduleSaving] = useState(false);

  // ── Edit single question ──────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // ── Manual multi-question entry ───────────────────────────────────────────
  // step: null = hidden, 'setup' = pick meta+count, 'entry' = fill questions
  const [manualStep, setManualStep] = useState<null | 'setup' | 'entry'>(null);
  const [manualMeta, setManualMeta] = useState(EMPTY_META);
  const [questionCount, setQuestionCount] = useState(10);
  const [manualQs, setManualQs] = useState<ManualQ[]>([]);
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // OCR / Bulk upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [ocrMeta, setOcrMeta] = useState(EMPTY_META);

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

  const loadTests = () => {
    setLoading(true);
    api.get<any>(endpoints.staff.cbt)
      .then((r) => setTests(r.data ?? []))
      .catch(() => toast.error('Failed to load tests'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (tab === 'questions') loadQuestions();
    else if (tab === 'results') loadResults();
    else loadTests();
    setSelectedIds(new Set()); // clear selection on tab/filter change
  }, [tab, filter]);

  // ── Schedule helpers ──────────────────────────────────────────────────────
  const openScheduleModal = (test: CbtTest) => {
    // Convert ISO strings to datetime-local format (YYYY-MM-DDTHH:mm)
    const toLocal = (iso: string | null) => {
      if (!iso) return '';
      const d = new Date(iso);
      // format to YYYY-MM-DDTHH:mm in local time
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setScheduleForm({ startTime: toLocal(test.startTime), endTime: toLocal(test.endTime) });
    setScheduleModal({ open: true, test });
  };

  const handleSaveSchedule = async () => {
    if (!scheduleModal.test) return;
    if (!scheduleForm.startTime || !scheduleForm.endTime) {
      toast.error('Both start and end times are required');
      return;
    }
    if (new Date(scheduleForm.startTime) >= new Date(scheduleForm.endTime)) {
      toast.error('Start time must be before end time');
      return;
    }
    setScheduleSaving(true);
    try {
      await api.put(endpoints.staff.cbtTestSchedule(scheduleModal.test.id), {
        startTime: new Date(scheduleForm.startTime).toISOString(),
        endTime: new Date(scheduleForm.endTime).toISOString(),
      });
      toast.success('Schedule saved successfully');
      setScheduleModal({ open: false });
      loadTests();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to save schedule');
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleClearSchedule = async () => {
    if (!scheduleModal.test) return;
    setScheduleSaving(true);
    try {
      await api.put(endpoints.staff.cbtTestSchedule(scheduleModal.test.id), {
        startTime: null,
        endTime: null,
      });
      toast.success('Schedule cleared — students can no longer access this test');
      setScheduleModal({ open: false });
      loadTests();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to clear schedule');
    } finally {
      setScheduleSaving(false);
    }
  };

  // ── Restore manual draft on mount ─────────────────────────────────────────
  useEffect(() => {
    const draft = loadDraft();
    if (!draft) return;
    setManualMeta(draft.meta);
    setManualQs(draft.qs);
    if (draft.step === 'entry' || draft.step === 'setup') {
      setManualStep(draft.step as 'entry' | 'setup');
    }
  }, []);

  // ── Persist draft whenever manual state changes ───────────────────────────
  useEffect(() => {
    if (manualStep === null) { clearDraft(); return; }
    saveDraft(manualMeta, manualQs, manualStep);
  }, [manualStep, manualMeta, manualQs]);

  const openEdit = (q: any) => {
    setEditingId(q.id);
    setEditForm({ question: q.question, option_a: q.optionA, option_b: q.optionB, option_c: q.optionC, option_d: q.optionD, answer: q.answer, course: '', class: '', session: '', term: '', duration: '30' });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setEditSubmitting(true);
    try {
      await api.put(`${endpoints.staff.cbtQuestions}/${editingId}`, {
        question: editForm.question, optionA: editForm.option_a, optionB: editForm.option_b,
        optionC: editForm.option_c, optionD: editForm.option_d, answer: editForm.answer,
      });
      toast.success('Question updated');
      setEditingId(null);
      loadQuestions();
    } catch { toast.error('Failed to update question'); }
    finally { setEditSubmitting(false); }
  };

  // ── Bulk selection ────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (ids: string[]) => {
    if (ids.every(id => selectedIds.has(id))) {
      // all visible are selected → deselect all
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(ids));
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} selected question${ids.length !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      await api.delete(endpoints.staff.cbtBulkDeleteQuestions, { ids });
      toast.success(`Deleted ${ids.length} question${ids.length !== 1 ? 's' : ''}`);
      setSelectedIds(new Set());
      loadQuestions();
    } catch {
      toast.error('Failed to delete questions');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this question?')) return;
    try {
      await api.delete(`${endpoints.staff.cbtQuestions}/${id}`);
      toast.success('Question deleted'); loadQuestions();
    } catch { toast.error('Failed to delete question'); }
  };

  // ── Manual entry helpers ──────────────────────────────────────────────────
  const startManualEntry = () => {
    setManualMeta(EMPTY_META);
    setQuestionCount(10);
    setManualQs([]);
    setManualStep('setup');
  };

  const cancelManual = () => {
    clearDraft();
    setManualStep(null);
    setManualQs([]);
    setManualMeta(EMPTY_META);
  };

  const confirmSetup = () => {
    if (!manualMeta.session || !manualMeta.term || !manualMeta.course || !manualMeta.class) {
      toast.error('Please fill in all fields before continuing');
      return;
    }
    setManualQs(Array.from({ length: questionCount }, () => ({ ...EMPTY_Q })));
    setManualStep('entry');
  };

  const updateManualQ = (i: number, field: keyof ManualQ, value: string) => {
    setManualQs(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: value } : q));
  };

  const addManualQ = () => {
    setManualQs(prev => [...prev, { ...EMPTY_Q }]);
  };

  const removeManualQ = (i: number) => {
    setManualQs(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleManualSubmit = async () => {
    const unsaved = manualQs.filter(q => q.question.trim() && !q.savedId);
    if (!unsaved.length) {
      toast.error('All questions are already saved.');
      return;
    }
    setManualSubmitting(true);
    let count = 0;
    const updatedQs = [...manualQs];
    for (let i = 0; i < updatedQs.length; i++) {
      const q = updatedQs[i];
      if (!q.question.trim() || q.savedId) continue; // skip blank or already saved
      try {
        const res = await api.post<any>(endpoints.staff.cbtQuestions, {
          question: q.question, optionA: q.option_a, optionB: q.option_b,
          optionC: q.option_c, optionD: q.option_d, answer: q.answer,
          course: manualMeta.course, class: manualMeta.class,
          session: manualMeta.session, term: manualMeta.term,
          duration: manualMeta.duration,
        });
        // Mark as saved so re-clicking Save never duplicates it
        updatedQs[i] = { ...q, savedId: res?.data?.id ?? 'saved' };
        count++;
      } catch { /* skip failed individually */ }
    }
    setManualQs(updatedQs);
    toast.success(`Saved ${count} question${count !== 1 ? 's' : ''}`);
    const allSaved = updatedQs.filter(q => q.question.trim()).every(q => !!q.savedId);
    if (allSaved) {
      clearDraft();
      setManualStep(null);
      loadQuestions();
    }
    setManualSubmitting(false);
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

    // ── Normalise line endings ─────────────────────────────────────────────
    const normalized = text
      .replace(/<[^>]*>/g, ' ')   // strip HTML tags
      .replace(/\r\n?/g, '\n')    // unify line endings
      .replace(/\t/g, ' ')
      .replace(/[ ]{2,}/g, ' ')   // collapse multiple spaces (but keep newlines)
      .trim();

    // ── Flatten to a single line for inline-format parsing ─────────────────
    // We operate on a flat string so that questions/options spread over
    // multiple lines are still matched.
    const flat = normalized.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ');

    // ── Split into per-question segments on leading number ─────────────────
    // Handles: "1." "2." "10." "1)" "2)" etc.
    const segments = flat
      .split(/(?=\b\d{1,3}[\.\)]\s)/)
      .map(s => s.trim())
      .filter(Boolean);

    for (const seg of segments) {
      // Must start with a question number
      if (!/^\d{1,3}[\.\)]\s/.test(seg)) continue;

      // Strip leading number + separator
      const body = seg.replace(/^\d{1,3}[\.\)]\s*/, '').trim();

      // ── Extract answer ─────────────────────────────────────────────────
      // Handles:
      //   "Answer: C"          — letter only
      //   "Answer: C. All humans" — letter + label
      //   "Ans: C"
      //   "[Answer: B]"
      const answerMatch = body.match(/\[?Ans(?:wer)?\s*:?\s*([A-D])(?:\s*[.\-–]\s*.+?)?\]?/i);
      const answer = answerMatch ? answerMatch[1].toUpperCase() : 'A';

      // Remove answer portion
      const withoutAnswer = body.replace(/\[?Ans(?:wer)?\s*:?\s*[A-D](?:\s*[.\-–]\s*[^\[\]]+?)?\]?\.?/gi, '').trim();

      // ── Detect option format ───────────────────────────────────────────
      // Format A: "(A) text (B) text ..."   ← parenthesised
      // Format B: "A. text B. text ..."     ← dot/period separated
      // Format C: "A) text B) text ..."     ← closing-paren separated
      const hasParenFormat  = /\(A\)/i.test(withoutAnswer);
      const hasDotFormat    = /\bA\.\s/i.test(withoutAnswer);
      const hasCloseParen   = /\bA\)\s/i.test(withoutAnswer);

      let optionString = '';
      let questionText = '';

      if (hasParenFormat) {
        // Find where options begin
        const optStart = withoutAnswer.search(/\(A\)/i);
        if (optStart === -1) continue;
        questionText = withoutAnswer.slice(0, optStart).replace(/[:\-–]\s*$/, '').trim();
        optionString = withoutAnswer.slice(optStart);
      } else if (hasDotFormat) {
        const optStart = withoutAnswer.search(/\bA[\.\)]\s/i);
        if (optStart === -1) continue;
        questionText = withoutAnswer.slice(0, optStart).replace(/[:\-–]\s*$/, '').trim();
        optionString = withoutAnswer.slice(optStart);
      } else if (hasCloseParen) {
        const optStart = withoutAnswer.search(/\bA\)\s/i);
        if (optStart === -1) continue;
        questionText = withoutAnswer.slice(0, optStart).replace(/[:\-–]\s*$/, '').trim();
        optionString = withoutAnswer.slice(optStart);
      } else {
        continue; // can't find options in any known format
      }

      if (!questionText) continue;

      // ── Parse individual options ───────────────────────────────────────
      const opts: Record<string, string> = {};

      if (hasParenFormat) {
        // "(A) value (B) value ..."
        const optRegex = /\(([A-D])\)\s*(.+?)(?=\s*\([A-D]\)|$)/g;
        let m: RegExpExecArray | null;
        while ((m = optRegex.exec(optionString)) !== null) {
          opts[m[1].toUpperCase()] = m[2].trim().replace(/[.\s]+$/, '').trim();
        }
      } else {
        // "A. value B. value ..." or "A) value B) value ..."
        const sep = hasDotFormat ? '\\.' : '\\)';
        const optRegex = new RegExp(`\\b([A-D])${sep}\\s*(.+?)(?=\\s+[A-D]${sep}|$)`, 'g');
        let m: RegExpExecArray | null;
        while ((m = optRegex.exec(optionString)) !== null) {
          opts[m[1].toUpperCase()] = m[2].trim().replace(/[.\s]+$/, '').trim();
        }
      }

      if (Object.keys(opts).length < 2) continue;

      questions.push({
        question: questionText,
        option1: opts['A'] || '',
        option2: opts['B'] || '',
        option3: opts['C'] || '',
        option4: opts['D'] || '',
        answer,
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
    if (!ocrMeta.session || !ocrMeta.term || !ocrMeta.course || !ocrMeta.class) {
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
            course: ocrMeta.course,
            class: ocrMeta.class,
            session: ocrMeta.session,
            term: ocrMeta.term,
            duration: ocrMeta.duration,
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

  const sfLocal = (k: keyof typeof ocrMeta) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
    setOcrMeta(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">CBT Management</h1>
        {tab === 'questions' && manualStep === null && (
          <button onClick={startManualEntry}
            className="flex items-center gap-2 btn-brand text-white px-4 py-2 rounded-xl text-sm font-medium">
            <Plus size={16} /> Add Questions
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('questions')}
          className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
            tab === 'questions' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}>
          Questions
        </button>
        <button onClick={() => setTab('tests')}
          className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
            tab === 'tests' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}>
          <span className="flex items-center gap-1.5"><Calendar size={14} /> Schedules</span>
        </button>
        <button onClick={() => setTab('results')}
          className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
            tab === 'results' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}>
          <span className="flex items-center gap-1.5"><BarChart2 size={14} /> Results</span>
        </button>
      </div>

      {tab === 'questions' && (
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={filter.search}
              onChange={e => setFilter(p => ({ ...p, search: e.target.value }))}
              placeholder="Search question text…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {/* ── Manual entry: Setup step ─────────────────────────────────────── */}
      {tab === 'questions' && manualStep === 'setup' && (
        <div className="bg-white rounded-2xl card shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-800">Set Up Questions</h2>
            <button onClick={cancelManual} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
              <select required value={manualMeta.session} onChange={e => setManualMeta(p => ({ ...p, session: e.target.value }))} className={`w-full ${SEL_CLS}`}>
                <option value="">Select session</option>
                {sessions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
              <select required value={manualMeta.term} onChange={e => setManualMeta(p => ({ ...p, term: e.target.value }))} className={`w-full ${SEL_CLS}`}>
                <option value="">Select term</option>
                {terms.map(t => <option key={t} value={t}>{t} Term</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
              <select required value={manualMeta.course} onChange={e => setManualMeta(p => ({ ...p, course: e.target.value }))} className={`w-full ${SEL_CLS}`}>
                <option value="">Select course</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <select required value={manualMeta.class} onChange={e => setManualMeta(p => ({ ...p, class: e.target.value }))} className={`w-full ${SEL_CLS}`}>
                <option value="">Select class</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input type="number" min="1" max="300" value={manualMeta.duration}
                onChange={e => setManualMeta(p => ({ ...p, duration: e.target.value }))}
                className={`w-full ${SEL_CLS}`} placeholder="30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Questions</label>
              <input type="number" min="1" max="200" value={questionCount}
                onChange={e => setQuestionCount(Math.max(1, parseInt(e.target.value) || 1))}
                className={`w-full ${SEL_CLS}`} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={confirmSetup} className="btn-brand text-white px-5 py-2 rounded-xl text-sm font-medium">
              Continue — Enter {questionCount} Question{questionCount !== 1 ? 's' : ''}
            </button>
            <button onClick={cancelManual} className="border border-gray-200 px-5 py-2 rounded-xl text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Manual entry: Question entry step ────────────────────────────── */}
      {tab === 'questions' && manualStep === 'entry' && (
        <div className="bg-white rounded-2xl card shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Enter Questions</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {manualMeta.course} · {manualMeta.class} · {manualMeta.session} · {manualMeta.term} Term · {manualMeta.duration} min
              </p>
            </div>
            <button onClick={cancelManual} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>

          <div className="space-y-6 mt-5">
            {manualQs.map((q, i) => (
              <div key={i} className={clsx(
                'border rounded-xl p-4 relative',
                q.savedId ? 'border-green-200 bg-green-50/30' : 'border-gray-100 bg-gray-50/50'
              )}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700">Question {i + 1}</span>
                    {q.savedId && (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-100 px-2 py-0.5 rounded-full">
                        ✓ Saved
                      </span>
                    )}
                  </div>
                  {manualQs.length > 1 && !q.savedId && (
                    <button onClick={() => removeManualQ(i)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                  )}
                </div>
                <div className={clsx('space-y-3', q.savedId && 'opacity-60 pointer-events-none')}>
                  <RichTextEditor
                    value={q.question}
                    onChange={val => updateManualQ(i, 'question', val)}
                    placeholder="Enter question text…"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(['option_a', 'option_b', 'option_c', 'option_d'] as const).map((opt) => (
                      <input key={opt} placeholder={`Option ${opt.split('_')[1].toUpperCase()}`} value={q[opt]}
                        onChange={e => updateManualQ(i, opt, e.target.value)}
                        className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 shrink-0">Correct Answer:</label>
                    <select value={q.answer} onChange={e => updateManualQ(i, 'answer', e.target.value)} className={SEL_CLS}>
                      {['A', 'B', 'C', 'D'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-5 pt-5 border-t border-gray-100">
            <button onClick={handleManualSubmit} disabled={manualSubmitting}
              className="btn-brand text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-50">
              {manualSubmitting ? 'Saving…' : `Save ${manualQs.filter(q => q.question.trim() && !q.savedId).length} Unsaved`}
            </button>
            <button onClick={addManualQ}
              className="flex items-center gap-1.5 border border-gray-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 text-gray-700">
              <Plus size={14} /> Add Another
            </button>
            <button onClick={cancelManual} className="ml-auto border border-gray-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 text-gray-600">
              Close
            </button>
          </div>
        </div>
      )}

      {/* OCR / Bulk Upload Section */}
      {tab === 'questions' && manualStep === null && (
        <div className="bg-white rounded-2xl card shadow-sm p-6 border border-dashed border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Upload size={18} className="text-blue-500" /> Upload Questions (OCR / Document)
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Upload an image, PDF, Word document, or text file. Questions are auto-detected in any of these formats:
            <span className="block mt-1 font-mono text-xs text-gray-400">
              1. Question text (A) opt (B) opt (C) opt (D) opt — Answer: A. Label
            </span>
            <span className="block font-mono text-xs text-gray-400">
              1. Question text A. opt B. opt C. opt D. opt Answer: A
            </span>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
              <select value={ocrMeta.session} onChange={sfLocal('session')} className={`w-full ${SEL_CLS}`}>
                <option value="">Select session</option>
                {sessions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
              <select value={ocrMeta.term} onChange={sfLocal('term')} className={`w-full ${SEL_CLS}`}>
                <option value="">Select term</option>
                {terms.map(t => <option key={t} value={t}>{t} Term</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
              <select value={ocrMeta.course} onChange={sfLocal('course')} className={`w-full ${SEL_CLS}`}>
                <option value="">Select course</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <select value={ocrMeta.class} onChange={sfLocal('class')} className={`w-full ${SEL_CLS}`}>
                <option value="">Select class</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
              <input
                type="number" min="1" max="300" value={ocrMeta.duration}
                onChange={e => setOcrMeta(p => ({ ...p, duration: e.target.value }))}
                className={`w-full ${SEL_CLS}`} placeholder="30"
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

      <div className={`bg-white rounded-2xl card shadow-sm p-6${tab === 'tests' ? ' hidden' : ''}`}>
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
            <EmptyState icon={HelpCircle} message="No questions found. Use the filters above to load questions." card={false} />
          ) : (
            <div className="space-y-3">
              {(() => {
                const filtered = filter.search
                  ? questions.filter((q: any) =>
                      q.question?.toLowerCase().includes(filter.search.toLowerCase()) ||
                      q.course?.toLowerCase().includes(filter.search.toLowerCase()) ||
                      (q as any).class?.toLowerCase().includes(filter.search.toLowerCase())
                    )
                  : questions;
                if (filtered.length === 0) return (
                  <EmptyState icon={HelpCircle} message={`No questions match "${filter.search}".`} card={false} />
                );
                return (
                  <>
                    <p className="text-xs text-gray-400 px-1">
                      Showing {filtered.length} of {questions.length} question{questions.length !== 1 ? 's' : ''}
                      {filter.course && <span> · {filter.course}</span>}
                      {filter.class && <span> · {filter.class}</span>}
                    </p>

                    {/* Bulk action toolbar */}
                    <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                      <button
                        onClick={() => toggleSelectAll(filtered.map((q: any) => String(q.id)))}
                        className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 font-medium"
                      >
                        {filtered.every((q: any) => selectedIds.has(String(q.id))) && filtered.length > 0
                          ? <CheckSquare size={15} className="text-blue-600" />
                          : <Square size={15} />}
                        {filtered.every((q: any) => selectedIds.has(String(q.id))) && filtered.length > 0
                          ? 'Deselect All'
                          : `Select All${filter.class || filter.course || filter.session || filter.term || filter.search ? ' Filtered' : ''} (${filtered.length})`}
                      </button>
                      {selectedIds.size > 0 && (
                        <button
                          onClick={() => handleBulkDelete(Array.from(selectedIds))}
                          disabled={bulkDeleting}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
                        >
                          <Trash2 size={13} />
                          {bulkDeleting ? 'Deleting…' : `Delete Selected (${selectedIds.size})`}
                        </button>
                      )}
                    </div>

                    {filtered.map((q: any, i: number) => (
                <div key={q.id}>
                  {/* Inline edit form */}
                  {editingId === String(q.id) ? (
                    <form onSubmit={handleEditSubmit} className="border border-blue-200 rounded-xl p-4 bg-blue-50/30 space-y-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-700">Editing Question {i + 1}</span>
                        <button type="button" onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                      </div>
                      <RichTextEditor
                        value={editForm.question}
                        onChange={val => setEditForm(p => ({ ...p, question: val }))}
                        placeholder="Question text…"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(['option_a', 'option_b', 'option_c', 'option_d'] as const).map((opt) => (
                          <input key={opt} required placeholder={`Option ${opt.split('_')[1].toUpperCase()}`}
                            value={editForm[opt]} onChange={e => setEditForm(p => ({ ...p, [opt]: e.target.value }))}
                            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                        ))}
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-700 shrink-0">Correct Answer:</label>
                        <select value={editForm.answer} onChange={e => setEditForm(p => ({ ...p, answer: e.target.value }))} className={SEL_CLS}>
                          {['A', 'B', 'C', 'D'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <button type="submit" disabled={editSubmitting}
                          className="ml-auto btn-brand text-white px-4 py-1.5 rounded-xl text-sm font-medium disabled:opacity-50">
                          {editSubmitting ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className={clsx(
                      'flex items-start justify-between p-4 border rounded-xl hover:bg-gray-50 transition-colors',
                      selectedIds.has(String(q.id)) ? 'border-blue-300 bg-blue-50/30' : 'border-gray-100'
                    )}>
                      <button
                        onClick={() => toggleSelect(String(q.id))}
                        className="mt-0.5 mr-3 shrink-0 text-gray-400 hover:text-blue-600"
                        aria-label="Select question"
                      >
                        {selectedIds.has(String(q.id))
                          ? <CheckSquare size={16} className="text-blue-600" />
                          : <Square size={16} />}
                      </button>
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
                  )}
                </div>
              ))}
                  </>
                );
              })()}
            </div>
          )
        ) : tab === 'results' ? (
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
        ) : null}
      </div>

      {/* ── Schedules tab ──────────────────────────────────────────────── */}
      {tab === 'tests' && (
        <div className="bg-white rounded-2xl card shadow-sm p-6">
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>
              Students can <strong>only access</strong> a subject's CBT within its scheduled window.
              Tests with no schedule set are <strong>blocked</strong> from students.
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                  <div className="space-y-2 flex-1">
                    <div className="shimmer h-4 w-48" />
                    <div className="shimmer h-3 w-64" />
                  </div>
                  <div className="shimmer h-8 w-28 rounded-lg" />
                </div>
              ))}
            </div>
          ) : tests.length === 0 ? (
            <EmptyState icon={Calendar} message="No tests found. Add questions first to create a test." card={false} />
          ) : (
            <div className="space-y-3">
              {tests.map((test) => {
                const now = new Date();
                const start = test.startTime ? new Date(test.startTime) : null;
                const end = test.endTime ? new Date(test.endTime) : null;
                const isScheduled = !!(start && end);
                const isLive = isScheduled && now >= start! && now <= end!;
                const isUpcoming = isScheduled && now < start!;
                const isExpired = isScheduled && now > end!;

                return (
                  <div key={test.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50/50 gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900 text-sm">{test.course}</p>
                        <span className="text-gray-400 text-xs">·</span>
                        <p className="text-sm text-gray-500">{test.class}</p>
                        <span className="text-gray-400 text-xs">·</span>
                        <p className="text-xs text-gray-400">{test.questionCount} question{test.questionCount !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        {!isScheduled && (
                          <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                            <AlertCircle size={11} /> No schedule — blocked
                          </span>
                        )}
                        {isLive && (
                          <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium animate-pulse">
                            <CheckCircle2 size={11} /> Live now
                          </span>
                        )}
                        {isUpcoming && (
                          <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                            <Clock size={11} /> Upcoming
                          </span>
                        )}
                        {isExpired && (
                          <span className="flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                            <AlertCircle size={11} /> Expired
                          </span>
                        )}
                        {isScheduled && (
                          <span className="text-xs text-gray-500">
                            {new Date(test.startTime!).toLocaleString()} → {new Date(test.endTime!).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => openScheduleModal(test)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 shrink-0"
                    >
                      <Clock size={14} /> {isScheduled ? 'Edit Schedule' : 'Set Schedule'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Schedule Modal ──────────────────────────────────────────────── */}
      {scheduleModal.open && scheduleModal.test && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">Set CBT Schedule</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {scheduleModal.test.course} · {scheduleModal.test.class}
                </p>
              </div>
              <button onClick={() => setScheduleModal({ open: false })}><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Students can only access this CBT between the start and end times you set.
                Outside this window the test is <strong>invisible</strong> to students.
              </p>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Start Date &amp; Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={scheduleForm.startTime}
                  onChange={(e) => setScheduleForm(p => ({ ...p, startTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  End Date &amp; Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={scheduleForm.endTime}
                  onChange={(e) => setScheduleForm(p => ({ ...p, endTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {scheduleForm.startTime && scheduleForm.endTime && new Date(scheduleForm.startTime) < new Date(scheduleForm.endTime) && (
                <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <CheckCircle2 size={13} />
                  Window: {new Date(scheduleForm.endTime).getTime() - new Date(scheduleForm.startTime).getTime() > 0
                    ? (() => {
                        const diffMs = new Date(scheduleForm.endTime).getTime() - new Date(scheduleForm.startTime).getTime();
                        const diffMins = Math.round(diffMs / 60000);
                        const h = Math.floor(diffMins / 60);
                        const m = diffMins % 60;
                        return h > 0 ? `${h}h ${m}m` : `${m}m`;
                      })()
                    : '—'
                  }
                </div>
              )}
            </div>

            <div className="flex gap-2 p-6 border-t border-gray-100">
              {scheduleModal.test.startTime && (
                <button
                  onClick={handleClearSchedule}
                  disabled={scheduleSaving}
                  className="px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                >
                  Clear Schedule
                </button>
              )}
              <button
                onClick={() => setScheduleModal({ open: false })}
                className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSchedule}
                disabled={scheduleSaving}
                className="flex-1 py-2 btn-brand text-white rounded-xl text-sm font-medium disabled:opacity-60"
              >
                {scheduleSaving ? 'Saving…' : 'Save Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
