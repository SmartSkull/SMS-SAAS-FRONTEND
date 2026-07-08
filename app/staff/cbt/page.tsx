'use client';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { EmptyState } from '@/components/ui/StateDisplay';
import { useToast } from '@/components/ui/Toast';
import { useSchoolData } from '@/hooks/useSchoolData';
import { normalizeSchoolLogo, useSelectedSchool } from '@/hooks/useSelectedSchool';
import { api, endpoints, getImageUrl } from '@/lib/api';
import type { CbtQuestion, Student } from '@/types';
import clsx from 'clsx';
import { AlertCircle, BarChart2, Calendar, CheckCircle2, CheckSquare, Clock, FileText, HelpCircle, Pencil, Play, Plus, Printer, Search, Square, Trash2, Upload, UserCircle2, X } from 'lucide-react';
import mammoth from 'mammoth';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Tesseract from 'tesseract.js';

// Resolve the image upload URL relative to the current origin (through the Next.js proxy)
const CBT_IMAGE_UPLOAD_URL = '/api' + (endpoints.staff.cbtUploadImage);

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
  sectionLabel: string;
  sectionOrder: number;
}

const EMPTY_META = { course: '', class: '', session: '', term: '', duration: '30' };
const EMPTY_Q = { question: '', option_a: '', option_b: '', option_c: '', option_d: '', answer: 'A', sectionLabel: '', sectionOrder: 0 };
const EMPTY = { ...EMPTY_Q, ...EMPTY_META };
const SEL_CLS = "border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

