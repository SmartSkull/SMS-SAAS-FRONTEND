'use client';
import { useState, useEffect } from 'react';
import { BookOpen, CalendarDays, GraduationCap, Plus, Trash2, Save, GripVertical, Clock, AlertCircle, Settings } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import clsx from 'clsx';

type ClassTimetable = { id: string; classRoom: string; classRoomId: string; content: string };
type ExamTimetable  = { id: string; level: string; content: string };
type Subject = { id: string; course: string };
type GridCell = { id: string; subjectId: string; label: string };

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const DEFAULT_PERIOD_CONFIG = { startTime: '08:00', endTime: '14:00', duration: 60 };

const DAY_COLORS: Record<string, string> = {
  Monday: 'bg-blue-50 border-blue-200 text-blue-700',
  Tuesday: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  Wednesday: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  Thursday: 'bg-amber-50 border-amber-200 text-amber-700',
  Friday: 'bg-purple-50 border-purple-200 text-purple-700',
};

const PERIOD_COLORS = [
  'from-blue-500 to-blue-600',
  'from-sky-500 to-sky-600',
  'from-indigo-500 to-indigo-600',
  'from-violet-500 to-violet-600',
  'from-fuchsia-500 to-fuchsia-600',
  'from-cyan-500 to-cyan-600',
  'from-teal-500 to-teal-600',
  'from-emerald-500 to-emerald-600',
  'from-amber-500 to-amber-600',
  'from-orange-500 to-orange-600',
];

/* ── Period generation ───────────────────────────────────────────────────── */

