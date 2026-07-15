'use client';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { EmptyState } from '@/components/ui/StateDisplay';
import { useToast } from '@/components/ui/Toast';
import { useSchoolData } from '@/hooks/useSchoolData';
import { normalizeSchoolLogo, useSelectedSchool } from '@/hooks/useSelectedSchool';
import { api, endpoints, getImageUrl } from '@/lib/api';
import type { CbtQuestion, Student } from '@/types';
import clsx from 'clsx';
import { AlertCircle, BarChart2, Calendar, CheckCircle2, CheckSquare, Clock, Download, FileText, HelpCircle, Pencil, Play, Plus, Printer, Search, Square, Trash2, Upload, UserCircle2, X } from 'lucide-react';
import mammoth from 'mammoth';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Tesseract from 'tesseract.js';

// Resolve the image upload URL relative to the current origin (through the Next.js proxy)
const CBT_IMAGE_UPLOAD_URL = '/api' + (endpoints.staff.cbtUploadImage);

interface CbtResult {
  id: string; score: string; percentage: string; submittedAt: string;
  firstname: string; lastname: string;
  student?: { user?: { uniqueId?: string } };
  test_title?: string;
  class?: string;
  subject?: string;
  session?: string;
  term?: string;
  teachers?: string[];
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
  const [tab, setTab] = useState<'questions' | 'results' | 'tests' | 'schedules' | 'omr'>('questions');
  const [questions, setQuestions] = useState<CbtQuestion[]>([]);
  const [results, setResults] = useState<CbtResult[]>([]);
  const [tests, setTests] = useState<CbtTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ class: '', course: '', session: '', term: '', search: '' });
  const [resultsFilter, setResultsFilter] = useState({ class: '', course: '', session: '', term: '', teacher: '' });

  const resultsTeachers = useMemo(() => {
    const set = new Set<string>();
    results.forEach(r => (r.teachers ?? []).forEach(t => set.add(t)));
    return Array.from(set);
  }, [results]);
  const [omrStudents, setOmrStudents] = useState<Student[]>([]);
  const [omrClass, setOmrClass] = useState('');
  const [omrSubject, setOmrSubject] = useState('');
  const [omrSession, setOmrSession] = useState('');
  const [omrTerm, setOmrTerm] = useState('');
  const [omrDate, setOmrDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedOmrIds, setSelectedOmrIds] = useState<Set<string>>(new Set());
  const [omrPrintSide, setOmrPrintSide] = useState<'front' | 'back' | null>(null);
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
    const params: Record<string, string> = {};
    if (resultsFilter.class) params.class = resultsFilter.class;
    if (resultsFilter.course) params.course = resultsFilter.course;
    if (resultsFilter.session) params.session = resultsFilter.session;
    if (resultsFilter.term) params.term = resultsFilter.term;
    if (resultsFilter.teacher) params.teacher = resultsFilter.teacher;
    api.get<{ data: CbtResult[] }>(endpoints.staff.cbtResults, params)
      .then((r) => setResults(r.data ?? []))
      .catch(() => toast.error('Failed to load results'))
      .finally(() => setLoading(false));
  }, [resultsFilter, toast]);

  const handleDeleteResult = useCallback(async (result: CbtResult) => {
    if (!window.confirm(`Delete result for ${result.firstname} ${result.lastname}?`)) return;
    try {
      await api.delete(endpoints.staff.cbtResult(result.id));
      setResults(prev => prev.filter(r => r.id !== result.id));
      toast.success('Result deleted');
    } catch {
      toast.error('Failed to delete result');
    }
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
    else if (tab === 'tests' || tab === 'schedules') loadTests();
    setSelectedIds(new Set());
  }, [tab, filter.class, filter.course, filter.session, filter.term, filter.search, resultsFilter.class, resultsFilter.course, resultsFilter.session, resultsFilter.term, resultsFilter.teacher, loadQuestions, loadResults, loadTests]);

  useEffect(() => {
    api.get<{ data: Student[] }>(endpoints.staff.students, { page: 1, limit: 200 })
      .then((r) => setOmrStudents(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  const omrClassStudents = useMemo(
    () => omrStudents.filter((s) => s.class === omrClass),
    [omrStudents, omrClass],
  );

  const selectedOmrStudents = useMemo(
    () => omrClassStudents.filter((s) => selectedOmrIds.has(String(s.student_id))),
    [omrClassStudents, selectedOmrIds],
  );

  const handleOmrClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cls = e.target.value;
    setOmrClass(cls);
    setSelectedOmrIds(new Set(omrStudents.filter((s) => s.class === cls).map((s) => String(s.student_id))));
  };

  const toggleOmrStudent = (id: string) => {
    setSelectedOmrIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllOmr = () => setSelectedOmrIds(new Set(omrClassStudents.map((s) => String(s.student_id))));
  const clearAllOmr = () => setSelectedOmrIds(new Set());

  const handlePrintOmrSide = (side: 'front' | 'back') => {
    if (!selectedOmrStudents.length) return;
    setOmrPrintSide(side);
    setTimeout(() => window.print(), 60);
  };

  useEffect(() => {
    const reset = () => setOmrPrintSide(null);
    window.addEventListener('afterprint', reset);
    return () => window.removeEventListener('afterprint', reset);
  }, []);

  const renderOmrSheet = (student: Student) => {
    const studentName = `${student.firstname ?? ''} ${student.lastname ?? ''}`.trim();
    const studentId = String(student.student_id ?? '');
    const sideClass = omrPrintSide === 'front' ? 'print-front-only' : omrPrintSide === 'back' ? 'print-back-only' : '';
    return (
      <div className={`bg-white rounded-2xl card shadow-sm p-5 border border-gray-100 print-sheet omr-landscape ${sideClass}`}>
        {/* FRONT */}
        <div className="omr-page omr-front">
          <div className="omr-columns">
            {/* LEFT: Section B */}
            <div className="omr-half">
              <div className="omr-half-title">Section B — Theory / Essay</div>
              <div className="omr-rules" />
            </div>

            {/* RIGHT: instructions + school + student info + Section A (right half) */}
            <div>
              {/* Letterhead */}
              <div className="avoid-break bg-gradient-to-r from-slate-900 to-slate-700 text-white px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {school?.logo ? (
                    <img src={normalizeSchoolLogo(school.logo) ?? '/student.png'} alt={school?.name ?? 'School Logo'} className="h-12 w-12 object-contain bg-white rounded-lg p-1 shrink-0" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-white/10 flex items-center justify-center text-white font-extrabold text-lg shrink-0">
                      {(school?.name ?? 'S').charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xl font-extrabold leading-tight truncate">{school?.name ?? 'Your Institute Name'}</div>
                    <div className="text-[11px] text-slate-300 truncate">{school?.slogan ?? ''}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="inline-block px-3 py-1 text-[11px] font-bold tracking-widest bg-amber-400 text-slate-900 rounded-full">OMR ANSWER SHEET</div>
                  <div className="text-[10px] text-slate-300 mt-1">{omrSession || '—'} · {omrTerm || '—'}</div>
                </div>
              </div>

              <div className="omr-strip mb-3 mt-3">
                <div className="flex items-center gap-2">
                  {student.image ? (
                    <img src={getImageUrl(student.image) ?? '/student.png'} alt="Student" width={48} height={48} className="w-12 h-12 rounded-lg object-cover border border-slate-200 bg-white" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400">
                      <UserCircle2 size={30} />
                    </div>
                  )}
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Candidate</div>
                    <div className="font-bold text-slate-900 text-sm">{studentName || '________________________'}</div>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Class</div>
                  <div className="font-semibold text-slate-900">{student.class || '________'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Subject</div>
                  <div className="font-semibold text-slate-900">{omrSubject || '________'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Date</div>
                  <div className="font-semibold text-slate-900">{omrDate || '____/__/__'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Roll No.</div>
                  <div className="flex items-center flex-wrap">
                    {Array.from({ length: Math.max(studentId.length, 12) }).map((_, i) => (
                      <div key={i} className="roll-box flex items-center justify-center text-[11px] font-bold text-slate-700" style={{ borderWidth: 2 }}>
                        {studentId[i] ?? ''}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="avoid-break mb-3 rounded-md bg-blue-50 border border-blue-100 px-3 py-2 text-[10px] text-blue-800 flex items-start gap-2">
                <AlertCircle size={12} className="mt-0.5 shrink-0" />
                <span>Use a blue or black pen. Shade the bubble <strong>completely</strong> for your answer and avoid stray marks. If you change an answer, erase it cleanly.</span>
              </div>

              {/* Section A — Objective (50 Questions) */}
              <div className="omr-half-title">Section A — Objective (50 Questions)</div>
              <div className="omr-container grid gap-x-4 gap-y-1 text-[11px]" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                {Array.from({ length: 2 }).map((_, col) => (
                  <div key={col} className="space-y-1">
                    {Array.from({ length: 25 }).map((_, row) => {
                      const q = col * 25 + row + 1;
                      if (q > 50) return null;
                      return (
                        <div key={q} className="flex items-center gap-1.5">
                          <div className="w-5 text-right text-[10px] font-bold text-slate-400 tabular-nums">{q}</div>
                          <div className="flex-1 grid grid-cols-4 gap-1">
                            {['A', 'B', 'C', 'D'].map((opt) => (
                              <label key={opt} className="flex items-center justify-center gap-1 cursor-pointer">
                                <span className="text-[10px] font-bold text-slate-500">{opt}</span>
                                <span className="bubble" style={{ borderWidth: 2 }} />
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section B-only sheet with candidate details (for Section B-only exams) */}
        <div className="omr-page omr-front">
          <div className="omr-columns">
            {/* LEFT: Section B theory */}
            <div className="omr-half">
              <div className="omr-half-title">Section B — Theory / Essay</div>
              <div className="omr-rules" />
            </div>

            {/* RIGHT: school + student info + Section B theory + signatures */}
            <div className="flex flex-col">
              {/* Letterhead */}
              <div className="avoid-break bg-gradient-to-r from-slate-900 to-slate-700 text-white px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {school?.logo ? (
                    <img src={normalizeSchoolLogo(school.logo) ?? '/student.png'} alt={school?.name ?? 'School Logo'} className="h-12 w-12 object-contain bg-white rounded-lg p-1 shrink-0" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-white/10 flex items-center justify-center text-white font-extrabold text-lg shrink-0">
                      {(school?.name ?? 'S').charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xl font-extrabold leading-tight truncate">{school?.name ?? 'Your Institute Name'}</div>
                    <div className="text-[11px] text-slate-300 truncate">{school?.slogan ?? ''}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="inline-block px-3 py-1 text-[11px] font-bold tracking-widest bg-amber-400 text-slate-900 rounded-full">SECTION B SHEET</div>
                  <div className="text-[10px] text-slate-300 mt-1">{omrSession || '—'} · {omrTerm || '—'}</div>
                </div>
              </div>

              <div className="omr-strip mb-3 mt-3">
                <div className="flex items-center gap-2">
                  {student.image ? (
                    <img src={getImageUrl(student.image) ?? '/student.png'} alt="Student" width={48} height={48} className="w-12 h-12 rounded-lg object-cover border border-slate-200 bg-white" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400">
                      <UserCircle2 size={30} />
                    </div>
                  )}
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Candidate</div>
                    <div className="font-bold text-slate-900 text-sm">{studentName || '________________________'}</div>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Class</div>
                  <div className="font-semibold text-slate-900">{student.class || '________'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Subject</div>
                  <div className="font-semibold text-slate-900">{omrSubject || '________'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Date</div>
                  <div className="font-semibold text-slate-900">{omrDate || '____/__/__'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Roll No.</div>
                  <div className="flex items-center flex-wrap">
                    {Array.from({ length: Math.max(studentId.length, 12) }).map((_, i) => (
                      <div key={i} className="roll-box flex items-center justify-center text-[11px] font-bold text-slate-700" style={{ borderWidth: 2 }}>
                        {studentId[i] ?? ''}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="omr-half-title">Section B — Theory / Essay</div>
              <div className="omr-rules" />

              <div className="mt-4 grid grid-cols-2 gap-8 border-t border-slate-200 pt-2">
                <div>
                  <div className="h-7 border-b border-slate-400" />
                  <div className="text-[10px] text-slate-500 mt-1">Candidate&apos;s Signature</div>
                </div>
                <div>
                  <div className="h-7 border-b border-slate-400" />
                  <div className="text-[10px] text-slate-500 mt-1">Invigilator&apos;s Signature</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BACK: info on LEFT, Section B on RIGHT */}
        <div className="omr-page omr-back">
          <div className="omr-columns">
            {/* LEFT: school + student info */}
            <div className="flex flex-col">
              <div className="avoid-break bg-gradient-to-r from-slate-900 to-slate-700 text-white px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {school?.logo ? (
                    <img src={normalizeSchoolLogo(school.logo) ?? '/student.png'} alt={school?.name ?? 'School Logo'} className="h-12 w-12 object-contain bg-white rounded-lg p-1 shrink-0" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-white/10 flex items-center justify-center text-white font-extrabold text-lg shrink-0">
                      {(school?.name ?? 'S').charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xl font-extrabold leading-tight truncate">{school?.name ?? 'Your Institute Name'}</div>
                    <div className="text-[11px] text-slate-300 truncate">{school?.slogan ?? ''}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="inline-block px-3 py-1 text-[11px] font-bold tracking-widest bg-amber-400 text-slate-900 rounded-full">OMR ANSWER SHEET</div>
                  <div className="text-[10px] text-slate-300 mt-1">{omrSession || '—'} · {omrTerm || '—'}</div>
                </div>
              </div>

              <div className="omr-strip mb-3 mt-3">
                <div className="flex items-center gap-2">
                  {student.image ? (
                    <img src={getImageUrl(student.image) ?? '/student.png'} alt="Student" width={48} height={48} className="w-12 h-12 rounded-lg object-cover border border-slate-200 bg-white" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400">
                      <UserCircle2 size={30} />
                    </div>
                  )}
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Candidate</div>
                    <div className="font-bold text-slate-900 text-sm">{studentName || '________________________'}</div>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Class</div>
                  <div className="font-semibold text-slate-900">{student.class || '________'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Subject</div>
                  <div className="font-semibold text-slate-900">{omrSubject || '________'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Date</div>
                  <div className="font-semibold text-slate-900">{omrDate || '____/__/__'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Roll No.</div>
                  <div className="flex items-center flex-wrap">
                    {Array.from({ length: Math.max(studentId.length, 12) }).map((_, i) => (
                      <div key={i} className="roll-box flex items-center justify-center text-[11px] font-bold text-slate-700" style={{ borderWidth: 2 }}>
                        {studentId[i] ?? ''}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="omr-rules" />
            </div>

            {/* RIGHT: Section B continued */}
            <div className="omr-half">
              <div className="omr-half-title">Section B — Theory / Essay (continued)</div>
              <div className="omr-rules" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-8 border-t border-slate-200 pt-2">
            <div>
              <div className="h-7 border-b border-slate-400" />
              <div className="text-[10px] text-slate-500 mt-1">Candidate&apos;s Signature</div>
            </div>
            <div>
              <div className="h-7 border-b border-slate-400" />
              <div className="text-[10px] text-slate-500 mt-1">Invigilator&apos;s Signature</div>
            </div>
          </div>
        </div>
      </div>
    );
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

  const handleExportResultsPDF = () => {
    if (!results.length) return;

    const filterMeta = [
      resultsFilter.class && `Class: <strong>${resultsFilter.class}</strong>`,
      resultsFilter.course && `Subject: <strong>${resultsFilter.course}</strong>`,
      resultsFilter.session && `Session: <strong>${resultsFilter.session}</strong>`,
      resultsFilter.term && `Term: <strong>${resultsFilter.term} Term</strong>`,
      resultsFilter.teacher && `Teacher: <strong>${resultsFilter.teacher}</strong>`,
    ].filter(Boolean).join(' &nbsp;·&nbsp; ');

    const rows = results.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${r.firstname} ${r.lastname}</strong></td>
        <td class="mono">${r.student?.user?.uniqueId ?? '—'}</td>
        <td>${r.class ?? '—'}</td>
        <td>${r.subject ?? '—'}</td>
        <td>${r.session ?? '—'}</td>
        <td>${r.term ?? '—'}</td>
        <td>${(r.teachers ?? []).join(', ') || '—'}</td>
        <td><strong>${r.score}</strong> <span class="pct">(${r.percentage}%)</span></td>
        <td>${new Date(r.submittedAt).toLocaleDateString()}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>CBT Results</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11pt; color: #111; margin: 0; padding: 0; }
    h1 { font-size: 16pt; margin: 0 0 4px; }
    .meta { font-size: 9pt; color: #555; margin-bottom: 16px; }
    .meta span { margin-right: 12px; }
    .summary { font-size: 10pt; color: #333; margin-bottom: 8px; }
    .print-date { float: right; color: #888; font-size: 9pt; }
    table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
    thead tr { background: #1e3a5f; color: #fff; }
    thead th { padding: 6px 8px; text-align: left; font-weight: 600; }
    tbody tr:nth-child(even) { background: #f5f7fa; }
    tbody tr { border-bottom: 1px solid #ddd; }
    td { padding: 5px 8px; vertical-align: middle; }
    tfoot td { padding: 8px; font-weight: bold; border-top: 2px solid #333; font-size: 10pt; }
    .mono { font-family: monospace; font-size: 8.5pt; }
    .pct { color: #666; font-size: 8.5pt; }
  </style>
</head>
<body>
  <h1>CBT Results</h1>
  <div class="meta">
    <span class="print-date">Printed: ${new Date().toLocaleDateString()}</span>
    ${filterMeta || '<em>All results</em>'}
  </div>
  <div class="summary">Total students: <strong>${results.length}</strong></div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Student</th>
        <th>Student ID</th>
        <th>Class</th>
        <th>Subject</th>
        <th>Session</th>
        <th>Term</th>
        <th>Teacher(s)</th>
        <th>Score</th>
        <th>Date</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="10">Total: ${results.length} student${results.length !== 1 ? 's' : ''}</td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      toast.error('Pop-up blocked. Please allow pop-ups for this site and try again.');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 300);
  };

  const sfLocal = (k: keyof typeof ocrMeta) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
    setOcrMeta(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <style jsx global>{`
        @page { size: A4 landscape; margin: 6mm; }
        @media print {
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }

          /* ── Results PDF export ──────────────────────────────────────── */
          /* Hide sidebar (fixed aside) and sticky header navbar            */
          aside, header { display: none !important; }
          /* The content wrapper: reset margin so it fills the full width   */
          .portal-theme > div.flex-1 { margin-left: 0 !important; }
          /* Shrink padding so content fills the page */
          .portal-theme main { padding: 8px 12px !important; }
          /* Fit results table to page */
          #cbt-results-print-area { width: 100% !important; }
          #cbt-results-print-area table { font-size: 10pt !important; border-collapse: collapse !important; }
          #cbt-results-print-area th { font-size: 9pt !important; padding: 4px 6px !important; background: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #cbt-results-print-area td { padding: 4px 6px !important; border-bottom: 1px solid #e2e8f0 !important; }

          /* Bulk OMR: hide non-selected sheets on screen, show all when printing; split front/back */
          .screen-hide { display: block !important; }
          .print-front-only .omr-back { display: none !important; }
          .print-back-only .omr-front { display: none !important; }
          /* Kill the space-y top gap and the sidebar's reserved left margin */
          [class*="space-y"] > * + * { margin-top: 0 !important; }
          .portal-theme > div { margin-left: 0 !important; }
          .print-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 auto !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            background: white !important;
            width: auto !important;
            max-width: 285mm !important;
            box-sizing: border-box !important;
            page-break-before: always;
          }
          .print-sheet * { box-sizing: border-box !important; }
          .print-sheet .bubble { border: 1px solid #222 !important; width: 9px !important; height: 9px !important; margin-right: 2px !important; }
          .roll-box { border: 1px solid #222 !important; width: 15px !important; height: 15px !important; margin-right: 2px !important; }
          .print-sheet .omr-container { width: 100% !important; column-gap: 4mm !important; row-gap: 1px !important; }
          .print-sheet .omr-container .flex { gap: 2px !important; }
          .print-sheet .omr-container .text-sm { font-size: 10px !important; }
          .print-sheet .omr-container .text-xs { font-size: 8px !important; }
          .print-sheet .omr-container .min-w-\[140px\] { min-width: 0 !important; }
          .print-sheet .omr-container .gap-3 { gap: 0.35rem !important; }
          .print-sheet .omr-container .gap-4 { gap: 0.4rem !important; }
          .print-sheet .grid-cols-12 > * { min-width: 0 !important; }
          .print-sheet .from-slate-900 { padding: 2.5mm 4mm !important; }
          .print-sheet .mt-3 { margin-top: 2mm !important; }
          .print-sheet .mb-3 { margin-bottom: 2mm !important; }
          .avoid-break { page-break-inside: avoid; }
          .omr-page { page-break-after: always; }
          .omr-page:last-child { page-break-after: auto; }
          .omr-columns { display: grid !important; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important; gap: 4mm !important; }
          .omr-columns > * { min-width: 0 !important; }
          .omr-page { min-height: 196mm !important; display: flex !important; flex-direction: column !important; }
          .omr-page > .omr-columns { flex: 1 1 auto !important; }
          .omr-half { border: 1px solid #94a3b8 !important; border-radius: 6px !important; padding: 2.5mm !important; display: flex !important; flex-direction: column !important; }
          .omr-half-title { font-size: 10px !important; font-weight: 800 !important; text-transform: uppercase !important; letter-spacing: .03em !important; color: #0f172a !important; border-bottom: 2px solid #0f172a !important; padding-bottom: 1px !important; margin-bottom: 2px !important; }
          .omr-back-head { font-size: 9px !important; font-weight: 700 !important; color: #334155 !important; border-bottom: 1px solid #94a3b8 !important; padding-bottom: 1px !important; margin-bottom: 2px !important; }
          .omr-strip { display: flex !important; flex-wrap: wrap !important; gap: 3mm !important; align-items: center !important; margin: 2mm 0 !important; }
        }
        /* non-print / screen fallback and consistent layout */
        .screen-hide { display: none; }
        .print-sheet { max-width: 1100px; margin: 0 auto; }
        .omr-landscape .omr-page { margin-bottom: 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
        .omr-landscape .omr-columns { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 14px; }
        .omr-landscape .omr-half { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; }
        .omr-rules {
          flex: 1 1 auto;
          min-height: 220px;
          border: 1px dashed #cbd5e1;
          border-radius: 6px;
          background-color: #fff;
          background-image: repeating-linear-gradient(to bottom, #ffffff 0, #ffffff 23px, #cbd5e1 23px, #cbd5e1 24px);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .omr-landscape .omr-half-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .03em; color: #0f172a; border-bottom: 2px solid #0f172a; padding-bottom: 3px; margin-bottom: 6px; }
        .omr-landscape .omr-back-head { font-size: 11px; font-weight: 700; color: #334155; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 6px; }
        .omr-landscape .omr-strip { display: flex; flex-wrap: wrap; gap: 18px; align-items: center; }
        .omr-sheet { background: #f8fafc; border: 1px solid #e2e8f0; }
        .omr-sheet .sheet-header { border-radius: 1rem; padding: 1.25rem 1.5rem; background: #ffffff; border: 1px solid #e2e8f0; }
        .omr-sheet .sheet-header .title { font-size: 1.15rem; letter-spacing: -0.02em; }
        .omr-sheet .sheet-header .subtitle { color: #4b5563; }
        .omr-sheet .sheet-tip { color: #475569; font-size: 0.9rem; }
        .omr-sheet .sheet-info { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 1rem; padding: 1rem; }
        .omr-sheet .sheet-info .info-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
        .omr-sheet .sheet-info .field-label { font-size: 0.75rem; font-weight: 700; color: #475569; letter-spacing: 0.01em; }
        .omr-sheet .sheet-info .field-value { font-size: 0.95rem; color: #111827; font-weight: 700; }
        .omr-sheet .omr-details { background: #ffffff; border-radius: 1rem; border: 1px solid #e5e7eb; padding: 1rem; }
        .omr-sheet .omr-details .bubble-row { padding: 0.65rem 0.8rem; border-radius: 0.85rem; background: #f8fafc; border: 1px solid #e5e7eb; }
        .omr-sheet .omr-details .bubble-label { display: inline-flex; align-items: center; gap: 0.35rem; color: #475569; font-weight: 700; font-size: 0.75rem; }
        .omr-sheet .omr-details .question-row { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.75rem 0.9rem; border-radius: 0.85rem; border: 1px solid #e5e7eb; background: #ffffff; }
        .omr-sheet .omr-details .question-row + .question-row { margin-top: 0.35rem; }
        .omr-sheet .omr-details .question-number { width: 2.2rem; min-width: 2.2rem; color: #111827; font-weight: 700; }
        .omr-sheet .omr-details .bubble { width: 18px; height: 18px; margin-right: 6px; }
        .omr-sheet .omr-details .roll-box { width: 26px; height: 26px; margin-right: 6px; }
        .omr-sheet .omr-details .photo-preview { border-radius: 1rem; }
        .omr-sheet .text-xs { font-size: 0.75rem; }
        .omr-sheet .text-sm { font-size: 0.95rem; }
        .omr-sheet .text-gray-600 { color: #4b5563 !important; }
        .omr-sheet .print-theory .rotate-90, .omr-sheet .print-theory .-rotate-90 { color: #6b7280; font-weight: 600; }
        .omr-sheet .print-theory .border-dashed { border-style: dashed !important; }
        .roll-box { width: 24px; height: 22px; border: 2px solid #334155; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; margin-right: 0; background: #fff; }
        .bubble { width: 20px; height: 20px; border-radius: 50%; border: 2px solid #334155; display: inline-flex; align-items: center; justify-content: center; margin-right: 0; background: #fff; box-shadow: inset 0 0 0 2px #fff; }
        .omr-sheet .omr-details .bubble-row:hover { background: #eef2ff; }
        .omr-container .option-group { min-width: 150px; display: flex; gap: 10px; align-items: center; justify-content: space-between }
        .omr-container .text-xs { font-weight: 600; color: #111 }
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

      <div className="flex gap-2 no-print overflow-x-auto sm:overflow-visible">
        <button onClick={() => setTab('questions')}
          className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors shrink-0 whitespace-nowrap ${
            tab === 'questions' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}>
          Questions
        </button>
        <button onClick={() => setTab('tests')}
          className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors shrink-0 whitespace-nowrap ${
            tab === 'tests' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}>
          <span className="flex items-center gap-1.5"><Calendar size={14} /> Tests</span>
        </button>
        <button onClick={() => setTab('schedules')}
          className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors shrink-0 whitespace-nowrap ${
            tab === 'schedules' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}>
          <span className="flex items-center gap-1.5"><Clock size={14} /> Schedules</span>
        </button>
        <button onClick={() => setTab('results')}
          className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors shrink-0 whitespace-nowrap ${
            tab === 'results' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}>
          <span className="flex items-center gap-1.5"><BarChart2 size={14} /> Results</span>
        </button>
        <button onClick={() => setTab('omr')}
          className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors shrink-0 whitespace-nowrap ${
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

      <div className={`bg-white rounded-2xl card shadow-sm p-6${tab === 'tests' || tab === 'schedules' ? ' hidden' : ''}`}>
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
          <div>
            <div className="flex flex-wrap gap-3 mb-4 items-center">
              <select value={resultsFilter.class} onChange={(e) => setResultsFilter(p => ({ ...p, class: e.target.value }))} className={SEL_CLS}>
                <option value="">All Classes</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={resultsFilter.course} onChange={(e) => setResultsFilter(p => ({ ...p, course: e.target.value }))} className={SEL_CLS}>
                <option value="">All Subjects</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={resultsFilter.session} onChange={(e) => setResultsFilter(p => ({ ...p, session: e.target.value }))} className={SEL_CLS}>
                <option value="">All Sessions</option>
                {sessions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={resultsFilter.term} onChange={(e) => setResultsFilter(p => ({ ...p, term: e.target.value }))} className={SEL_CLS}>
                <option value="">All Terms</option>
                {terms.map(t => <option key={t} value={t}>{t} Term</option>)}
              </select>
              <select value={resultsFilter.teacher} onChange={(e) => setResultsFilter(p => ({ ...p, teacher: e.target.value }))} className={SEL_CLS}>
                <option value="">All Teachers</option>
                {resultsTeachers.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button
                onClick={handleExportResultsPDF}
                disabled={results.length === 0}
                className="btn-brand text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ml-auto no-print disabled:opacity-50"
              >
                <Download size={16} /> Export to PDF
              </button>
            </div>
            {results.length === 0 ? (
              <EmptyState icon={BarChart2} message="No CBT results yet." card={false} />
            ) : (
              <>
              {/* Print header — only visible when printing */}
              <div className="hidden print:block mb-4">
                <h2 className="text-lg font-bold text-gray-900">CBT Results</h2>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-1">
                  {resultsFilter.class && <span><strong>Class:</strong> {resultsFilter.class}</span>}
                  {resultsFilter.course && <span><strong>Subject:</strong> {resultsFilter.course}</span>}
                  {resultsFilter.session && <span><strong>Session:</strong> {resultsFilter.session}</span>}
                  {resultsFilter.term && <span><strong>Term:</strong> {resultsFilter.term} Term</span>}
                  {resultsFilter.teacher && <span><strong>Teacher:</strong> {resultsFilter.teacher}</span>}
                  <span><strong>Total Students:</strong> {results.length}</span>
                  <span className="ml-auto text-gray-400">Printed: {new Date().toLocaleDateString()}</span>
                </div>
              </div>

              {/* Summary bar — visible on screen only */}
              <div className="no-print flex items-center justify-between mb-3 px-1">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">{results.length}</span> student{results.length !== 1 ? 's' : ''} found
                  {resultsFilter.class && <span className="text-gray-400"> · {resultsFilter.class}</span>}
                  {resultsFilter.course && <span className="text-gray-400"> · {resultsFilter.course}</span>}
                  {resultsFilter.session && <span className="text-gray-400"> · {resultsFilter.session}</span>}
                  {resultsFilter.term && <span className="text-gray-400"> · {resultsFilter.term} Term</span>}
                </p>
              </div>

              <div className="overflow-x-auto" id="cbt-results-print-area">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="pb-3 font-medium">#</th>
                      <th className="pb-3 font-medium">Student</th>
                      <th className="pb-3 font-medium">Student ID</th>
                      <th className="pb-3 font-medium">Class</th>
                      <th className="pb-3 font-medium">Subject</th>
                      <th className="pb-3 font-medium">Session</th>
                      <th className="pb-3 font-medium">Term</th>
                      <th className="pb-3 font-medium">Teacher(s)</th>
                      <th className="pb-3 font-medium">Score</th>
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium no-print"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {results.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="py-3 text-gray-400 text-xs">{i + 1}</td>
                        <td className="py-3 font-medium text-gray-800">{r.firstname} {r.lastname}</td>
                        <td className="py-3 text-gray-500 font-mono text-xs">{r.student?.user?.uniqueId ?? '—'}</td>
                        <td className="py-3 text-gray-500">{r.class ?? '—'}</td>
                        <td className="py-3 text-gray-500">{r.subject ?? '—'}</td>
                        <td className="py-3 text-gray-500">{r.session ?? '—'}</td>
                        <td className="py-3 text-gray-500">{r.term ?? '—'}</td>
                        <td className="py-3 text-gray-500">{(r.teachers ?? []).join(', ') || '—'}</td>
                        <td className="py-3"><span className="font-semibold text-gray-800">{r.score}</span><span className="text-gray-400 text-xs ml-1">({r.percentage}%)</span></td>
                        <td className="py-3 text-gray-500">{new Date(r.submittedAt).toLocaleDateString()}</td>
                        <td className="py-3 no-print">
                          <button onClick={() => handleDeleteResult(r)} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg">
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Print footer showing total */}
                  <tfoot className="border-t border-gray-200">
                    <tr>
                      <td colSpan={8} className="pt-3 text-sm font-semibold text-gray-700">Total Students: {results.length}</td>
                      <td colSpan={3} className="pt-3 text-xs text-gray-400 text-right no-print"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              </>
            )
          }
        </div>
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
                <button
                  disabled={!selectedOmrStudents.length}
                  onClick={() => handlePrintOmrSide('front')}
                  className="btn-brand text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  <Printer size={16} /> Print Front Page
                </button>
                <button
                  disabled={!selectedOmrStudents.length}
                  onClick={() => handlePrintOmrSide('back')}
                  className="btn-brand text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  <Printer size={16} /> Print Back Page
                </button>
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-1.5">
                  <AlertCircle size={14} className="shrink-0" />
                  In the print dialog, set <strong>Orientation → Landscape</strong> so the sheet fits on A4.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                  <select value={omrClass} onChange={handleOmrClassChange} className={SEL_CLS + ' w-full'}>
                    <option value="">Select class</option>
                    {classes.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <select value={omrSubject} onChange={(e) => setOmrSubject(e.target.value)} className={`${SEL_CLS} w-full`}>
                      <option value="">Select subject</option>
                      {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
                    <select value={omrSession} onChange={(e) => setOmrSession(e.target.value)} className={`${SEL_CLS} w-full`}>
                      <option value="">Select session</option>
                      {sessions.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
                    <select value={omrTerm} onChange={(e) => setOmrTerm(e.target.value)} className={`${SEL_CLS} w-full`}>
                      <option value="">Select term</option>
                      {terms.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input type="date" value={omrDate} onChange={(e) => setOmrDate(e.target.value)} className={`${SEL_CLS} w-full`} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Students to print: {selectedOmrStudents.length}/{omrClassStudents.length}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={selectAllOmr} disabled={!omrClassStudents.length} className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-40">Select all</button>
                    <button onClick={clearAllOmr} disabled={!omrClassStudents.length} className="text-xs font-medium text-gray-500 hover:underline disabled:opacity-40">Clear</button>
                  </div>
                </div>
                <div className="border rounded-xl max-h-64 overflow-y-auto divide-y divide-gray-100">
                  {!omrClass ? (
                    <p className="p-3 text-sm text-gray-400">Select a class to see its students.</p>
                  ) : omrClassStudents.length === 0 ? (
                    <p className="p-3 text-sm text-gray-400">No students found for this class.</p>
                  ) : (
                    omrClassStudents.map((s) => {
                      const id = String(s.student_id);
                      const checked = selectedOmrIds.has(id);
                      return (
                        <label key={id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                          <input type="checkbox" checked={checked} onChange={() => toggleOmrStudent(id)} className="accent-blue-600" />
                          <span className="text-sm text-gray-800">{`${s.firstname ?? ''} ${s.lastname ?? ''}`.trim()}</span>
                          <span className="text-xs text-gray-400 ml-auto font-mono">{id}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="no-print text-xs text-gray-500">
            Preview shows the first selected student. Printing includes all {selectedOmrStudents.length} selected student(s).
          </div>

          {selectedOmrStudents.map((s, i) => (
            <div key={String(s.student_id)} className={i === 0 ? '' : 'screen-hide'}>
              {renderOmrSheet(s)}
            </div>
          ))}
        </div>
      )}

      {/* ── Tests tab ────────────────────────────────────────────────── */}
      {tab === 'tests' && (
        <div className="bg-white rounded-2xl card shadow-sm p-6">
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>
              All CBT tests created so far. Use this tab to review tests and change their subjects if needed.
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
                            <AlertCircle size={11} /> No schedule set
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

      {/* ── Schedules tab ────────────────────────────────────────────────── */}
      {tab === 'schedules' && (
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
