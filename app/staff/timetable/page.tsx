'use client';
import { useState, useEffect } from 'react';
import { BookOpen, CalendarDays, GraduationCap, Plus, Trash2, Save, GripVertical, Clock, AlertCircle, Settings, X } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import clsx from 'clsx';

type ClassTimetable = { id: string; classRoom: string; classRoomId: string; content: string };
type ExamTimetable  = { id: string; level: string; content: string };
type Subject  = { id: string; course: string };
type GridCell = { id: string; subjectId: string; label: string };

type PeriodRow = {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
  isBreak: boolean;
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const DAY_COLORS: Record<string, string> = {
  Monday:    'bg-blue-50 border-blue-200 text-blue-700',
  Tuesday:   'bg-indigo-50 border-indigo-200 text-indigo-700',
  Wednesday: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  Thursday:  'bg-amber-50 border-amber-200 text-amber-700',
  Friday:    'bg-purple-50 border-purple-200 text-purple-700',
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

let _uid = 0;
const uid = () => String(++_uid);
const newRow = (startTime = ''): PeriodRow => ({ id: uid(), startTime, endTime: '', label: '', isBreak: false });

/* ── Serialization ───────────────────────────────────────────────────────── */
// Stored as: PERIODS2:[json]\nMonday:sub1,sub2\nTuesday:...
// Legacy formats also parsed for backward compat.

function serialize(rows: PeriodRow[], grid: Record<string, GridCell[]>): string {
  const periodsJson = JSON.stringify(
    rows.map(r => ({ s: r.startTime, e: r.endTime, l: r.label, b: r.isBreak }))
  );
  const gridPart = DAYS.map(d => {
    const vals = (grid[d] || []).map(c => (c ? c.label : '')).join(',');
    return `${d}:${vals}`;
  }).join('\n');
  return `PERIODS2:${periodsJson}\n${gridPart}`;
}

function deserialize(content: string): { rows: PeriodRow[]; grid: Record<string, string[]> } {
  const emptyGrid = () => Object.fromEntries(DAYS.map(d => [d, [] as string[]]));
  if (!content) return { rows: [], grid: emptyGrid() };

  if (content.startsWith('PERIODS2:')) {
    const nl = content.indexOf('\n');
    const jsonStr = content.slice('PERIODS2:'.length, nl > 0 ? nl : undefined);
    const rest    = nl > 0 ? content.slice(nl + 1) : '';
    let rows: PeriodRow[] = [];
    try {
      rows = JSON.parse(jsonStr).map((r: any) => ({
        id: uid(), startTime: r.s, endTime: r.e, label: r.l, isBreak: r.b,
      }));
    } catch { rows = []; }
    const grid = emptyGrid();
    rest.split('\n').forEach(line => {
      const ci = line.indexOf(':');
      if (ci < 0) return;
      const day = line.slice(0, ci).trim();
      if (DAYS.includes(day)) grid[day] = line.slice(ci + 1).split(',').map(s => s.trim());
    });
    return { rows, grid };
  }

  // Legacy PERIODS: prefix
  const grid = emptyGrid();
  let body = content;
  let legacyTimes: string[] = [];
  if (body.startsWith('PERIODS:')) {
    const pi = body.indexOf('|');
    if (pi > 0) {
      legacyTimes = body.slice('PERIODS:'.length, pi).split(',').map(s => s.trim());
      body = body.slice(pi + 1);
    }
  }
  body.split('|').forEach(seg => {
    const i = seg.indexOf(':');
    if (i < 0) return;
    const day = seg.slice(0, i).trim();
    const subs = seg.slice(i + 1).split(',').map(s => s.trim()).filter(Boolean);
    if (DAYS.includes(day)) grid[day] = subs;
  });
  const rows: PeriodRow[] = legacyTimes.map(t => ({ id: uid(), startTime: t, endTime: '', label: '', isBreak: false }));
  return { rows, grid };
}

const EMPTY_CLASS_FORM = { id: '', classRoomId: '', content: '' };
const EMPTY_EXAM_FORM  = { id: '', level: '', content: '' };

export default function StaffTimetablePage() {
  const toast = useToast();
  const [tab, setTab]       = useState<'class' | 'exam'>('class');
  const [mounted, setMounted] = useState(false);
  const [editing, setEditing] = useState<'class' | 'exam' | null>(null);
  const [step, setStep]       = useState<'periods' | 'grid'>('periods');
  useEffect(() => setMounted(true), []);

  const [classes, setClasses]               = useState<{ name: string; id: string }[]>([]);
  const [classTimetables, setClassTimetables] = useState<ClassTimetable[]>([]);
  const [classForm, setClassForm]            = useState(EMPTY_CLASS_FORM);
  const [grid, setGrid]                      = useState<Record<string, GridCell[]>>({});
  const [savingClass, setSavingClass]        = useState(false);

  const [examTimetables, setExamTimetables]  = useState<ExamTimetable[]>([]);
  const [examForm, setExamForm]              = useState(EMPTY_EXAM_FORM);
  const [examGrid, setExamGrid]              = useState<Record<string, GridCell[]>>({});
  const [savingExam, setSavingExam]          = useState(false);

  const [periodRows, setPeriodRows] = useState<PeriodRow[]>([newRow()]);

  const [subjects, setSubjects]         = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [dragSubject, setDragSubject]   = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [dropTarget, setDropTarget]     = useState<string | null>(null);

  useEffect(() => {
    api.get<any>(endpoints.staff.classes).then(r => setClasses(r.data ?? []));
    api.get<any>(endpoints.staff.courses)
      .then(r => setSubjects((r.data ?? []).map((s: any) => ({ id: String(s.course_id ?? s.id), course: s.course }))))
      .finally(() => setSubjectsLoading(false));
    loadClass(); loadExam();
  }, []);

  const loadClass = () => api.get<any>(endpoints.staff.classTimetable).then(r => setClassTimetables(r.data ?? []));
  const loadExam  = () => api.get<any>(endpoints.staff.examTimetable).then(r => setExamTimetables(r.data ?? []));

  const subjectSlots = periodRows.filter(r => !r.isBreak);
  const makeEmptyGrid = (slots: PeriodRow[]) =>
    Object.fromEntries(DAYS.map(d => [d, slots.map(() => null as unknown as GridCell)]));

  const subjectLabel = (id: string) => subjects.find(s => s.id === id)?.course ?? id;

  /* ── Period row helpers ── */
  const addRow = () => {
    const last = periodRows[periodRows.length - 1];
    setPeriodRows(r => [...r, newRow(last?.endTime ?? '')]);
  };
  const updateRow = (id: string, patch: Partial<PeriodRow>) =>
    setPeriodRows(r => r.map(p => p.id === id ? { ...p, ...patch } : p));
  const removeRow = (id: string) => setPeriodRows(r => r.filter(p => p.id !== id));

  const applyPeriods = () => {
    if (periodRows.length === 0) return toast.error('Add at least one period');
    const bad = periodRows.find(r => !r.startTime || !r.endTime);
    if (bad) return toast.error('Fill in start and end time for every row');
    const slots = periodRows.filter(r => !r.isBreak);
    if (slots.length === 0) return toast.error('At least one period must be a subject slot (not a break)');
    if (editing === 'class') setGrid(makeEmptyGrid(slots));
    else setExamGrid(makeEmptyGrid(slots));
    setStep('grid');
  };

  /* ── Open editors ── */
  const openEditor = (type: 'class' | 'exam', t?: ClassTimetable | ExamTimetable) => {
    setEditing(type);
    if (t) {
      const { rows, grid: parsed } = deserialize(t.content);
      const resolvedRows = rows.length ? rows : [newRow()];
      setPeriodRows(resolvedRows);
      const slots = resolvedRows.filter(r => !r.isBreak);
      const buildGrid = (g: Record<string, string[]>) =>
        Object.fromEntries(DAYS.map(d => [d, slots.map((_, i) => {
          const label = g[d]?.[i];
          return label ? { id: `${d}-${i}`, subjectId: label, label } : null as any;
        })]));
      if (type === 'class') {
        setClassForm({ id: (t as ClassTimetable).id, classRoomId: (t as ClassTimetable).classRoomId, content: t.content });
        setGrid(buildGrid(parsed));
      } else {
        setExamForm({ id: (t as ExamTimetable).id, level: (t as ExamTimetable).level, content: t.content });
        setExamGrid(buildGrid(parsed));
      }
      setStep('grid');
    } else {
      if (type === 'class') setClassForm(EMPTY_CLASS_FORM);
      else setExamForm(EMPTY_EXAM_FORM);
      setPeriodRows([newRow()]);
      setStep('periods');
    }
  };

  /* ── Save ── */
  const saveClass = async () => {
    if (!classForm.classRoomId) return toast.error('Select a class');
    setSavingClass(true);
    try {
      await api.post(endpoints.staff.classTimetable, { ...classForm, content: serialize(periodRows, grid) });
      toast.success(classForm.id ? 'Timetable updated' : 'Timetable created');
      setEditing(null); setClassForm(EMPTY_CLASS_FORM); loadClass();
    } catch { toast.error('Failed to save'); }
    finally { setSavingClass(false); }
  };
  const saveExam = async () => {
    if (!examForm.level) return toast.error('Select a level');
    setSavingExam(true);
    try {
      await api.post(endpoints.staff.examTimetable, { ...examForm, content: serialize(periodRows, examGrid) });
      toast.success(examForm.id ? 'Exam timetable updated' : 'Exam timetable created');
      setEditing(null); setExamForm(EMPTY_EXAM_FORM); loadExam();
    } catch { toast.error('Failed to save'); }
    finally { setSavingExam(false); }
  };
  const deleteClass = async (id: string) => {
    try { await api.delete(`${endpoints.staff.classTimetable}/${id}`); loadClass(); toast.success('Deleted'); }
    catch { toast.error('Failed to delete'); }
  };
  const deleteExam = async (id: string) => {
    try { await api.delete(`${endpoints.staff.examTimetable}/${id}`); loadExam(); toast.success('Deleted'); }
    catch { toast.error('Failed to delete'); }
  };

  /* ── Drag & drop ── */
  const setGridFor = (fn: (g: Record<string, GridCell[]>) => Record<string, GridCell[]>) => {
    if (editing === 'exam') setExamGrid(fn); else setGrid(fn);
  };

  const dropOnCell = (day: string, idx: number) => {
    if (dragOverCell && dragOverCell !== `${day}-${idx}`) {
      const [fDay, fIdxStr] = dragOverCell.split('-');
      const fIdx = parseInt(fIdxStr);
      setGridFor(g => {
        const src = [...(g[fDay] || [])];
        const cell = src[fIdx];
        if (!cell) return g;
        src[fIdx] = null as any;
        const dst = [...(g[day] || subjectSlots.map(() => null as any))];
        dst[idx] = cell;
        return { ...g, [fDay]: src, [day]: dst };
      });
      setDragOverCell(null); setDragSubject(null);
      return;
    }
    if (dragOverCell) { setDragOverCell(null); setDragSubject(null); return; }
    if (!dragSubject) return;
    setGridFor(g => {
      const arr = [...(g[day] || subjectSlots.map(() => null as any))];
      arr[idx] = { id: `${day}-${idx}`, subjectId: dragSubject, label: subjectLabel(dragSubject) };
      return { ...g, [day]: arr };
    });
    setDragSubject(null);
  };

  const removeCell = (day: string, idx: number) =>
    setGridFor(g => { const arr = [...(g[day] || [])]; arr[idx] = null as any; return { ...g, [day]: arr }; });

  const clearDay = (day: string) => {
    const g = editing === 'class' ? grid : examGrid;
    if (!g[day]?.some(Boolean)) return;
    setGridFor(prev => ({ ...prev, [day]: subjectSlots.map(() => null as any) }));
    toast.success(`${day} cleared`);
  };

  const inputCls = 'w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white';
  const timeCls  = 'border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white w-full';

  if (!mounted) return null;

  const gridData = editing === 'class' ? grid : examGrid;
  const saving   = editing === 'class' ? savingClass : savingExam;

  /* ── Period builder ── */
  const PeriodBuilder = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
        <div className="flex items-center gap-3 mb-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shrink-0">
            <Clock size={18} />
          </span>
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Set Up Periods</h2>
            <p className="text-sm text-gray-400">Add each period, break, or activity for your school day. Toggle "Break" for non-subject slots.</p>
          </div>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_1fr_1.8fr_auto_auto] gap-2 mb-2 px-1">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Start</span>
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">End</span>
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Label (optional)</span>
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Break?</span>
          <span />
        </div>

        <div className="space-y-2">
          {periodRows.map((row, i) => (
            <div key={row.id} className={clsx(
              'grid grid-cols-[1fr_1fr_1.8fr_auto_auto] gap-2 items-center rounded-xl px-3 py-2.5 border',
              row.isBreak ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'
            )}>
              <input type="time" value={row.startTime}
                onChange={e => updateRow(row.id, { startTime: e.target.value })}
                className={timeCls} />
              <input type="time" value={row.endTime}
                onChange={e => updateRow(row.id, { endTime: e.target.value })}
                className={timeCls} />
              <input type="text"
                placeholder={row.isBreak ? 'e.g. Break, Assembly, Sports…' : `Period ${i + 1}`}
                value={row.label}
                onChange={e => updateRow(row.id, { label: e.target.value })}
                className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white w-full" />
              <button type="button"
                onClick={() => updateRow(row.id, { isBreak: !row.isBreak })}
                title={row.isBreak ? 'Switch to subject slot' : 'Mark as break / activity'}
                className={clsx(
                  'px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap',
                  row.isBreak
                    ? 'bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200'
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100'
                )}>
                {row.isBreak ? '☕ Break' : 'Break?'}
              </button>
              <button type="button" onClick={() => removeRow(row.id)}
                disabled={periodRows.length === 1}
                className="p-1.5 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30">
                <X size={15} />
              </button>
            </div>
          ))}
        </div>

        <button type="button" onClick={addRow}
          className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-blue-300 px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors w-full justify-center">
          <Plus size={15} /> Add period / break
        </button>

        {/* Summary */}
        {periodRows.length > 0 && (
          <div className="mt-5 rounded-xl bg-gray-50 border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-500 mb-2.5 uppercase tracking-wide">Summary</p>
            <div className="flex flex-wrap gap-2">
              {periodRows.map((row, i) => (
                <span key={row.id} className={clsx(
                  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border',
                  row.isBreak ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-gray-200 text-gray-700'
                )}>
                  {row.isBreak ? '☕' : <Clock size={10} />}
                  {row.startTime || '?'}{row.endTime ? `–${row.endTime}` : ''}
                  {row.label ? ` · ${row.label}` : !row.isBreak ? ` · Period ${i + 1}` : ''}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2.5">
              {subjectSlots.length} subject slot{subjectSlots.length !== 1 ? 's' : ''}
              &nbsp;·&nbsp;
              {periodRows.filter(r => r.isBreak).length} break/activit{periodRows.filter(r => r.isBreak).length !== 1 ? 'ies' : 'y'}
            </p>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button onClick={applyPeriods} disabled={periodRows.length === 0}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-50">
            Continue to Timetable →
          </button>
          <button onClick={() => setEditing(null)}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50">
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
          <button onClick={() => (tab === 'class' ? openEditor('class') : openEditor('exam'))}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700">
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
        step === 'periods' ? <PeriodBuilder /> : (
          <div className="grid lg:grid-cols-[300px_1fr] gap-6 items-start">
            {/* Left rail */}
            <div className="space-y-4 lg:sticky lg:top-24">
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

                {/* Period summary */}
                <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {periodRows.length} row{periodRows.length !== 1 ? 's' : ''} · {subjectSlots.length} subject slot{subjectSlots.length !== 1 ? 's' : ''}
                    </span>
                    <button onClick={() => setStep('periods')}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                      <Settings size={11} /> Edit
                    </button>
                  </div>
                  <div className="flex flex-col gap-1">
                    {periodRows.map((row, i) => (
                      <span key={row.id} className={clsx(
                        'flex items-center gap-1.5 text-[11px] font-medium rounded-md px-2 py-1',
                        row.isBreak ? 'bg-amber-50 text-amber-700' : 'bg-white text-gray-600 border border-gray-100'
                      )}>
                        {row.isBreak ? '☕' : <Clock size={9} />}
                        {row.startTime}–{row.endTime}
                        {row.label ? ` · ${row.label}` : !row.isBreak ? ` · Period ${i + 1}` : ''}
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
                <p className="text-xs text-gray-400 mb-3">Drag a subject onto a slot.</p>
                {subjects.length === 0 ? (
                  <p className="text-sm text-gray-400 flex items-center gap-2"><AlertCircle size={14} /> No subjects yet.</p>
                ) : (
                  <div className="space-y-2">
                    {subjects.map((s, i) => (
                      <div key={s.id} draggable
                        onDragStart={() => { setDragSubject(s.id); setDragOverCell(null); }}
                        onDragEnd={() => setDragSubject(null)}
                        className={clsx(
                          'group flex cursor-grab items-center gap-3 rounded-xl border bg-white px-3 py-2.5 shadow-sm transition-all select-none active:cursor-grabbing',
                          dragSubject === s.id ? 'opacity-40 scale-95 border-blue-300' : 'border-gray-100 hover:shadow-md hover:-translate-y-0.5'
                        )}>
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

            {/* Grid */}
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
                      <th className="w-36 p-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">Period</th>
                      {DAYS.map(d => (
                        <th key={d} className="p-3">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{d}</span>
                            <button onClick={() => clearDay(d)} disabled={!gridData[d]?.some(Boolean)}
                              className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-0">
                              Clear
                            </button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {periodRows.map((row, rowIdx) => {
                      if (row.isBreak) {
                        return (
                          <tr key={row.id} className="bg-amber-50/70">
                            <td className="p-3">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                                <span>☕</span> {row.startTime}–{row.endTime}
                              </div>
                            </td>
                            <td colSpan={5} className="p-3 text-center text-xs font-medium text-amber-600 tracking-wide">
                              {row.label || 'Break / Activity'}
                            </td>
                          </tr>
                        );
                      }

                      const slotIdx = subjectSlots.findIndex(s => s.id === row.id);
                      return (
                        <tr key={row.id} className={rowIdx % 2 === 0 ? 'bg-gray-50/40' : 'bg-white'}>
                          <td className="p-3">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                                <Clock size={11} className="text-gray-400" /> {row.startTime}–{row.endTime}
                              </div>
                              {row.label && <span className="text-[10px] text-gray-400 pl-4">{row.label}</span>}
                            </div>
                          </td>
                          {DAYS.map(day => {
                            const cell = gridData[day]?.[slotIdx];
                            return (
                              <td key={day} className="p-2">
                                <div
                                  onDragOver={e => { e.preventDefault(); setDropTarget(`${day}-${slotIdx}`); }}
                                  onDragLeave={() => setDropTarget(null)}
                                  onDrop={() => { setDropTarget(null); dropOnCell(day, slotIdx); }}
                                  className={clsx(
                                    'relative min-h-[64px] rounded-xl border-2 transition-all duration-150',
                                    dropTarget === `${day}-${slotIdx}`
                                      ? 'border-blue-400 bg-blue-50 scale-[1.02] shadow-md border-dashed'
                                      : cell ? 'border-solid border-gray-100' : 'border-dashed border-gray-100 hover:border-blue-200 hover:bg-blue-50/30',
                                  )}>
                                  {cell ? (
                                    <div className={clsx(
                                      'group/cell relative flex h-full min-h-[60px] cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-br px-3 py-2 text-white shadow-sm transition-all hover:shadow-md',
                                      PERIOD_COLORS[slotIdx % PERIOD_COLORS.length],
                                    )} draggable
                                      onDragStart={e => { e.stopPropagation(); setDragSubject(cell.subjectId); setDragOverCell(`${day}-${slotIdx}`); }}
                                      onDragEnd={() => { setDragSubject(null); setDragOverCell(null); setDropTarget(null); }}
                                      onDrop={e => { e.stopPropagation(); dropOnCell(day, slotIdx); }}
                                      onClick={() => removeCell(day, slotIdx)}
                                      title="Click to remove, drag to move">
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      ) : (
        /* ── Saved timetables list ── */
        <div className="grid gap-6">
          {(tab === 'class' ? classTimetables : examTimetables).length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
              <CalendarDays size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No {tab} timetables yet</p>
              <p className="text-sm text-gray-400 mt-1">Create one to start building your weekly schedule.</p>
              <button onClick={() => (tab === 'class' ? openEditor('class') : openEditor('exam'))}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700">
                <Plus size={16} /> Create {tab === 'class' ? 'Class' : 'Exam'} Timetable
              </button>
            </div>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            {(tab === 'class' ? classTimetables : examTimetables).map(t => {
              const { rows, grid: parsed } = deserialize((t as any).content);
              const slots = rows.filter(r => !r.isBreak);
              const totalSlots = Object.values(parsed).reduce((a, arr) => a + arr.filter(Boolean).length, 0);
              const firstTime = rows[0]?.startTime;
              const lastTime  = rows[rows.length - 1]?.endTime;
              return (
                <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div>
                      <span className="font-semibold text-gray-800 flex items-center gap-2">
                        {tab === 'class' ? <CalendarDays size={15} className="text-blue-500" /> : <GraduationCap size={15} className="text-purple-500" />}
                        {(t as any).classRoom ?? `${(t as any).level} Level`}
                      </span>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {totalSlots} slots · {slots.length} period{slots.length !== 1 ? 's' : ''}
                        {firstTime && lastTime ? ` · ${firstTime}–${lastTime}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => (tab === 'class' ? openEditor('class', t as ClassTimetable) : openEditor('exam', t as ExamTimetable))}
                        className="text-xs px-3 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Edit</button>
                      <button onClick={() => (tab === 'class' ? deleteClass(t.id) : deleteExam(t.id))}
                        className="text-red-500 hover:text-red-700 p-1"><Trash2 size={14} /></button>
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