/** Convert "HH:MM" → total minutes since midnight */
function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Convert total minutes → "H:MM" display label */
function minsToLabel(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}:${mm.toString().padStart(2, '0')}`;
}

/** Generate period time labels from config */
function generatePeriods(startTime: string, endTime: string, duration: number): string[] {
  const start = timeToMins(startTime);
  const end   = timeToMins(endTime);
  if (isNaN(start) || isNaN(end) || duration < 5 || start >= end) return [];
  const periods: string[] = [];
  for (let t = start; t + duration <= end; t += duration) {
    periods.push(minsToLabel(t));
  }
  return periods;
}

/* ── Content serialization ───────────────────────────────────────────────── */
// Format: "PERIODS:8:25,9:05,9:45,...|Monday: Math, English|Tuesday: ..."
// Legacy format (no PERIODS prefix) is also supported for backward compat.

function serializeContent(grid: Record<string, GridCell[]>, periods: string[]): string {
  const periodsPart = `PERIODS:${periods.join(',')}`;
  const gridPart = DAYS.map(d => {
    const subs = (grid[d] || []).filter(Boolean).map(c => c.label).filter(Boolean);
    return `${d}: ${subs.join(', ')}`;
  }).join(' | ');
  return `${periodsPart}|${gridPart}`;
}

function parseContent(content: string): { periods: string[]; grid: Record<string, string[]> } {
  const grid: Record<string, string[]> = {};
  for (const d of DAYS) grid[d] = [];
  let periods: string[] = [];
  let body = content || '';

  // Extract PERIODS header if present
  if (body.startsWith('PERIODS:')) {
    const pipeIdx = body.indexOf('|');
    if (pipeIdx > 0) {
      const periodStr = body.slice('PERIODS:'.length, pipeIdx);
      periods = periodStr.split(',').map(s => s.trim()).filter(Boolean);
      body = body.slice(pipeIdx + 1);
    }
  }

  body.split('|').forEach(seg => {
    const i = seg.indexOf(':');
    if (i < 0) return;
    const day = seg.slice(0, i).trim();
    const subs = seg.slice(i + 1).split(',').map(s => s.trim()).filter(Boolean);
    if (DAYS.includes(day)) grid[day] = periods.length ? subs.slice(0, periods.length) : subs;
  });

  return { periods, grid };
}

const EMPTY_CLASS_FORM = { id: '', classRoomId: '', content: '' };
const EMPTY_EXAM_FORM  = { id: '', level: '', content: '' };

type PeriodConfig = { startTime: string; endTime: string; duration: number };
type SetupStep = 'periods' | 'grid';

export default function StaffTimetablePage() {
  const toast = useToast();
  const [tab, setTab] = useState<'class' | 'exam'>('class');
  const [mounted, setMounted] = useState(false);
  const [editing, setEditing] = useState<'class' | 'exam' | null>(null);
  const [setupStep, setSetupStep] = useState<SetupStep>('periods');
  useEffect(() => setMounted(true), []);

  // Class timetable state
  const [classes, setClasses] = useState<{ name: string; id: string }[]>([]);
  const [classTimetables, setClassTimetables] = useState<ClassTimetable[]>([]);
  const [classForm, setClassForm] = useState(EMPTY_CLASS_FORM);
  const [grid, setGrid] = useState<Record<string, GridCell[]>>({});
  const [savingClass, setSavingClass] = useState(false);

  // Exam timetable state
  const [examTimetables, setExamTimetables] = useState<ExamTimetable[]>([]);
  const [examForm, setExamForm] = useState(EMPTY_EXAM_FORM);
  const [examGrid, setExamGrid] = useState<Record<string, GridCell[]>>({});
  const [savingExam, setSavingExam] = useState(false);

  // Period config
  const [periodConfig, setPeriodConfig] = useState<PeriodConfig>(DEFAULT_PERIOD_CONFIG);
  const [activePeriods, setActivePeriods] = useState<string[]>([]);

  // Subjects + drag state
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [dragSubject, setDragSubject] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  useEffect(() => {
    api.get<any>(endpoints.staff.classes).then(r => setClasses(r.data ?? []));
    api.get<any>(endpoints.staff.courses)
      .then(r => setSubjects((r.data ?? []).map((s: any) => ({ id: String(s.course_id ?? s.id), course: s.course }))))
      .finally(() => setSubjectsLoading(false));
    loadClass();
    loadExam();
  }, []);

  const loadClass = () =>
    api.get<any>(endpoints.staff.classTimetable).then(r => setClassTimetables(r.data ?? []));
  const loadExam = () =>
    api.get<any>(endpoints.staff.examTimetable).then(r => setExamTimetables(r.data ?? []));

  const emptyGrid = (periods: string[]) =>
    Object.fromEntries(DAYS.map(d => [d, Array(periods.length).fill(null) as GridCell[]]));

  const subjectLabel = (id: string) => subjects.find(s => s.id === id)?.course ?? id;

  /* ── Period config helpers ── */
  const previewPeriods = generatePeriods(periodConfig.startTime, periodConfig.endTime, periodConfig.duration);

  const applyPeriods = () => {
    if (previewPeriods.length === 0) return toast.error('Invalid period configuration — check start/end time and duration');
    setActivePeriods(previewPeriods);
    // Reset grid to match new period count
    if (editing === 'class') setGrid(emptyGrid(previewPeriods));
    else setExamGrid(emptyGrid(previewPeriods));
    setSetupStep('grid');
  };

  /* ── Open editors ── */
  const openClassEditor = (t?: ClassTimetable) => {
    setEditing('class');
    if (t) {
      const { periods, grid: parsed } = parseContent(t.content);
      const resolvedPeriods = periods.length ? periods : generatePeriods(DEFAULT_PERIOD_CONFIG.startTime, DEFAULT_PERIOD_CONFIG.endTime, DEFAULT_PERIOD_CONFIG.duration);
      setActivePeriods(resolvedPeriods);
      setClassForm({ id: t.id, classRoomId: t.classRoomId, content: t.content });
      setGrid(Object.fromEntries(DAYS.map(d => [d, resolvedPeriods.map((_, i) => {
        const label = parsed[d]?.[i];
        return label ? { id: `${d}-${i}`, subjectId: label, label } : null as any;
      })])));
      // Skip period setup when editing an existing timetable
      setSetupStep('grid');
    } else {
      setClassForm(EMPTY_CLASS_FORM);
      setActivePeriods([]);
      setPeriodConfig(DEFAULT_PERIOD_CONFIG);
      setSetupStep('periods');
    }
  };

  const openExamEditor = (t?: ExamTimetable) => {
    setEditing('exam');
    if (t) {
      const { periods, grid: parsed } = parseContent(t.content);
      const resolvedPeriods = periods.length ? periods : generatePeriods(DEFAULT_PERIOD_CONFIG.startTime, DEFAULT_PERIOD_CONFIG.endTime, DEFAULT_PERIOD_CONFIG.duration);
      setActivePeriods(resolvedPeriods);
      setExamForm({ id: t.id, level: t.level, content: t.content });
      setExamGrid(Object.fromEntries(DAYS.map(d => [d, resolvedPeriods.map((_, i) => {
        const label = parsed[d]?.[i];
        return label ? { id: `${d}-${i}`, subjectId: label, label } : null as any;
      })])));
      setSetupStep('grid');
    } else {
      setExamForm(EMPTY_EXAM_FORM);
      setActivePeriods([]);
      setPeriodConfig(DEFAULT_PERIOD_CONFIG);
      setSetupStep('periods');
    }
  };

  /* ── Save ── */
  const saveClass = async () => {
    if (!classForm.classRoomId) return toast.error('Select a class');
    const content = serializeContent(grid, activePeriods);
    setSavingClass(true);
    try {
      await api.post(endpoints.staff.classTimetable, { ...classForm, content });
      toast.success(classForm.id ? 'Timetable updated' : 'Timetable created');
      setEditing(null);
      setClassForm(EMPTY_CLASS_FORM);
      loadClass();
    } catch { toast.error('Failed to save'); }
    finally { setSavingClass(false); }
  };

  const deleteClass = async (id: string) => {
    try { await api.delete(`${endpoints.staff.classTimetable}/${id}`); loadClass(); toast.success('Deleted'); }
    catch { toast.error('Failed to delete'); }
  };

  const saveExam = async () => {
    if (!examForm.level) return toast.error('Select a level');
    const content = serializeContent(examGrid, activePeriods);
    setSavingExam(true);
    try {
      await api.post(endpoints.staff.examTimetable, { ...examForm, content });
      toast.success(examForm.id ? 'Exam timetable updated' : 'Exam timetable created');
      setEditing(null);
      setExamForm(EMPTY_EXAM_FORM);
      loadExam();
    } catch { toast.error('Failed to save'); }
    finally { setSavingExam(false); }
  };

  const deleteExam = async (id: string) => {
    try { await api.delete(`${endpoints.staff.examTimetable}/${id}`); loadExam(); toast.success('Deleted'); }
    catch { toast.error('Failed to delete'); }
  };

  /* ── Drag & drop ── */
  const setGridFor = (fn: (g: Record<string, GridCell[]>) => Record<string, GridCell[]>) => {
    if (editing === 'exam') setExamGrid(fn);
    else setGrid(fn);
  };

  const moveCell = (from: string, to: string) => {
    const [fDay, fIdx] = from.split('-');
    const [tDay, tIdx] = to.split('-');
    setGridFor(g => {
      const src = [...(g[fDay] || [])];
      const cell = src[parseInt(fIdx)];
      if (!cell) return g;
      src[parseInt(fIdx)] = null as any;
      const dst = [...(g[tDay] || [])];
      dst[parseInt(tIdx)] = cell;
      return { ...g, [fDay]: src, [tDay]: dst };
    });
  };

  const dropOnCell = (day: string, idx: number) => {
    if (dragOverCell && dragOverCell !== `${day}-${idx}`) {
      moveCell(dragOverCell, `${day}-${idx}`);
      setDragOverCell(null);
      setDragSubject(null);
      return;
    }
    if (dragOverCell) { setDragOverCell(null); setDragSubject(null); return; }
    if (!dragSubject) return;
    setGridFor(g => {
      const arr = [...(g[day] || Array(activePeriods.length).fill(null))];
      arr[idx] = { id: `${day}-${idx}`, subjectId: dragSubject, label: subjectLabel(dragSubject) };
      return { ...g, [day]: arr };
    });
    setDragSubject(null);
  };

  const removeCell = (day: string, idx: number) =>
    setGridFor(g => {
      const arr = [...(g[day] || [])];
      arr[idx] = null as any;
      return { ...g, [day]: arr };
    });

  const clearDay = (day: string) => {
    const g = editing === 'class' ? grid : examGrid;
    if (!g[day]?.some(Boolean)) return;
    setGridFor(prev => ({ ...prev, [day]: Array(activePeriods.length).fill(null) }));
    toast.success(`${day} cleared`);
  };

  const inputCls = 'w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white';

  if (!mounted) return null;

  const gridData = editing === 'class' ? grid : examGrid;
  const saving   = editing === 'class' ? savingClass : savingExam;

  /* ── Period setup step ── */
  const PeriodSetup = () => (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
        <div className="flex items-center gap-3 mb-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Clock size={18} />
          </span>
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Set Period Times</h2>
            <p className="text-sm text-gray-400">Configure the school day schedule before building the timetable</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">First period starts</label>
            <input
              type="time"
              value={periodConfig.startTime}
              onChange={e => setPeriodConfig(p => ({ ...p, startTime: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">School closes at</label>
            <input
              type="time"
              value={periodConfig.endTime}
              onChange={e => setPeriodConfig(p => ({ ...p, endTime: e.target.value }))}
              className={inputCls}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            Period duration (minutes)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={5}
              max={180}
              value={periodConfig.duration}
              onChange={e => setPeriodConfig(p => ({ ...p, duration: Math.max(5, parseInt(e.target.value) || 5) }))}
              className={clsx(inputCls, 'w-28')}
            />
            <span className="text-sm text-gray-400">minutes per period</span>
          </div>
        </div>

        {/* Preview */}
        {previewPeriods.length > 0 ? (
          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-semibold text-blue-700 mb-2.5 uppercase tracking-wide">
              Preview — {previewPeriods.length} period{previewPeriods.length !== 1 ? 's' : ''}
            </p>
            <div className="flex flex-wrap gap-2">
              {previewPeriods.map((p, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-blue-200 px-3 py-1 text-sm font-medium text-blue-700 shadow-sm">
                  <Clock size={11} /> {p}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
            Invalid configuration — end time must be after start time and duration must be at least 5 minutes.
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={applyPeriods}
            disabled={previewPeriods.length === 0}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-50"
          >
            Continue to Timetable →
          </button>
          <button
            onClick={() => setEditing(null)}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timetable Management</h1>
          <p className="mt-0.5 text-sm text-gray-500">Drag and drop subjects to build the weekly schedule</p>
        </div>
        {editing === null && (
          <button
            onClick={() => (tab === 'class' ? openClassEditor() : openExamEditor())}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700"
          >
            <Plus size={16} /> New Timetable
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {([['class', BookOpen, 'Class Timetable'], ['exam', GraduationCap, 'Exam Timetable']] as const).map(([key, Icon, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={clsx('flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
            <Icon size={16} />{label}
          </button>
        ))}
      </div>

      {/* ── Editor ── */}
      {editing !== null ? (
        setupStep === 'periods' ? (
          <PeriodSetup />
        ) : (
          <div className="grid lg:grid-cols-[300px_1fr] gap-6 items-start">
            {/* Left rail */}
            <div className="space-y-4 lg:sticky lg:top-24">
              {/* Schedule details */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-semibold text-gray-800 mb-3">Schedule details</h2>
                {editing === 'class' ? (
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Class</label>
                    <select value={classForm.classRoomId} onChange={e => setClassForm(f => ({ ...f, classRoomId: e.target.value }))} className={inputCls}>
                      <option value="">Select class</option>
                      {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Level</label>
                    <select value={examForm.level} onChange={e => setExamForm(f => ({ ...f, level: e.target.value }))} className={inputCls}>
                      <option value="">Select level</option>
                      <option value="junior">Junior</option>
                      <option value="senior">Senior</option>
                    </select>
                  </div>
                )}

                {/* Period summary + edit button */}
                <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Periods ({activePeriods.length})</span>
                    <button
                      onClick={() => setSetupStep('periods')}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <Settings size={11} /> Edit
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activePeriods.map((p, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-md bg-white border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                        <Clock size={9} /> {p}
                      </span>
                    ))}
                  </div>
                </div>

                <button onClick={() => (editing === 'class' ? saveClass() : saveExam())} disabled={saving}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-60">
                  <Save size={15} />{saving ? 'Saving…' : 'Save Timetable'}
                </button>
                <button onClick={() => setEditing(null)}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50">
                  Cancel
                </button>
              </div>

              {/* Subjects */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-800">Subjects</h2>
                  {subjectsLoading && <span className="text-xs text-gray-400">Loading…</span>}
                </div>
                <p className="text-xs text-gray-400 mb-3">Drag a subject and drop it on a time slot.</p>
                {subjects.length === 0 ? (
                  <p className="text-sm text-gray-400 flex items-center gap-2"><AlertCircle size={14} /> No subjects yet.</p>
                ) : (
                  <div className="space-y-2">
                    {subjects.map((s, i) => (
                      <div key={s.id}
                        draggable
                        onDragStart={() => { setDragSubject(s.id); setDragOverCell(null); }}
                        onDragEnd={() => setDragSubject(null)}
                        className={clsx(
                          'group flex cursor-grab items-center gap-3 rounded-xl border bg-white px-3 py-2.5 shadow-sm transition-all select-none active:cursor-grabbing',
                          dragSubject === s.id ? 'opacity-40 scale-95 border-blue-300' : 'border-gray-100 hover:shadow-md hover:-translate-y-0.5')}
                      >
                        <span className={clsx('h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br flex items-center justify-center text-xs font-bold text-white', PERIOD_COLORS[i % PERIOD_COLORS.length])}>
                          {s.course.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="text-sm font-medium text-gray-700 flex-1 truncate">{s.course}</span>
                        <GripVertical size={14} className="text-gray-300 group-hover:text-gray-400" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: weekly grid */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <CalendarDays size={16} className="text-blue-500" />
                  {editing === 'class'
                    ? (classes.find(c => c.id === classForm.classRoomId)?.name ?? 'Select a class')
                    : `${examForm.level ? examForm.level.charAt(0).toUpperCase() + examForm.level.slice(1) : ''} Level`} — Weekly Schedule
                </h2>
                <span className="text-xs text-gray-400">Click a slot to remove • Drag to reorder</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="w-24 p-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">Period</th>
                      {DAYS.map(d => (
                        <th key={d} className="p-3">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{d}</span>
                            <button
                              onClick={() => clearDay(d)}
                              disabled={!gridData[d]?.some(Boolean)}
                              title={`Clear ${d}`}
                              className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-0"
                            >Clear</button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activePeriods.map((time, idx) => (
                      <tr key={time} className={idx % 2 === 0 ? 'bg-gray-50/40' : 'bg-white'}>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                            <Clock size={12} className="text-gray-400" /> {time}
                          </div>
                        </td>
                        {DAYS.map(day => {
                          const cell = gridData[day]?.[idx];
                          return (
                            <td key={day} className="p-2">
                              <div
                                onDragOver={e => { e.preventDefault(); setDropTarget(`${day}-${idx}`); }}
                                onDragLeave={() => setDropTarget(null)}
                                onDrop={() => { setDropTarget(null); dropOnCell(day, idx); }}
                                className={clsx(
                                  'relative min-h-[64px] rounded-xl border-2 transition-all duration-150',
                                  dropTarget === `${day}-${idx}`
                                    ? 'border-blue-400 bg-blue-50 scale-[1.02] shadow-md border-dashed'
                                    : cell ? 'border-solid border-gray-100' : 'border-dashed border-gray-100 hover:border-blue-200 hover:bg-blue-50/30',
                                )}
                              >
                                {cell ? (
                                  <div className={clsx(
                                    'group/cell relative flex h-full min-h-[60px] cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-br px-3 py-2 text-white shadow-sm transition-all hover:shadow-md',
                                    PERIOD_COLORS[idx % PERIOD_COLORS.length],
                                    dragSubject === cell.subjectId ? 'opacity-50' : '',
                                  )} draggable
                                    onDragStart={e => { e.stopPropagation(); setDragSubject(cell.subjectId); setDragOverCell(`${day}-${idx}`); }}
                                    onDragEnd={() => { setDragSubject(null); setDragOverCell(null); setDropTarget(null); }}
                                    onDrop={e => { e.stopPropagation(); dropOnCell(day, idx); }}
                                    onClick={() => removeCell(day, idx)}
                                    title="Click to remove, drag to move"
                                  >
                                    <span className="text-xs font-bold leading-tight flex-1">{cell.label}</span>
                                    <span className="opacity-0 group-hover/cell:opacity-100 transition-opacity"><Trash2 size={12} /></span>
                                  </div>
                                ) : (
                                  <span className="absolute inset-0 flex items-center justify-center text-[11px] text-gray-300 pointer-events-none">
                                    Drop subject
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      ) : (
        /* ── List of saved timetables ── */
        <div className="grid gap-6">
          {(tab === 'class' ? classTimetables : examTimetables).length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
              <CalendarDays size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No {tab} timetables yet</p>
              <p className="text-sm text-gray-400 mt-1">Create one to start building your weekly schedule.</p>
              <button
                onClick={() => (tab === 'class' ? openClassEditor() : openExamEditor())}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700"
              >
                <Plus size={16} /> Create {tab === 'class' ? 'Class' : 'Exam'} Timetable
              </button>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {(tab === 'class' ? classTimetables : examTimetables).map(t => {
              const { periods, grid: parsed } = parseContent((t as any).content);
              const totalSlots = Object.values(parsed).reduce((a, arr) => a + arr.filter(Boolean).length, 0);
              return (
                <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div>
                      <span className="font-semibold text-gray-800 flex items-center gap-2">
                        {tab === 'class' ? <CalendarDays size={15} className="text-blue-500" /> : <GraduationCap size={15} className="text-purple-500" />}
                        {(t as any).classRoom ?? `${(t as any).level} Level`}
                      </span>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {totalSlots} slots • {periods.length > 0 ? `${periods.length} periods (${periods[0]} – ${periods[periods.length - 1]})` : 'legacy format'}
                      </p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => (tab === 'class' ? openClassEditor(t as ClassTimetable) : openExamEditor(t as ExamTimetable))}
                        className="text-xs px-3 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Edit</button>
                      <button onClick={() => (tab === 'class' ? deleteClass(t.id) : deleteExam(t.id))} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="p-5 grid grid-cols-5 gap-3">
                    {DAYS.map(day => {
                      const subs = (parsed[day] || []).filter(Boolean);
                      return (
                        <div key={day} className={clsx('rounded-xl border p-2.5 min-h-[90px]', DAY_COLORS[day])}>
                          <p className="text-[10px] font-bold uppercase tracking-wider mb-2">{day.slice(0, 3)}</p>
                          <div className="space-y-1.5">
                            {subs.map((s, i) => (
                              <span key={i} className="block rounded-md bg-white px-2 py-1 text-[11px] font-medium text-gray-700 shadow-sm truncate">{s}</span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