// Renders a value that may be plain text or HTML from the rich-text editor.
function HtmlText({ html, className }: { html: string; className?: string }) {
  // Strip single wrapping <p>…</p> that Tiptap adds so content stays inline.
  const inlineHtml = (html ?? '').replace(/^<p>([\s\S]*)<\/p>$/, '$1');
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: inlineHtml }}
    />
  );
}

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
  const [tab, setTab] = useState<'questions' | 'results' | 'tests' | 'omr'>('questions');
  const [questions, setQuestions] = useState<CbtQuestion[]>([]);
  const [results, setResults] = useState<CbtResult[]>([]);
  const [tests, setTests] = useState<CbtTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ class: '', course: '', session: '', term: '', search: '' });
  const [omrStudents, setOmrStudents] = useState<Student[]>([]);
  const [omrForm, setOmrForm] = useState({
    studentId: '',
    studentName: '',
    className: '',
    subject: '',
    session: '',
    term: '',
    date: new Date().toISOString().slice(0, 10),
    studentImage: '',
  });
  const toast = useToast();
  const { classes, subjects, sessions, terms } = useSchoolData();
  const { school } = useSelectedSchool();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // ── Schedule modal ────────────────────────────────────────────────────────
  const [scheduleModal, setScheduleModal] = useState<{ open: boolean; test?: CbtTest }>({ open: false });
  const [scheduleForm, setScheduleForm] = useState({ startTime: '', endTime: '' });
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const [subjectModal, setSubjectModal] = useState<{ open: boolean; test?: CbtTest }>({ open: false });
  const [subjectForm, setSubjectForm] = useState({ course: '' });
  const [subjectSaving, setSubjectSaving] = useState(false);

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
  const [hasDraft, setHasDraft] = useState<boolean>(() => !!loadDraft()); // true when a saved draft exists but hasn't been resumed yet

  // OCR / Bulk upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [ocrMeta, setOcrMeta] = useState(EMPTY_META);

  const loadQuestions = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filter.class) params.class = filter.class;
    if (filter.course) params.course = filter.course;
    if (filter.session) params.session = filter.session;
    if (filter.term) params.term = filter.term;
    api.get<{ data: CbtQuestion[] }>(endpoints.staff.cbtQuestions, params)
      .then((r) => setQuestions(r.data ?? []))
      .catch(() => toast.error('Failed to load questions'))
      .finally(() => setLoading(false));
  }, [filter.class, filter.course, filter.session, filter.term, toast]);

  const loadResults = useCallback(() => {
    setLoading(true);
    api.get<{ data: CbtResult[] }>(endpoints.staff.cbtResults)
      .then((r) => setResults(r.data ?? []))
      .catch(() => toast.error('Failed to load results'))
      .finally(() => setLoading(false));
  }, [toast]);

  const loadTests = useCallback(() => {
    setLoading(true);
    api.get<{ data: CbtTest[] }>(endpoints.staff.cbt)
      .then((r) => setTests(r.data ?? []))
      .catch(() => toast.error('Failed to load tests'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    if (tab === 'questions') loadQuestions();
    else if (tab === 'results') loadResults();
    else if (tab === 'tests') loadTests();
    setSelectedIds(new Set());
  }, [tab, filter.class, filter.course, filter.session, filter.term, filter.search, loadQuestions, loadResults, loadTests]);

  useEffect(() => {
    api.get<{ data: Student[] }>(endpoints.staff.students, { page: 1, limit: 200 })
      .then((r) => setOmrStudents(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  const handleSelectOmrStudent = (studentId: string) => {
    const student = omrStudents.find((item) => String(item.student_id) === studentId);
    if (!student) return;
    setOmrForm((prev) => ({
      ...prev,
      studentId: String(student.student_id ?? ''),
      studentName: `${student.firstname ?? ''} ${student.lastname ?? ''}`.trim(),
      className: student.class ?? '',
      studentImage: student.image ?? '',
    }));
  };

  const handlePrintOmrSheet = () => {
    if (typeof window !== 'undefined') window.print();
  };

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

  const openSubjectModal = (test: CbtTest) => {
    setSubjectForm({ course: test.course });
    setSubjectModal({ open: true, test });
  };

  const handleSaveSubject = async () => {
    if (!subjectModal.test) return;
    if (!subjectForm.course.trim()) {
      toast.error('Please select a valid subject');
      return;
    }
    setSubjectSaving(true);
    try {
      await api.put(endpoints.staff.cbtTest(subjectModal.test.id), {
        course: subjectForm.course,
      });
      toast.success('Subject updated successfully');
      setSubjectModal({ open: false });
      loadTests();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to update subject');
    } finally {
      setSubjectSaving(false);
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

  // ── Persist draft whenever manual state changes (skip on first mount) ──────
  const persistMounted = useRef(false);
  useEffect(() => {
    if (!persistMounted.current) { persistMounted.current = true; return; } // skip initial mount
    if (manualStep === null) {
      // Only wipe the saved draft if there isn't a separate pending one waiting
      // (hasDraft=true means user hasn't resumed yet — don't touch it)
      if (!hasDraft) clearDraft();
      return;
    }
    // Only overwrite the stored draft once the user has actual content
    // (hasDraft=true + manualQs empty = new batch just started, keep old draft safe)
    const hasContent = manualQs.some(q => q.question.trim());
    if (hasDraft && !hasContent) return; // protect old draft until new batch has content
    saveDraft(manualMeta, manualQs, manualStep);
  }, [manualStep, manualMeta, manualQs, hasDraft]);

  const openEdit = (q: any) => {
    setEditingId(q.id);
    setEditForm({ question: q.question, option_a: q.optionA, option_b: q.optionB, option_c: q.optionC, option_d: q.optionD, answer: q.answer, course: '', class: '', session: '', term: '', duration: '30', sectionLabel: q.sectionLabel ?? '', sectionOrder: q.sectionOrder ?? 0 });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setEditSubmitting(true);
    try {
      await api.put(`${endpoints.staff.cbtQuestions}/${editingId}`, {
        question: editForm.question, optionA: editForm.option_a, optionB: editForm.option_b,
        optionC: editForm.option_c, optionD: editForm.option_d, answer: editForm.answer,
        sectionLabel: (editForm as any).sectionLabel || null,
        sectionOrder: (editForm as any).sectionOrder ?? 0,
      });
      toast.success('Question updated');
      setEditingId(null);
      loadQuestions();
    } catch { toast.error('Failed to update question'); }
    finally { setEditSubmitting(false); }
  };

  // ── Bulk selection ────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

  const resumeDraft = () => {
    const draft = loadDraft();
    if (!draft) return;
    setManualMeta(draft.meta);
    setManualQs(draft.qs);
    setManualStep(draft.step === 'entry' ? 'entry' : 'setup');
    setHasDraft(false);
  };

  const discardDraft = () => {
    clearDraft();
    setHasDraft(false);
  };

  const cancelManual = () => {
    // If a saved draft exists in storage (user started a new batch without resuming),
    // don't wipe it — just close the form and let the banner reappear.
    const existingDraft = loadDraft();
    const hasNewContent = manualQs.some(q => q.question.trim());
    if (existingDraft && !hasNewContent) {
      // New batch had no content typed — safe to abandon without touching the draft
      setManualStep(null);
      setManualQs([]);
      setManualMeta(EMPTY_META);
      setHasDraft(true); // bring the banner back
      return;
    }
    clearDraft();
    setHasDraft(false);
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
    let failCount = 0;
    const updatedQs = [...manualQs];
    for (let i = 0; i < updatedQs.length; i++) {
      const q = updatedQs[i];
      if (!q.question.trim() || q.savedId) continue; // skip blank or already saved
      try {
        const res = await api.post<any>(endpoints.staff.cbtQuestions, {
          question: q.question,
          optionA: q.option_a || '',
          optionB: q.option_b || '',
          optionC: q.option_c || null,
          optionD: q.option_d || null,
          answer: q.answer || 'A',
          sectionLabel: q.sectionLabel || null,
          sectionOrder: parseInt(String(q.sectionOrder ?? 0), 10) || 0, // always send integer
          course: manualMeta.course, class: manualMeta.class,
          session: manualMeta.session, term: manualMeta.term,
          duration: manualMeta.duration,
        });
        updatedQs[i] = { ...q, savedId: res?.data?.id ?? 'saved' };
        count++;
      } catch (e: any) {
        failCount++;
        console.error(`Question ${i + 1} failed:`, e?.message ?? e);
      }
    }
    setManualQs(updatedQs);
    if (failCount > 0) {
      toast.error(`${failCount} question${failCount !== 1 ? 's' : ''} failed to save — check your entries`);
    }
    if (count > 0) {
      toast.success(`Saved ${count} question${count !== 1 ? 's' : ''}`);
    }
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
        // Use convertToHtml to preserve more character info, then strip tags
        const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
        rawText = htmlResult.value
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n')
          .replace(/<\/li>/gi, '\n')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
          .replace(/&#\d+;/g, c => {
            const code = parseInt(c.replace(/&#(\d+);/, '$1'), 10);
            return code < 128 ? String.fromCharCode(code) : c;
          });
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

    // ── Normalise ─────────────────────────────────────────────────────────
    const normalized = text
      .replace(/<[^>]*>/g, ' ')
      .replace(/\r\n?/g, '\n')
      .replace(/\t/g, ' ')
      // Fullwidth Unicode → ASCII (e.g. Ａ → A)
      .replace(/\uFF08/g, '(').replace(/\uFF09/g, ')')
      .replace(/[\uFF21-\uFF3A]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
      .replace(/[\uFF41-\uFF5A]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
      .replace(/[\uFF10-\uFF19]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
      // Smart quotes / curly apostrophes → straight
      .replace(/[\u2018\u2019\u02BC]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      // Em/en dashes → hyphen
      .replace(/[\u2013\u2014]/g, '-')
      // Common symbol font remappings (Wingdings, Symbol, APOS-style)
      // Parentheses lookalikes
      .replace(/[\u2768\u276A\u27EC\u2772\u2774\uFD3E]/g, '(')
      .replace(/[\u2769\u276B\u27ED\u2773\u2775\uFD3F]/g, ')')
      // Bullet/period lookalikes that appear as option separators
      .replace(/[\u2022\u2023\u25E6\u2043\u204C\u204D]/g, '.')
      // Non-breaking and other space variants → regular space
      .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
      .replace(/[ ]{2,}/g, ' ')
      .trim();

    // ── Detect section headings before flattening ─────────────────────────
    const lines = normalized.split('\n');
    const sectionMarkers: { lineIdx: number; label: string; order: number }[] = [];
    let sectionOrderCounter = 0;
    // Regex that matches any known option-start pattern
    const OPT_A = /\([Aa]\)|\b[Aa][.)\-] /;
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li].trim();
      if (!line) continue;
      if (/^\d{1,3}[.)]/.test(line)) continue;
      if (/^\(?[A-Da-d][.)\-]/.test(line)) continue;
      if (/^Ans(?:wer)?\s*:/i.test(line)) continue;
      if (line.length < 10) continue;
      if (OPT_A.test(line)) continue;
      sectionOrderCounter++;
      sectionMarkers.push({ lineIdx: li, label: line, order: sectionOrderCounter });
    }

    // Build annotated flat string with «SECTION:n:label» sentinels
    let annotated = '';
    for (let li = 0; li < lines.length; li++) {
      const marker = sectionMarkers.find(m => m.lineIdx === li);
      if (marker) annotated += ` «SECTION:${marker.order}:${marker.label}» `;
      else annotated += lines[li] + ' ';
    }
    const flat = annotated.replace(/[ ]{2,}/g, ' ').trim();

    // ── Pre-process cloze/gap-fill format ─────────────────────────────────
    // Converts: "The _1(A. x B. y C. z D. w) Answer: C told the _2(...) Answer: D"
    // Into individual segments: "1. ___ (A. x B. y C. z D. w) Answer: C"
    // Pattern: _N( options ) Answer: X  (N = 1-3 digit number)
    const clozeRe = /_(\d{1,3})\(([^)]+)\)\s*Answer\s*:?\s*([A-Da-d])/gi;
    const clozeMatches: { num: string; opts: string; ans: string }[] = [];
    let clozeFlat = flat;
    if (clozeRe.test(flat)) {
      clozeRe.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = clozeRe.exec(flat)) !== null)
        clozeMatches.push({ num: m[1], opts: m[2].trim(), ans: m[3].toUpperCase() });
    }

    // ── Split on question numbers ──────────────────────────────────────────
    // Split only when: (start or whitespace) + number + separator + (space or letter)
    // Requires ". " or ") " OR ".Letter" (no space) — but NOT plain numbers like "10 "
    const segments = flat
      .split(/(?:^|(?<=\s))(?=\d{1,3}(?:\.[ A-Za-z"'"'«_(]|\) ))/)
      .map(s => s.trim())
      .filter(Boolean);

    // Inject cloze questions as synthetic segments (avoid duplicates with normal segments)
    const normalNums = new Set(segments.map(s => s.match(/^(\d{1,3})/)?.[1]).filter(Boolean));
    for (const c of clozeMatches) {
      if (!normalNums.has(c.num))
        segments.push(`${c.num}. ___ ${c.opts} Answer: ${c.ans}`);
    }

    let currentSectionLabel = '';
    let currentSectionOrder = 0;

    const skipLog: string[] = [];

    for (const seg of segments) {
      const sectionMatch = seg.match(/«SECTION:(\d+):([^»]+)»/);
      if (sectionMatch) {
        currentSectionOrder = parseInt(sectionMatch[1], 10);
        currentSectionLabel = sectionMatch[2].trim();
      }
      const cleanSeg = seg.replace(/«SECTION:\d+:[^»]+»/g, '').trim();
      if (!/^\d{1,3}[.)]/.test(cleanSeg)) continue;
      const qNum = cleanSeg.match(/^(\d{1,3})/)?.[1] ?? '?';
      const body = cleanSeg.replace(/^\d{1,3}[.)\s]\s*/, '').trim();

      // ── Extract answer ─────────────────────────────────────────────────
      // Handles: "Answer: B" / "Answer: B." / "Answer: (d) text" / "Answer :B."
      const answerMatch = body.match(/Ans(?:wer)?\s*:?\s*\(?([A-Da-d])\)?/i);
      const answer = answerMatch ? answerMatch[1].toUpperCase() : 'A';
      // Strip everything from "Answer" onward (covers "Answer: (d) sun rise and sunset")
      const withoutAnswer = body
        .replace(/\s*Ans(?:wer)?\s*:?\s*\(?[A-Da-d]\)?.*/gi, '')
        .trim();

      // ── Detect option format ───────────────────────────────────────────
      type FmtKey = 'paren' | 'dot' | 'close' | 'dash';
      const fmtTests: [FmtKey, RegExp][] = [
        ['paren', /\([Aa]\)/],
        ['dot',   /(?<![A-Za-z])[Aa]\. /],
        ['close', /(?<![A-Za-z])[Aa]\) /],
        ['dash',  /(?<![A-Za-z])[Aa]- /],
      ];
      let fmt: FmtKey | null = null;
      for (const [key, re] of fmtTests) {
        if (re.test(withoutAnswer)) { fmt = key; break; }
      }
      if (!fmt) {
        skipLog.push(`Q${qNum}: no option format detected — "${withoutAnswer.slice(0, 80)}"`);
        continue;
      }

      // ── Find where options start ───────────────────────────────────────
      const optStartRe: Record<FmtKey, RegExp> = {
        paren: /\([Aa]\)/,
        dot:   /(?<![A-Za-z])[Aa]\. /,
        close: /(?<![A-Za-z])[Aa]\) /,
        dash:  /(?<![A-Za-z])[Aa]- /,
      };
      const optStart = withoutAnswer.search(optStartRe[fmt]);
      if (optStart === -1) continue;
      const questionText = withoutAnswer.slice(0, optStart).replace(/[:\-\u2013]\s*$/, '').trim();
      if (!questionText) continue;
      const optionString = withoutAnswer.slice(optStart);

      // ── Parse options ──────────────────────────────────────────────────
      const opts: Record<string, string> = {};
      if (fmt === 'paren') {
        // (A) text (B) text ...
        const re = /\(([A-Da-d])\)\s*(.+?)(?=\s*\([A-Da-d]\)|$)/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(optionString)) !== null)
          opts[m[1].toUpperCase()] = m[2].trim().replace(/[.\s]+$/, '').trim();
      } else {
        // A. text B. text  OR  A) text B) text  OR  A- text B- text
        // Also handles no-space after separator: "C.foreman" → C = foreman
        const sepChar = fmt === 'dot' ? '\\.' : fmt === 'close' ? '\\)' : '-';
        const re = new RegExp(`(?<![A-Za-z])([A-Da-d])${sepChar}\\s*(.+?)(?=\\s+[A-Da-d]${sepChar}\\s|$)`, 'g');
        let m: RegExpExecArray | null;
        while ((m = re.exec(optionString)) !== null)
          opts[m[1].toUpperCase()] = m[2].trim().replace(/[.\s]+$/, '').trim();
      }

      if (Object.keys(opts).length < 2) {
        skipLog.push(`Q${qNum}: only ${Object.keys(opts).length} option(s) parsed — fmt=${fmt} — "${optionString.slice(0, 80)}"`);
        continue;
      }

      questions.push({
        question: questionText,
        option1: opts['A'] || '',
        option2: opts['B'] || '',
        option3: opts['C'] || '',
        option4: opts['D'] || '',
        answer,
        sectionLabel: currentSectionLabel,
        sectionOrder: currentSectionOrder,
      });
    }

    if (skipLog.length) console.warn('[parseQuestions] Skipped segments:\n' + skipLog.join('\n'));
    console.log('[parseQuestions] segments:', segments.length, '| parsed:', questions.length);
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

  const updateParsedQuestion = (index: number, field: keyof ParsedQuestion, value: string | number) => {
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
      const res = await api.post<any>(endpoints.staff.cbtBulkCreate, {
        data: parsedQuestions,
        course: ocrMeta.course,
        class: ocrMeta.class,
        session: ocrMeta.session,
        term: ocrMeta.term,
        duration: ocrMeta.duration,
      });
      const count = res?.data?.count ?? parsedQuestions.length;
      toast.success(`Successfully imported ${count} questions`);
      setParsedQuestions([]);
      setUploadFile(null);
      loadQuestions();
    } catch (e: any) {
      toast.error(e?.message ?? 'Bulk upload failed');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const sfLocal = (k: keyof typeof ocrMeta) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
    setOcrMeta(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <style jsx global>{`
        @page { size: A4 portrait; margin: 10mm; }
        @media print {
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .print-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 8mm !important;
            margin: 0 auto !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            background: white !important;
            width: 100% !important;
            max-width: 170mm !important;
            box-sizing: border-box !important;
          }
          .print-sheet * { box-sizing: border-box !important; }
          .print-sheet .bubble { border: 2px solid #222 !important; width: 13px !important; height: 13px !important; margin-right: 4px !important; }
          .roll-box { border: 2px solid #222 !important; width: 20px !important; height: 20px !important; margin-right: 4px !important; }
          .print-sheet .grid-cols-12 > * { min-width: 0 !important; }
          .avoid-break { page-break-inside: avoid; }
        }
        /* non-print / screen fallback and consistent layout */
        .print-sheet { max-width: 1100px; margin: 0 auto; }
        .roll-box { width: 26px; height: 22px; border: 2px solid #222; display: inline-block; margin-right: 6px }
        .bubble { width: 16px; height: 16px; border-radius: 50%; border: 2px solid #222; display: inline-block; margin-right: 8px; background: #fff }
        .omr-container .option-group { min-width: 150px; display: flex; gap: 10px; align-items: center; justify-content: space-between }
        .omr-container .text-xs { font-weight: 600; color: #111 }
        .print-sheet .text-gray-600 { color: #333 !important }
        /* Theory / essay print helpers */
        .print-theory .rotate-90, .print-theory .-rotate-90 { color: #999; font-weight: 600 }
        @media print {
          .print-theory .rotate-90, .print-theory .-rotate-90 { color: #666 !important }
          .print-theory .border-dashed { border-style: dashed !important }
        }
      `}</style>
      <div className="flex items-center justify-between no-print">
        <h1 className="text-2xl font-bold text-gray-800">CBT Management</h1>
        {tab === 'questions' && manualStep === null && (
          <button onClick={startManualEntry}
            className="flex items-center gap-2 btn-brand text-white px-4 py-2 rounded-xl text-sm font-medium">
            <Plus size={16} /> Add Questions
          </button>
        )}
      </div>

      <div className="flex gap-2 no-print">
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
        <button onClick={() => setTab('omr')}
          className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
            tab === 'omr' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}>
          <span className="flex items-center gap-1.5"><Printer size={14} /> OMR Sheet</span>
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
                  {/* Section label — optional heading/passage shown above this question group */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Section / Passage Heading <span className="text-gray-400 font-normal">(optional — leave blank for regular questions)</span>
                    </label>
                    <RichTextEditor
                      value={q.sectionLabel ?? ''}
                      onChange={val => updateManualQ(i, 'sectionLabel', val)}
                      placeholder="e.g. Read the passage below and answer questions 1–5…"
                      imageUploadUrl={CBT_IMAGE_UPLOAD_URL}
                    />
                    <p className="text-[11px] text-amber-600 mt-1">
                      ⚠ If set, this heading is shown above <strong>every question in this section</strong>. Assign the same <strong>Section Order</strong> number to all questions that belong together.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 shrink-0">Section Order:</label>
                    <input
                      type="number" min="0" max="999"
                      value={q.sectionOrder ?? 0}
                      onChange={e => updateManualQ(i, 'sectionOrder', String(parseInt(e.target.value) || 0))}
                      className={`w-24 ${SEL_CLS}`}
                      title="Questions with the same Section Order are grouped together and shuffled only within their group. Use 0 for ungrouped questions."
                    />
                    <span className="text-xs text-gray-400">Questions with the same number stay grouped together</span>
                  </div>
                  <RichTextEditor
                    value={q.question}
                    onChange={val => updateManualQ(i, 'question', val)}
                    placeholder="Enter question text…"
                    imageUploadUrl={CBT_IMAGE_UPLOAD_URL}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(['option_a', 'option_b', 'option_c', 'option_d'] as const).map((opt) => (
                      <RichTextEditor
                        key={opt}
                        value={q[opt]}
                        onChange={val => updateManualQ(i, opt, val)}
                        placeholder={`Option ${opt.split('_')[1].toUpperCase()}`}
                        imageUploadUrl={CBT_IMAGE_UPLOAD_URL}
                      />
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

      {/* Draft resume banner — shown when a saved draft exists after login */}
      {tab === 'questions' && manualStep === null && hasDraft && (
        <div className="flex items-center justify-between gap-4 bg-amber-50 border border-amber-300 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <FileText size={18} className="text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-amber-900">You have an unsaved question draft</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {(() => {
                  const d = loadDraft();
                  if (!d) return 'Draft found in local storage.';
                  const saved = d.qs.filter((q: any) => q.savedId).length;
                  const total = d.qs.length;
                  return `${d.meta.course || 'Unknown subject'} · ${d.meta.class || 'Unknown class'} · ${saved} of ${total} question${total !== 1 ? 's' : ''} saved`;
                })()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={resumeDraft}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
            >
              <Play size={14} /> Continue Draft
            </button>
            <button
              onClick={discardDraft}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 text-amber-700 hover:bg-amber-100 text-sm font-medium transition-colors"
            >
              <X size={14} /> Discard
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
              1. Question text (A) opt (B) opt (C) opt (D) opt — Answer: A
            </span>
            <span className="block font-mono text-xs text-gray-400">
              1. Question text A. opt B. opt C. opt D. opt Answer: A
            </span>
            <span className="block mt-1 text-xs text-gray-400">
              Any non-numbered line between questions (e.g. <em>"Section A: Read the passage…"</em>) is automatically detected as a section heading and assigned to the questions that follow. You can edit or clear section headings in the preview table before importing.
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
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-600 sticky top-0">
                    <tr>
                      <th className="p-2 text-left w-10">#</th>
                      <th className="p-2 text-left min-w-[180px]">Question</th>
                      <th className="p-2 text-left min-w-[100px]">Option A</th>
                      <th className="p-2 text-left min-w-[100px]">Option B</th>
                      <th className="p-2 text-left min-w-[100px]">Option C</th>
                      <th className="p-2 text-left min-w-[100px]">Option D</th>
                      <th className="p-2 text-left w-16">Answer</th>
                      <th className="p-2 text-left min-w-[180px]">Section Heading</th>
                      <th className="p-2 text-left w-20">Section Order</th>
                      <th className="p-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsedQuestions.map((q, i) => {
                      const isNewSection = q.sectionLabel && (i === 0 || parsedQuestions[i - 1].sectionOrder !== q.sectionOrder);
                      return (
                        <React.Fragment key={i}>
                          {isNewSection && (
                            <tr key={`section-${i}`} className="bg-amber-50">
                              <td colSpan={10} className="px-3 py-2">
                                <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wide mr-2">Section {q.sectionOrder}:</span>
                                <span className="text-xs text-amber-800">{q.sectionLabel}</span>
                              </td>
                            </tr>
                          )}
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="p-2 text-gray-500">{i + 1}</td>
                            <td className="p-2">
                              <RichTextEditor
                                value={q.question}
                                onChange={val => updateParsedQuestion(i, 'question', val)}
                                placeholder="Question text"
                                imageUploadUrl={CBT_IMAGE_UPLOAD_URL}
                              />
                            </td>
                            <td className="p-2">
                              <RichTextEditor
                                value={q.option1}
                                onChange={val => updateParsedQuestion(i, 'option1', val)}
                                placeholder="Option A"
                                imageUploadUrl={CBT_IMAGE_UPLOAD_URL}
                              />
                            </td>
                            <td className="p-2">
                              <RichTextEditor
                                value={q.option2}
                                onChange={val => updateParsedQuestion(i, 'option2', val)}
                                placeholder="Option B"
                                imageUploadUrl={CBT_IMAGE_UPLOAD_URL}
                              />
                            </td>
                            <td className="p-2">
                              <RichTextEditor
                                value={q.option3}
                                onChange={val => updateParsedQuestion(i, 'option3', val)}
                                placeholder="Option C"
                                imageUploadUrl={CBT_IMAGE_UPLOAD_URL}
                              />
                            </td>
                            <td className="p-2">
                              <RichTextEditor
                                value={q.option4}
                                onChange={val => updateParsedQuestion(i, 'option4', val)}
                                placeholder="Option D"
                                imageUploadUrl={CBT_IMAGE_UPLOAD_URL}
                              />
                            </td>
                            <td className="p-2">
                              <select value={q.answer} onChange={(e) => updateParsedQuestion(i, 'answer', e.target.value)} className={SEL_CLS}>
                                {['A', 'B', 'C', 'D'].map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </td>
                            <td className="p-2">
                              <textarea
                                value={q.sectionLabel}
                                onChange={(e) => updateParsedQuestion(i, 'sectionLabel', e.target.value)}
                                placeholder="Section heading (optional)"
                                className="w-full border border-gray-200 rounded-lg p-2 text-sm"
                                rows={2}
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number" min="0" max="999"
                                value={q.sectionOrder}
                                onChange={(e) => updateParsedQuestion(i, 'sectionOrder', parseInt(e.target.value) || 0)}
                                className="w-full border border-gray-200 rounded-lg p-2 text-sm"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button onClick={() => removeParsedQuestion(i)} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
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
                      {/* Section label */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Section / Passage Heading <span className="text-gray-400 font-normal">(optional)</span></label>
                        <RichTextEditor
                          value={(editForm as any).sectionLabel ?? ''}
                          onChange={val => setEditForm(p => ({ ...p, sectionLabel: val } as any))}
                          placeholder="e.g. Read the passage below and answer questions…"
                          imageUploadUrl={CBT_IMAGE_UPLOAD_URL}
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-700 shrink-0">Section Order:</label>
                        <input
                          type="number" min="0" max="999"
                          value={(editForm as any).sectionOrder ?? 0}
                          onChange={e => setEditForm(p => ({ ...p, sectionOrder: parseInt(e.target.value) || 0 } as any))}
                          className={`w-24 ${SEL_CLS}`}
                        />
                        <span className="text-xs text-gray-400">Same number = same group</span>
                      </div>
                      <RichTextEditor
                        value={editForm.question}
                        onChange={val => setEditForm(p => ({ ...p, question: val }))}
                        placeholder="Question text…"
                        imageUploadUrl={CBT_IMAGE_UPLOAD_URL}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(['option_a', 'option_b', 'option_c', 'option_d'] as const).map((opt) => (
                          <RichTextEditor
                            key={opt}
                            value={editForm[opt]}
                            onChange={val => setEditForm(p => ({ ...p, [opt]: val }))}
                            placeholder={`Option ${opt.split('_')[1].toUpperCase()}`}
                            imageUploadUrl={CBT_IMAGE_UPLOAD_URL}
                          />
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
                      'border rounded-xl hover:bg-gray-50 transition-colors overflow-hidden',
                      selectedIds.has(String(q.id)) ? 'border-blue-300 bg-blue-50/30' : 'border-gray-100'
                    )}>
                      {/* Section heading badge — only at start of each section group */}
                      {q.sectionLabel && (i === 0 || (filtered[i - 1]?.sectionOrder ?? -1) !== (q.sectionOrder ?? 0)) && (
                        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
                          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-0.5">Section Heading (Order: {q.sectionOrder ?? 0})</p>
                          <div
                            className="text-xs text-amber-900 leading-relaxed prose prose-xs max-w-none"
                            dangerouslySetInnerHTML={{ __html: q.sectionLabel! }}
                          />
                        </div>
                      )}
                      <div className="flex items-start justify-between p-4">
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
                        <p className="text-sm font-medium text-gray-800">
                          {i + 1}. <HtmlText html={q.question} className="[&_p]:inline [&_p]:m-0" />
                        </p>
                        <div className="grid grid-cols-2 gap-1 mt-2">
                          {(['A', 'B', 'C', 'D'] as const).map((letter) => (
                            <p key={letter} className={`text-xs px-2 py-1 rounded-lg ${
                              q.answer === letter ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-500'
                            }`}>
                              {letter}. <HtmlText html={(q as any)[`option${letter}`] ?? ''} className="[&_p]:inline [&_p]:m-0" />
                            </p>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-4 shrink-0">
                        <button onClick={() => openEdit(q)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={15} /></button>
                        <button onClick={() => handleDelete(q.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                      </div>
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

      {tab === 'omr' && (
        <div className="space-y-6">
          <div className="no-print bg-white rounded-2xl card shadow-sm p-6 border border-gray-100">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Printable OMR Answer Sheet</h2>
                <p className="text-sm text-gray-500 mt-1">Use this sheet for objective and theory responses. It is optimized for printing or saving as PDF.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={handlePrintOmrSheet} className="btn-brand text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
                  <Printer size={16} /> Print / Save as PDF
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Student</label>
                  <select
                    value={omrForm.studentId}
                    onChange={(e) => handleSelectOmrStudent(e.target.value)}
                    className={SEL_CLS + ' w-full'}
                  >
                    <option value="">Manual entry</option>
                    {omrStudents.map((student) => (
                      <option key={student.student_id} value={student.student_id}>{`${student.firstname ?? ''} ${student.lastname ?? ''}`.trim()} · {student.class ?? '—'}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
                    <input
                      value={omrForm.studentName}
                      onChange={(e) => setOmrForm((prev) => ({ ...prev, studentName: e.target.value }))}
                      className={`${SEL_CLS} w-full`}
                      placeholder="Enter student name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                    <input
                      value={omrForm.studentId}
                      onChange={(e) => setOmrForm((prev) => ({ ...prev, studentId: e.target.value }))}
                      className={`${SEL_CLS} w-full`}
                      placeholder="Enter student ID"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                    <select
                      value={omrForm.className}
                      onChange={(e) => setOmrForm((prev) => ({ ...prev, className: e.target.value }))}
                      className={`${SEL_CLS} w-full`}
                    >
                      <option value="">Select class</option>
                      {classes.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <select
                      value={omrForm.subject}
                      onChange={(e) => setOmrForm((prev) => ({ ...prev, subject: e.target.value }))}
                      className={`${SEL_CLS} w-full`}
                    >
                      <option value="">Select subject</option>
                      {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
                    <select
                      value={omrForm.session}
                      onChange={(e) => setOmrForm((prev) => ({ ...prev, session: e.target.value }))}
                      className={`${SEL_CLS} w-full`}
                    >
                      <option value="">Select session</option>
                      {sessions.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
                    <select
                      value={omrForm.term}
                      onChange={(e) => setOmrForm((prev) => ({ ...prev, term: e.target.value }))}
                      className={`${SEL_CLS} w-full`}
                    >
                      <option value="">Select term</option>
                      {terms.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={omrForm.date}
                    onChange={(e) => setOmrForm((prev) => ({ ...prev, date: e.target.value }))}
                    className={`${SEL_CLS} w-full`}
                  />
                </div>
              </div>

              {/* student preview removed from here — moved into printable sheet */}
            </div>
          </div>

          <div className="bg-white rounded-2xl card shadow-sm p-6 border border-gray-100 print-sheet">

            <div className="text-center mb-4 avoid-break flex items-center justify-between">
              <div className="flex items-center gap-3">
                {school?.logo ? (
                  <img src={normalizeSchoolLogo(school.logo) ?? '/student.png'} alt={school?.name ?? 'School Logo'} className="h-12 w-12 object-contain" />
                ) : null}
                <div>
                  <div className="text-2xl font-bold">{school?.name ?? 'Your Institute Name'}</div>
                  <div className="text-xs text-gray-600">{school?.slogan ?? ''}</div>
                </div>
              </div>
              <div className="inline-block mt-1 px-3 py-1 text-xs bg-gray-900 text-white rounded-full">OMR ANSWER SHEET</div>
            </div>

            <div className="grid grid-cols-12 gap-4 mb-4 avoid-break">
              <div className="col-span-7 border border-gray-300 p-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-2 text-sm font-semibold">ROLL NO.</div>
                    <div className="flex items-center">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="roll-box" style={{ borderWidth: 2 }} />
                      ))}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-semibold">TEST ID</div>
                        <div className="flex items-center mt-2">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="roll-box" style={{ borderWidth: 2 }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-32 flex-shrink-0">
                    {omrForm.studentImage ? (
                      <img
                        src={getImageUrl(omrForm.studentImage) ?? '/student.png'}
                        alt="Student preview"
                        width={128}
                        height={128}
                        className="w-32 h-32 rounded-2xl object-cover border border-gray-200 bg-white shadow-sm"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-2xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 shadow-sm">
                        <UserCircle2 size={72} />
                      </div>
                    )}
                    <div className="text-xs text-gray-500 text-center mt-2">Photo</div>
                  </div>
                </div>
              </div>

              <div className="col-span-5 border border-gray-300 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-gray-600">Name</div>
                    <div className="font-semibold text-gray-900">{omrForm.studentName || '________________________'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Batch</div>
                    <div className="font-semibold text-gray-900">{omrForm.className || '________________'}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-gray-600">Mobile No.</div>
                    <div className="font-semibold text-gray-900">________________________</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Test Date</div>
                    <div className="font-semibold text-gray-900">{omrForm.date || '____/__/__'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="avoid-break omr-container">
              {(() => {
                const TOTAL_QUESTIONS = 50;
                const ROWS = 15; // user requested 15 rows per column
                const COLS = Math.ceil(TOTAL_QUESTIONS / ROWS);
                return (
                  <div className="grid gap-4 text-sm" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
                    {Array.from({ length: COLS }).map((_, col) => (
                      <div key={col} className="space-y-2">
                        {Array.from({ length: ROWS }).map((_, row) => {
                          const qnum = col * ROWS + row + 1;
                          if (qnum > TOTAL_QUESTIONS) return null;
                          return (
                            <div key={qnum} className="flex items-center justify-between w-full">
                              <div className="w-8 font-semibold text-gray-800">{qnum}</div>
                              <div className="flex items-center gap-3 min-w-[140px] justify-between">
                                <label className="flex items-center gap-2"><span className="text-xs font-semibold">A</span><span className="bubble" style={{ borderWidth: 2 }} /></label>
                                <label className="flex items-center gap-2"><span className="text-xs font-semibold">B</span><span className="bubble" style={{ borderWidth: 2 }} /></label>
                                <label className="flex items-center gap-2"><span className="text-xs font-semibold">C</span><span className="bubble" style={{ borderWidth: 2 }} /></label>
                                <label className="flex items-center gap-2"><span className="text-xs font-semibold">D</span><span className="bubble" style={{ borderWidth: 2 }} /></label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="mt-6 avoid-break border-t pt-4 print-theory">
              <div className="text-sm font-semibold mb-2">Theory / Essay Section</div>
              <div className="relative">
                {/* Margin guides (do not write) */}
                <div className="absolute inset-y-0 left-0 w-[18mm] pointer-events-none flex items-center justify-center">
                  <div className="rotate-90 text-xs text-gray-400">Do not write here</div>
                </div>
                <div className="absolute inset-y-0 right-0 w-[18mm] pointer-events-none flex items-center justify-center">
                  <div className="-rotate-90 text-xs text-gray-400">Do not write here</div>
                </div>

                {/* Ruled lines area */}
                <div className="pl-[18mm] pr-[18mm]">
                  <div className="rounded-xl border border-dashed border-gray-300 bg-white">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div key={i} className="h-6 border-b border-gray-200 last:border-b-0" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => openScheduleModal(test)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 shrink-0"
                      >
                        <Clock size={14} /> {isScheduled ? 'Edit Schedule' : 'Set Schedule'}
                      </button>
                      <button
                        onClick={() => openSubjectModal(test)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 shrink-0"
                      >
                        <Pencil size={14} /> Change Subject
                      </button>
                    </div>
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
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSchedule}
                disabled={scheduleSaving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {subjectModal.open && subjectModal.test && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">Change CBT Subject</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Update the subject for this test and all its existing questions.
                </p>
              </div>
              <button onClick={() => setSubjectModal({ open: false })}><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select
                  value={subjectForm.course}
                  onChange={(e) => setSubjectForm({ course: e.target.value })}
                  className={`w-full ${SEL_CLS}`}
                >
                  <option value="">Select subject</option>
                  {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                <p className="font-semibold text-gray-900">Current test:</p>
                <p>{subjectModal.test.course} · {subjectModal.test.class}</p>
              </div>
            </div>

            <div className="flex gap-2 p-6 border-t border-gray-100">
              <button
                onClick={() => setSubjectModal({ open: false })}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSubject}
                disabled={subjectSaving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                Save Subject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
