'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar, Clock, User, BookOpen, GraduationCap, Plus, Trash2,
  Save, Sparkles, ArrowLeft, CheckCircle, AlertCircle, X, ChevronDown,
} from 'lucide-react';
import type { AdminClassTimetable, AdminExamTimetable } from '@/hooks/admin';
import { api, endpoints, getImageUrl } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/StateDisplay';
import clsx from 'clsx';

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
type Day = typeof DAYS[number];

const DAY_SHORT: Record<Day, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri',
};

const PERIOD_COLORS = [
  'bg-blue-500', 'bg-sky-500', 'bg-indigo-500', 'bg-violet-500',
  'bg-fuchsia-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-orange-500',
];

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */
type PeriodRow = { startTime: string; endTime: string; label: string; isBreak: boolean };

interface ScheduleSlot {
  id: string;
  isBreak: boolean;
  startTime: string;
  endTime: string;
  label: string;
  duration: number;
}

/** Which school level/group this subject applies to */
type ClassGroup = 'all' | 'junior' | 'senior' | 'primary' | 'creche';

/** Senior secondary departments */
type SeniorDept = 'science' | 'arts' | 'commercial';

const ALL_DEPTS: SeniorDept[] = ['science', 'arts', 'commercial'];

const DEPT_LABELS: Record<SeniorDept, string> = {
  science:    'Science',
  arts:       'Arts',
  commercial: 'Commercial',
};

const CLASS_GROUP_LABELS: Record<ClassGroup, string> = {
  all:     'All Classes',
  junior:  'Junior Secondary (JSS1–JSS3)',
  senior:  'Senior Secondary (SS1–SS3)',
  primary: 'Primary School',
  creche:  'Creche / Nursery / KG',
};

/**
 * Classify a class name into a group based on its prefix.
 * Handles: JSS1A, SS2B, Primary 3, Nursery 1, Creche, KG1, etc.
 */
function classifyClass(name: string): ClassGroup {
  const n = name.trim().toUpperCase();
  if (/^(JSS|J\.S\.S|JUNIOR)/.test(n)) return 'junior';
  if (/^(SS|S\.S\.|SSS|SENIOR SEC)/.test(n)) return 'senior';
  if (/^(PRIMARY|PRI|P\d)/.test(n)) return 'primary';
  if (/^(CRECHE|NURSERY|NUR|KG|KINDERGARTEN|PRE-?SCHOOL|PRES)/.test(n)) return 'creche';
  return 'all';
}

/**
 * Classify a senior class name into a department.
 * Handles names like: "SS1 Science", "SS2Arts", "SS3 Commercial", "SS2 Sci",
 * "SS1 Art", "SS2 Com", "SS1A" (unknown → null means applies to all depts).
 */
function classifyDept(name: string): SeniorDept | null {
  const n = name.trim().toUpperCase();
  if (/SCI(ENCE)?/.test(n)) return 'science';
  if (/(COMM?(ERCIAL)?|COM)/.test(n)) return 'commercial';
  if (/ART/.test(n)) return 'arts';
  return null; // no dept found → treat as all departments
}

/** Per-day availability window for a subject/teacher */
interface DayWindow {
  day: Day;
  from: string; // "HH:MM"
  to:   string; // "HH:MM"
}

/** Per-subject config */
interface SubjectConfig {
  subjectId: string;
  subjectName: string;
  /** Total minutes this subject should be taught per week */
  minutesPerWeek: number;
  /** Which class group this subject applies to */
  classGroup: ClassGroup;
  /**
   * For senior secondary only: which departments offer this subject.
   * Empty array = all departments (Science, Arts, Commercial).
   */
  departments: SeniorDept[];
  /** Days + time windows when the teacher is available */
  windows: DayWindow[];
}

interface SetupData {
  type: 'class' | 'exam';
  level: 'junior' | 'senior';
  classRoomIds: string[];   // multi-class
  schoolStart: string;
  periodDuration: number;
}

interface GeneratedResult {
  rows: PeriodRow[];
  /** classRoomId → serialised content */
  byClass: Record<string, string>;
}

let _uid = 0;
const uid = () => `_${++_uid}`;

/* ═══════════════════════════════════════════════════════════════════════════
   TIME HELPERS
═══════════════════════════════════════════════════════════════════════════ */
function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function addMinutes(time: string, minutes: number): string {
  const total = toMinutes(time) + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

function recalcTimes(slots: ScheduleSlot[], schoolStart: string): ScheduleSlot[] {
  let cursor = schoolStart;
  return slots.map(slot => {
    const start = cursor;
    const end = addMinutes(start, slot.duration);
    cursor = end;
    return { ...slot, startTime: start, endTime: end };
  });
}

/**
 * Given a teacher's availability windows and the list of teaching periods,
 * return which (day, periodIdx) slots fall inside the teacher's window.
 */
function windowsToSlots(
  windows: DayWindow[],
  periodTimes: { start: string; end: string }[],
): { day: Day; periodIdx: number }[] {
  const result: { day: Day; periodIdx: number }[] = [];
  for (const win of windows) {
    const winFrom = toMinutes(win.from);
    const winTo   = toMinutes(win.to);
    periodTimes.forEach((p, idx) => {
      const pStart = toMinutes(p.start);
      const pEnd   = toMinutes(p.end);
      // Period must start at or after window start AND end at or before window end
      if (pStart >= winFrom && pEnd <= winTo) {
        result.push({ day: win.day, periodIdx: idx });
      }
    });
  }
  return result;
}

/* ═══════════════════════════════════════════════════════════════════════════
   SERIALISER  (PERIODS2 — same format used by staff/student pages)
═══════════════════════════════════════════════════════════════════════════ */
function serialize(rows: PeriodRow[], grid: Record<string, string[]>): string {
  const periodsJson = JSON.stringify(
    rows.map(r => ({ s: r.startTime, e: r.endTime, l: r.label, b: r.isBreak }))
  );
  const gridPart = DAYS.map(d => `${d}:${(grid[d] ?? []).join(',')}`).join('\n');
  return `PERIODS2:${periodsJson}\n${gridPart}`;
}

function deserialize(content: string): { rows: PeriodRow[]; grid: Record<string, string[]> } {
  const emptyGrid = () => Object.fromEntries(DAYS.map(d => [d, [] as string[]]));
  if (!content || !content.startsWith('PERIODS2:')) return { rows: [], grid: emptyGrid() };
  const nl = content.indexOf('\n');
  const jsonStr = content.slice('PERIODS2:'.length, nl > 0 ? nl : undefined);
  const rest = nl > 0 ? content.slice(nl + 1) : '';
  let rows: PeriodRow[] = [];
  try { rows = JSON.parse(jsonStr).map((r: any) => ({ startTime: r.s, endTime: r.e, label: r.l, isBreak: r.b })); }
  catch { rows = []; }
  const grid = emptyGrid();
  rest.split('\n').forEach(line => {
    const ci = line.indexOf(':');
    if (ci < 0) return;
    const day = line.slice(0, ci).trim();
    if ((DAYS as readonly string[]).includes(day)) grid[day] = line.slice(ci + 1).split(',').map(s => s.trim());
  });
  return { rows, grid };
}

/* ═══════════════════════════════════════════════════════════════════════════
   SEEDED PSEUDO-RANDOM (no external dep)
   Deterministic shuffle per class so each class gets a different layout.
═══════════════════════════════════════════════════════════════════════════ */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* ═══════════════════════════════════════════════════════════════════════════
   AUTO-FILL ALGORITHM
   Goals:
   1. Each class gets a different layout (seed-based shuffle).
   2. Subjects spread across different days — prefer days where the subject
      hasn't been placed yet.
   3. Avoid consecutive same-subject periods on the same day.
   4. Most-constrained subjects (fewest available slots) are placed first.
   5. Teacher conflict prevention: a subject (teacher) cannot be placed in the
      same (day, periodIdx) slot across two different classes simultaneously.
      The caller passes a shared `teacherBusy` set that is mutated in-place.
      Key format: "<subjectName>|<day>|<periodIdx>"
═══════════════════════════════════════════════════════════════════════════ */
function autoFill(
  configs: (SubjectConfig & { availableSlots: { day: Day; periodIdx: number }[]; periodsCount: number })[],
  periodCount: number,
  seed: number = 0,
  teacherBusy: Set<string> = new Set(),
): Record<string, string[]> {
  const grid: Record<string, string[]> = Object.fromEntries(
    DAYS.map(d => [d, Array(periodCount).fill('')])
  );

  // Most-constrained first, shuffle within same constraint level using seed
  const sorted = seededShuffle([...configs], seed).sort(
    (a, b) => a.availableSlots.length - b.availableSlots.length
  );

  for (const subj of sorted) {
    let placed = 0;
    const daysUsed = new Set<Day>();

    // Shuffle available slots with this class's seed for variety
    const shuffled = seededShuffle([...subj.availableSlots], seed + subj.subjectName.charCodeAt(0));

    // Two-pass: first try slots on days not yet used by this subject (spread),
    // then fall back to any free slot.
    for (const pass of [0, 1]) {
      for (const slot of shuffled) {
        if (placed >= subj.periodsCount) break;
        // Slot already taken in this class's grid
        if (grid[slot.day][slot.periodIdx] !== '') continue;

        const onNewDay = !daysUsed.has(slot.day);
        if (pass === 0 && !onNewDay) continue;

        // Teacher conflict: this subject is already teaching another class at this time
        const busyKey = `${subj.subjectName}|${slot.day}|${slot.periodIdx}`;
        if (teacherBusy.has(busyKey)) continue;

        // Avoid back-to-back same subject on the same day
        const prevSubj = slot.periodIdx > 0 ? grid[slot.day][slot.periodIdx - 1] : '';
        const nextSubj = slot.periodIdx < periodCount - 1 ? grid[slot.day][slot.periodIdx + 1] : '';
        if (prevSubj === subj.subjectName || nextSubj === subj.subjectName) continue;

        grid[slot.day][slot.periodIdx] = subj.subjectName;
        daysUsed.add(slot.day);
        teacherBusy.add(busyKey); // mark teacher as busy at this time across all classes
        placed++;
      }
      if (placed >= subj.periodsCount) break;
    }
  }

  return grid;
}

/* ═══════════════════════════════════════════════════════════════════════════
   TIMETABLE GRID VIEWER  (read-only)
═══════════════════════════════════════════════════════════════════════════ */
function TimetableGrid({ content }: { content: string }) {
  const { rows, grid } = deserialize(content);
  const subjectSlots = rows.filter(r => !r.isBreak);
  if (rows.length === 0) return <p className="text-sm text-gray-400 py-4 text-center">Empty timetable.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="w-40 p-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">Period</th>
            {DAYS.map(d => <th key={d} className="p-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 text-center">{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => {
            if (row.isBreak) return (
              <tr key={rowIdx} className="bg-amber-50/70">
                <td className="p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                    <span>☕</span> {row.startTime}–{row.endTime}
                  </div>
                  {row.label && <span className="text-[10px] text-amber-500 pl-5">{row.label}</span>}
                </td>
                <td colSpan={5} className="p-3 text-center text-xs font-medium text-amber-600 tracking-wide">
                  {row.label || 'Break / Activity'}
                </td>
              </tr>
            );
            const slotIdx = subjectSlots.findIndex(s => s === row);
            return (
              <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-gray-50/40' : 'bg-white'}>
                <td className="p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                    <Clock size={11} className="text-gray-400" />
                    {row.startTime}–{row.endTime}
                  </div>
                  {row.label && <span className="text-[10px] text-gray-400 pl-4">{row.label}</span>}
                </td>
                {DAYS.map(day => {
                  const subject = grid[day]?.[slotIdx];
                  return (
                    <td key={day} className="p-2">
                      {subject
                        ? <div className={clsx('rounded-xl px-3 py-2 text-white text-xs font-bold text-center shadow-sm', PERIOD_COLORS[slotIdx % PERIOD_COLORS.length])}>{subject}</div>
                        : <div className="rounded-xl border-2 border-dashed border-gray-100 min-h-[40px]" />}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMBINED TIMETABLE GRID
   One table: rows = periods, columns = classes.
   A day selector at the top switches which day's column is shown.
   Each cell shows the subject for that class on that day at that period.
═══════════════════════════════════════════════════════════════════════════ */
function CombinedTimetableGrid({ entries }: {
  entries: { label: string; content: string }[];
}) {
  const [activeDay, setActiveDay] = useState<Day>('Monday');

  // Parse all entries
  const parsed = entries.map(e => ({ label: e.label, ...deserialize(e.content) }));

  // Use rows from the first non-empty entry
  const base = parsed.find(p => p.rows.length > 0);
  if (!base) return <p className="text-sm text-gray-400 py-4 text-center">No timetable data.</p>;

  const { rows } = base;
  const subjectRows = rows.filter(r => !r.isBreak);

  return (
    <div className="space-y-3">
      {/* Day tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {DAYS.map(d => (
          <button key={d} onClick={() => setActiveDay(d)}
            className={clsx(
              'px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all',
              activeDay === d
                ? 'border-blue-500 bg-blue-500 text-white'
                : 'border-gray-200 text-gray-500 bg-white hover:border-blue-300'
            )}>
            {d}
          </button>
        ))}
      </div>

      {/* Combined grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse" style={{ minWidth: `${180 + entries.length * 110}px` }}>
          <thead>
            <tr className="border-b border-gray-100">
              <th className="w-36 p-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400 shrink-0">
                Period
              </th>
              {entries.map((e, i) => (
                <th key={i} className="p-2 text-[11px] font-bold uppercase tracking-wider text-center"
                  style={{ color: PERIOD_COLORS[i % PERIOD_COLORS.length].replace('bg-', '').includes('-') ? undefined : undefined }}>
                  <span className={clsx('inline-block px-2 py-0.5 rounded-lg text-white text-[10px]', PERIOD_COLORS[i % PERIOD_COLORS.length])}>
                    {e.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => {
              if (row.isBreak) return (
                <tr key={rowIdx} className="bg-amber-50/70">
                  <td className="p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                      <span>☕</span> {row.startTime}–{row.endTime}
                    </div>
                    {row.label && <span className="text-[10px] text-amber-500 pl-5">{row.label}</span>}
                  </td>
                  <td colSpan={entries.length} className="p-3 text-center text-xs font-medium text-amber-600 tracking-wide">
                    {row.label || 'Break'}
                  </td>
                </tr>
              );

              const slotIdx = subjectRows.findIndex(s => s === row);
              return (
                <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-gray-50/40' : 'bg-white'}>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                      <Clock size={11} className="text-gray-400" />
                      {row.startTime}–{row.endTime}
                    </div>
                  </td>
                  {parsed.map((p, ci) => {
                    const subject = p.grid[activeDay]?.[slotIdx] ?? '';
                    return (
                      <td key={ci} className="p-1.5">
                        {subject
                          ? <div className={clsx(
                              'rounded-xl px-2 py-2 text-white text-[11px] font-bold text-center shadow-sm leading-tight',
                              PERIOD_COLORS[ci % PERIOD_COLORS.length]
                            )}>{subject}</div>
                          : <div className="rounded-xl border-2 border-dashed border-gray-100 min-h-[36px]" />}
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
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEACHER BADGE
═══════════════════════════════════════════════════════════════════════════ */
function TeacherBadge({ teacher }: { teacher: AdminClassTimetable['teacher'] }) {
  if (!teacher) return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"><User size={13} className="text-gray-400" /></div>
      <span className="text-xs text-gray-400 italic">No teacher assigned</span>
    </div>
  );
  const imgUrl = getImageUrl(teacher.image);
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center shrink-0">
        {imgUrl ? <img src={imgUrl} alt={teacher.name} className="w-full h-full object-cover" />
          : <span className="text-[10px] font-bold text-blue-600">{teacher.name.charAt(0)}</span>}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-800 truncate">{teacher.name}</p>
        <p className="text-[10px] text-gray-400 truncate">{teacher.uniqueId}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TIMETABLE EDITOR  (inline edit mode)
   Renders an editable grid: each subject cell is a dropdown.
═══════════════════════════════════════════════════════════════════════════ */
function TimetableEditor({ content, courses, onSave, onCancel, saving }: {
  content: string;
  courses: { id: string; course: string }[];
  onSave: (newContent: string) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const { rows, grid: initGrid } = deserialize(content);
  const [grid, setGrid] = useState<Record<string, string[]>>(() => {
    // deep-clone
    return Object.fromEntries(Object.entries(initGrid).map(([d, arr]) => [d, [...arr]]));
  });

  const subjectRows = rows.filter(r => !r.isBreak);

  const setCell = (day: string, slotIdx: number, value: string) => {
    setGrid(g => ({ ...g, [day]: g[day].map((v, i) => i === slotIdx ? value : v) }));
  };

  if (rows.length === 0) return <p className="text-sm text-gray-400 py-4 text-center">Nothing to edit.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 p-3">
        <AlertCircle size={13} className="text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700">Click any subject cell to change it. Break rows cannot be edited here.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="w-40 p-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">Period</th>
              {DAYS.map(d => <th key={d} className="p-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 text-center">{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => {
              if (row.isBreak) return (
                <tr key={rowIdx} className="bg-amber-50/70">
                  <td className="p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                      <span>☕</span> {row.startTime}–{row.endTime}
                    </div>
                    {row.label && <span className="text-[10px] text-amber-500 pl-5">{row.label}</span>}
                  </td>
                  <td colSpan={5} className="p-3 text-center text-xs font-medium text-amber-600 tracking-wide">
                    {row.label || 'Break / Activity'}
                  </td>
                </tr>
              );
              const slotIdx = subjectRows.findIndex(s => s === row);
              return (
                <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-gray-50/40' : 'bg-white'}>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                      <Clock size={11} className="text-gray-400" />
                      {row.startTime}–{row.endTime}
                    </div>
                    {row.label && <span className="text-[10px] text-gray-400 pl-4">{row.label}</span>}
                  </td>
                  {DAYS.map(day => {
                    const current = grid[day]?.[slotIdx] ?? '';
                    return (
                      <td key={day} className="p-1.5">
                        <select
                          value={current}
                          onChange={e => setCell(day, slotIdx, e.target.value)}
                          className={clsx(
                            'w-full rounded-xl border-2 px-2 py-2 text-xs font-bold text-center appearance-none focus:outline-none transition-colors cursor-pointer',
                            current
                              ? `${PERIOD_COLORS[slotIdx % PERIOD_COLORS.length]} text-white border-transparent`
                              : 'border-dashed border-gray-200 bg-white text-gray-400 hover:border-blue-300'
                          )}>
                          <option value="">— free —</option>
                          {courses.map(c => (
                            <option key={c.id} value={c.course}>{c.course}</option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onCancel}
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          <X size={14} /> Cancel
        </button>
        <button
          onClick={() => onSave(serialize(rows, grid))}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-green-600/20 hover:bg-green-700 transition-colors disabled:opacity-60">
          <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SAVED TIMETABLE CARD  (with edit + delete)
═══════════════════════════════════════════════════════════════════════════ */
function TimetableCard({ title, icon: Icon, iconColor, content, teacher, updatedAt, id, classRoomId, level, courses, onDeleted, onUpdated }: {
  title: string;
  icon: any;
  iconColor: string;
  content: string;
  teacher: AdminClassTimetable['teacher'];
  updatedAt: string;
  id: string;
  classRoomId?: string;
  level?: string;
  courses: { id: string; course: string }[];
  onDeleted: () => void;
  onUpdated: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode]         = useState<'view' | 'edit'>('view');
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const toast = useToast();

  const handleSave = async (newContent: string) => {
    setSaving(true);
    try {
      if (classRoomId) {
        await api.post(endpoints.staff.classTimetable, { id, classRoomId, content: newContent });
      } else {
        await api.post(endpoints.staff.examTimetable, { id, level, content: newContent });
      }
      toast.success('Timetable updated');
      setMode('view');
      onUpdated();
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      if (classRoomId) {
        await api.delete(`${endpoints.staff.classTimetable}/${id}`);
      } else {
        await api.delete(`${endpoints.staff.examTimetable}/${id}`);
      }
      toast.success('Timetable deleted');
      onDeleted();
    } catch {
      toast.error('Failed to delete timetable');
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        {/* Left: click to expand */}
        <div className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
          onClick={() => { setExpanded(e => !e); if (mode === 'edit') setMode('view'); }}>
          <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center shrink-0', iconColor)}>
            <Icon size={16} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{title}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Updated {new Date(updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Right: teacher + actions */}
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <TeacherBadge teacher={teacher} />

          {/* Edit button */}
          <button
            onClick={() => { setExpanded(true); setMode(m => m === 'edit' ? 'view' : 'edit'); setConfirmDelete(false); }}
            title="Edit timetable"
            className={clsx(
              'p-1.5 rounded-lg text-xs font-semibold transition-colors border',
              mode === 'edit'
                ? 'bg-blue-100 border-blue-200 text-blue-700'
                : 'border-gray-200 text-gray-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200'
            )}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>

          {/* Delete button */}
          {confirmDelete ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-red-500 font-semibold">Sure?</span>
              <button onClick={handleDelete} disabled={deleting}
                className="text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded-lg transition-colors disabled:opacity-60">
                {deleting ? '…' : 'Yes'}
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="text-[10px] font-medium text-gray-500 hover:text-gray-700 px-2 py-1 border border-gray-200 rounded-lg transition-colors">
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              title="Delete timetable"
              className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors">
              <Trash2 size={14} />
            </button>
          )}

          <ChevronDown size={15}
            className={clsx('text-gray-400 transition-transform cursor-pointer', expanded && 'rotate-180')}
            onClick={() => setExpanded(e => !e)} />
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="p-5">
          {mode === 'view'
            ? <TimetableGrid content={content} />
            : <TimetableEditor
                content={content}
                courses={courses}
                saving={saving}
                onSave={handleSave}
                onCancel={() => setMode('view')}
              />}
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-2"><div className="h-4 w-32 rounded-lg bg-gray-200" /><div className="h-3 w-20 rounded-lg bg-gray-100" /></div>
            <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-gray-200" /><div className="h-3 w-24 rounded-lg bg-gray-100" /></div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   WIZARD — STEP 1: Setup
   - School start time + period duration
   - Multi-class selector (checkboxes)
═══════════════════════════════════════════════════════════════════════════ */
const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white';

function StepSetup({
  classes, loadingMeta, onNext,
}: { classes: { id: string; name: string }[]; loadingMeta: boolean; onNext: (d: SetupData) => void }) {
  const toast = useToast();
  const [type, setType]            = useState<'class' | 'exam'>('class');
  const [level, setLevel]          = useState<'junior' | 'senior'>('junior');
  const [selectedIds, setSelected] = useState<string[]>([]);
  const [schoolStart, setStart]    = useState('08:00');
  const [periodDuration, setDur]   = useState(40);

  const toggleClass = (id: string) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const toggleAll = () =>
    setSelected(s => s.length === classes.length ? [] : classes.map(c => c.id));

  return (
    <div className="max-w-lg space-y-5">
      {/* Type */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">Timetable Type</label>
        <div className="grid grid-cols-2 gap-3">
          {(['class', 'exam'] as const).map(t => (
            <button key={t} onClick={() => setType(t)}
              className={clsx('flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-medium',
                type === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
              {t === 'class' ? <BookOpen size={20} /> : <GraduationCap size={20} />}
              {t === 'class' ? 'Class Timetable' : 'Exam Timetable'}
            </button>
          ))}
        </div>
      </div>

      {/* Multi-class selector */}
      {type === 'class' ? (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-gray-700">Select classes</label>
            {!loadingMeta && classes.length > 0 && (
              <button onClick={toggleAll} className="text-xs text-blue-500 hover:text-blue-700 font-medium">
                {selectedIds.length === classes.length ? 'Deselect all' : 'Select all'}
              </button>
            )}
          </div>
          {loadingMeta ? (
            <div className="h-32 rounded-xl bg-gray-100 animate-pulse" />
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
              {classes.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No classes found.</p>
              ) : classes.map(c => {
                const checked = selectedIds.includes(c.id);
                return (
                  <label key={c.id}
                    className={clsx(
                      'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors select-none',
                      checked ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                    )}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleClass(c.id)}
                      className="w-4 h-4 rounded accent-blue-600"
                    />
                    <span className={clsx('text-sm font-medium', checked ? 'text-blue-700' : 'text-gray-700')}>{c.name}</span>
                  </label>
                );
              })}
            </div>
          )}
          {selectedIds.length > 0 && (
            <p className="text-xs text-blue-600 mt-1.5 font-medium">
              {selectedIds.length} class{selectedIds.length !== 1 ? 'es' : ''} selected — one timetable will be generated per class
            </p>
          )}
        </div>
      ) : (
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Level</label>
          <div className="grid grid-cols-2 gap-3">
            {(['junior', 'senior'] as const).map(l => (
              <button key={l} onClick={() => setLevel(l)}
                className={clsx('py-2.5 rounded-xl border-2 text-sm font-medium capitalize transition-all',
                  level === l ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                {l} Secondary
              </button>
            ))}
          </div>
        </div>
      )}

      {/* School start time */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1.5">School start time</label>
        <input type="time" value={schoolStart} onChange={e => setStart(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white" />
        <p className="text-xs text-gray-400 mt-1">First period begins at this time.</p>
      </div>

      {/* Period duration */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1.5">
          Teaching period duration — <span className="text-blue-600 font-bold">{periodDuration} min</span>
        </label>
        <input type="range" min={20} max={90} step={5} value={periodDuration}
          onChange={e => setDur(Number(e.target.value))}
          className="w-full accent-blue-600" />
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>20 min</span><span>45 min</span><span>60 min</span><span>90 min</span>
        </div>
      </div>

      <button onClick={() => {
        if (type === 'class' && selectedIds.length === 0) return toast.error('Select at least one class');
        if (!schoolStart) return toast.error('Set a school start time');
        onNext({ type, level, classRoomIds: selectedIds, schoolStart, periodDuration });
      }} className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-colors">
        Continue →
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DAY STRUCTURE EDITOR — define periods + breaks
═══════════════════════════════════════════════════════════════════════════ */
function DayStructureEditor({
  setup, slots, setSlots,
}: {
  setup: SetupData;
  slots: ScheduleSlot[];
  setSlots: React.Dispatch<React.SetStateAction<ScheduleSlot[]>>;
}) {
  const timedSlots = recalcTimes(slots, setup.schoolStart);

  const addPeriod = () =>
    setSlots(s => [...s, { id: uid(), isBreak: false, startTime: '', endTime: '', label: '', duration: setup.periodDuration }]);

  const insertBreakAfter = (id: string) =>
    setSlots(s => {
      const idx = s.findIndex(x => x.id === id);
      const next = [...s];
      next.splice(idx + 1, 0, { id: uid(), isBreak: true, startTime: '', endTime: '', label: 'Break', duration: 30 });
      return next;
    });

  const removeSlot   = (id: string) => setSlots(s => s.filter(x => x.id !== id));
  const patchSlot    = (id: string, patch: Partial<ScheduleSlot>) =>
    setSlots(s => s.map(x => x.id === id ? { ...x, ...patch } : x));

  const teachCount = timedSlots.filter(s => !s.isBreak).length;

  return (
    <div className="space-y-3">
      {timedSlots.map((slot, idx) => {
        const pNum = timedSlots.filter((s, i) => !s.isBreak && i <= idx).length;
        return (
          <div key={slot.id} className={clsx('rounded-2xl border overflow-hidden', slot.isBreak ? 'border-amber-200' : 'border-gray-200')}>
            <div className={clsx('flex items-center justify-between px-4 py-3', slot.isBreak ? 'bg-amber-50' : 'bg-gray-50')}>
              <div className="flex items-center gap-3">
                <span className={clsx('text-xs font-bold px-2.5 py-1 rounded-lg shrink-0',
                  slot.isBreak ? 'bg-amber-200 text-amber-800' : 'bg-blue-100 text-blue-700')}>
                  {slot.isBreak ? '☕' : `P${pNum}`}
                </span>
                <span className="text-sm font-semibold text-gray-700">
                  {slot.startTime}–{slot.endTime}
                  <span className="text-xs font-normal text-gray-400 ml-2">({slot.duration} min)</span>
                </span>
                {slot.isBreak && (
                  <input value={slot.label} onChange={e => patchSlot(slot.id, { label: e.target.value })}
                    placeholder="Break label…"
                    className="text-sm border border-amber-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-amber-400 w-36" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button onClick={() => patchSlot(slot.id, { duration: Math.max(5, slot.duration - 5) })}
                    className="w-6 h-6 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs font-bold flex items-center justify-center">−</button>
                  <span className="text-xs text-gray-600 w-12 text-center">{slot.duration}m</span>
                  <button onClick={() => patchSlot(slot.id, { duration: Math.min(180, slot.duration + 5) })}
                    className="w-6 h-6 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs font-bold flex items-center justify-center">+</button>
                </div>
                <button onClick={() => removeSlot(slot.id)} disabled={slots.length === 1}
                  className="p-1 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-20">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="flex justify-center py-1.5 border-t border-dashed border-gray-100">
              <button onClick={() => insertBreakAfter(slot.id)}
                className="flex items-center gap-1.5 text-[11px] text-amber-600 hover:text-amber-800 font-medium px-3 py-1 hover:bg-amber-50 rounded-lg transition-colors">
                <Plus size={11} /> Insert break below
              </button>
            </div>
          </div>
        );
      })}

      <button onClick={addPeriod}
        className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-200 px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors">
        <Plus size={15} /> Add teaching period
      </button>

      {teachCount > 0 && (
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-xs text-gray-500">
          <strong>{teachCount}</strong> teaching period{teachCount !== 1 ? 's' : ''} ·{' '}
          <strong>{timedSlots.filter(s => s.isBreak).length}</strong> break{timedSlots.filter(s => s.isBreak).length !== 1 ? 's' : ''} ·
          School ends at <strong>{timedSlots[timedSlots.length - 1]?.endTime}</strong>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUBJECT AVAILABILITY EDITOR
   Each subject has: minutesPerWeek + per-day time windows (from/to).
   The system derives which periods fall inside those windows automatically.
═══════════════════════════════════════════════════════════════════════════ */
function SubjectAvailabilityEditor({
  subj,
  periodTimes,
  periodDuration,
  colorClass,
  onChange,
}: {
  subj: SubjectConfig;
  periodTimes: { start: string; end: string }[];
  periodDuration: number;
  colorClass: string;
  onChange: (s: SubjectConfig) => void;
}) {
  const computedSlots = useMemo(
    () => windowsToSlots(subj.windows, periodTimes),
    [subj.windows, periodTimes]
  );

  // Derived: how many periods this subject needs per week
  const periodsNeeded = Math.max(1, Math.round(subj.minutesPerWeek / periodDuration));
  const maxAvailableMinutes = computedSlots.length * periodDuration;

  const toggleDay = (day: Day) => {
    const exists = subj.windows.some(w => w.day === day);
    if (exists) {
      onChange({ ...subj, windows: subj.windows.filter(w => w.day !== day) });
    } else {
      // Default window: full school span (first period start → last period end)
      const from = periodTimes[0]?.start ?? '08:00';
      const to   = periodTimes[periodTimes.length - 1]?.end ?? '14:00';
      onChange({ ...subj, windows: [...subj.windows, { day, from, to }] });
    }
  };

  const updateWindow = (day: Day, field: 'from' | 'to', value: string) => {
    onChange({
      ...subj,
      windows: subj.windows.map(w => w.day === day ? { ...w, [field]: value } : w),
    });
  };

  return (
    <div className="space-y-4">
      {/* Minutes per week input */}
      <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs font-semibold text-gray-600 shrink-0">Minutes per week:</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={periodDuration}
              step={periodDuration}
              value={subj.minutesPerWeek}
              onChange={e => {
                const val = Math.max(periodDuration, Number(e.target.value) || periodDuration);
                onChange({ ...subj, minutesPerWeek: val });
              }}
              className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold text-blue-600 text-center focus:outline-none focus:border-blue-400 bg-white"
            />
            <span className="text-xs text-gray-400">min</span>
          </div>
          {/* Live period count badge */}
          <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg">
            = {periodsNeeded} period{periodsNeeded !== 1 ? 's' : ''}/week
          </span>
          {computedSlots.length > 0 && (
            <span className="text-[10px] text-gray-400">
              ({computedSlots.length * periodDuration} min available in windows)
            </span>
          )}
        </div>
        <p className="text-[10px] text-gray-400">
          Period length is {periodDuration} min.
          Enter a multiple of {periodDuration} — e.g. {periodDuration * 2} min = {2} periods/week.
        </p>
      </div>

      {/* Class group selector */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Applies to</p>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(CLASS_GROUP_LABELS) as [ClassGroup, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => onChange({ ...subj, classGroup: key, departments: [] })}
              className={clsx(
                'text-xs font-semibold px-3 py-1.5 rounded-xl border-2 transition-all',
                subj.classGroup === key
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-400 bg-white hover:border-gray-300 hover:text-gray-600'
              )}>
              {label}
            </button>
          ))}
        </div>

        {/* Department selector — only for senior secondary */}
        {subj.classGroup === 'senior' && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-indigo-700">Which departments offer this subject?</p>
              <button
                onClick={() => onChange({ ...subj, departments: [] })}
                className="text-[10px] text-indigo-400 hover:text-indigo-700 font-medium">
                All departments
              </button>
            </div>
            <div className="flex gap-2">
              {ALL_DEPTS.map(dept => {
                const isExplicit = subj.departments.includes(dept);
                return (
                  <button
                    key={dept}
                    onClick={() => {
                      // Toggle: if currently all (empty array), start explicit selection without this dept
                      const current = subj.departments.length === 0 ? ALL_DEPTS : subj.departments;
                      const next = current.includes(dept)
                        ? current.filter(d => d !== dept)
                        : [...current, dept];
                      // If all 3 selected, collapse back to empty (= all)
                      onChange({ ...subj, departments: next.length === ALL_DEPTS.length ? [] : next });
                    }}
                    className={clsx(
                      'flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all',
                      subj.departments.length === 0 || isExplicit
                        ? 'border-indigo-500 bg-indigo-500 text-white shadow-sm'
                        : 'border-dashed border-indigo-200 bg-white text-indigo-300 hover:border-indigo-400'
                    )}>
                    {DEPT_LABELS[dept]}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-indigo-500">
              {subj.departments.length === 0
                ? 'All 3 departments — Science, Arts & Commercial — will have this subject.'
                : subj.departments.length === 1
                  ? `Only ${DEPT_LABELS[subj.departments[0]]} classes will have this subject.`
                  : `${subj.departments.map(d => DEPT_LABELS[d]).join(' & ')} classes will have this subject.`}
            </p>
          </div>
        )}

        {subj.classGroup !== 'all' && (
          <p className="text-[10px] text-gray-400">
            This subject will only be scheduled for <strong>{CLASS_GROUP_LABELS[subj.classGroup]}</strong> classes
            {subj.classGroup === 'senior' && subj.departments.length > 0
              ? ` — ${subj.departments.map(d => DEPT_LABELS[d]).join(', ')} only`
              : ''}.
          </p>
        )}
      </div>

      {/* Day toggles + time windows */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Teacher availability windows</p>

        {/* Day pills to enable/disable */}
        <div className="flex flex-wrap gap-2">
          {DAYS.map(day => {
            const win = subj.windows.find(w => w.day === day);
            const active = !!win;
            return (
              <button key={day} onClick={() => toggleDay(day)}
                className={clsx(
                  'text-xs font-semibold px-3 py-1.5 rounded-xl border-2 transition-all',
                  active
                    ? `${colorClass} text-white border-transparent shadow-sm`
                    : 'border-gray-200 text-gray-400 bg-white hover:border-gray-300'
                )}>
                {DAY_SHORT[day]}
              </button>
            );
          })}
        </div>

        {/* Time inputs for active days */}
        {subj.windows.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Select the days the teacher is available.</p>
        ) : (
          <div className="space-y-2 pt-1">
            {subj.windows
              .slice()
              .sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day))
              .map(win => {
                // Which periods fall in this window?
                const matchingPeriods = periodTimes
                  .map((p, i) => ({ p, i }))
                  .filter(({ p }) => toMinutes(p.start) >= toMinutes(win.from) && toMinutes(p.end) <= toMinutes(win.to));

                return (
                  <div key={win.day}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 flex-wrap">
                    <span className="text-xs font-bold text-gray-700 w-8 shrink-0">{DAY_SHORT[win.day]}</span>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-gray-400">From</label>
                      <input type="time" value={win.from}
                        onChange={e => updateWindow(win.day, 'from', e.target.value)}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-blue-400 bg-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-gray-400">To</label>
                      <input type="time" value={win.to}
                        onChange={e => updateWindow(win.day, 'to', e.target.value)}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-blue-400 bg-white" />
                    </div>
                    {/* Show which periods match */}
                    {matchingPeriods.length > 0 ? (
                      <div className="flex flex-wrap gap-1 ml-auto">
                        {matchingPeriods.map(({ p, i }) => (
                          <span key={i} className="text-[10px] font-semibold bg-green-100 text-green-700 rounded-md px-1.5 py-0.5">
                            P{i + 1} {p.start}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-amber-500 ml-auto">No periods in this window</span>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Warning: can't fulfil minutesPerWeek */}
      {subj.minutesPerWeek > maxAvailableMinutes && maxAvailableMinutes > 0 && (
        <div className="flex items-center gap-2 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertCircle size={12} className="shrink-0" />
          Needs {subj.minutesPerWeek} min/week ({periodsNeeded} periods) but only {maxAvailableMinutes} min ({computedSlots.length} periods) available in the windows — widen the availability or reduce minutes.
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   WIZARD — STEP 2: Periods + Subject Availability
═══════════════════════════════════════════════════════════════════════════ */
function StepBuildSchedule({
  setup, courses, allClasses, loadingMeta, onBack, onGenerate,
  phase, setPhase, slots, setSlots, subjects, setSubjects, expandedId, setExpandedId,
}: {
  setup: SetupData;
  courses: { id: string; course: string }[];
  allClasses: { id: string; name: string }[];
  loadingMeta: boolean;
  onBack: () => void;
  onGenerate: (result: GeneratedResult) => void;
  // Lifted state — owned by wizard so it persists across back/forward navigation
  phase: 'structure' | 'availability';
  setPhase: (p: 'structure' | 'availability') => void;
  slots: ScheduleSlot[];
  setSlots: React.Dispatch<React.SetStateAction<ScheduleSlot[]>>;
  subjects: SubjectConfig[];
  setSubjects: React.Dispatch<React.SetStateAction<SubjectConfig[]>>;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
}) {
  const toast = useToast();

  // Keep a ref to allClasses so handleGenerate can access it without stale closure
  const allClassesRef = { current: allClasses };

  // Initialise slots to one period if empty (first time entering this step)
  useEffect(() => {
    if (slots.length === 0) {
      setSlots([{ id: uid(), isBreak: false, startTime: '', endTime: '', label: '', duration: setup.periodDuration }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timedSlots   = recalcTimes(slots, setup.schoolStart);
  const teachSlots   = timedSlots.filter(s => !s.isBreak);
  const periodCount  = teachSlots.length;
  const periodTimes  = teachSlots.map(s => ({ start: s.startTime, end: s.endTime }));

  // Init subjects only once when first entering availability phase
  useEffect(() => {
    if (phase !== 'availability') return;
    if (subjects.length > 0) return; // already initialised — don't overwrite
    setSubjects(courses.map(c => ({
      subjectId: c.id,
      subjectName: c.course,
      minutesPerWeek: setup.periodDuration,
      classGroup: 'all' as ClassGroup,
      departments: [] as SeniorDept[],
      windows: [],
    })));
    if (courses.length > 0) setExpandedId(courses[0].id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const updateSubject = (updated: SubjectConfig) =>
    setSubjects(s => s.map(x => x.subjectId === updated.subjectId ? updated : x));

  const handleGenerate = () => {
    const configured = subjects.filter(s => s.windows.length > 0);
    if (configured.length === 0) return toast.error('Set availability for at least one subject');

    const periodRows: PeriodRow[] = timedSlots.map(s => ({
      startTime: s.startTime, endTime: s.endTime, label: s.label, isBreak: s.isBreak,
    }));

    // Resolve available slots from time windows, and compute period count from minutes
    const withSlots = configured.map(s => ({
      ...s,
      availableSlots: windowsToSlots(s.windows, periodTimes),
      // Round to nearest whole period; minimum 1
      periodsCount: Math.max(1, Math.round(s.minutesPerWeek / setup.periodDuration)),
    }));

    // For each class, generate with a unique seed so layouts differ.
    // A shared teacherBusy set prevents the same subject being placed at the
    // same (day, period) across different classes — one teacher can't be in
    // two rooms at once.
    const byClass: Record<string, string> = {};
    const teacherBusy = new Set<string>();

    setup.classRoomIds.forEach((classId, idx) => {
      const cls = allClassesRef.current.find(c => c.id === classId);
      const group = cls ? classifyClass(cls.name) : 'all';
      const dept  = cls ? classifyDept(cls.name) : null;

      const applicable = withSlots.filter(s => {
        if (s.classGroup !== 'all' && s.classGroup !== group) return false;
        if (group === 'senior' && s.classGroup === 'senior') {
          if (s.departments.length === 0) return true;
          if (dept === null) return true;
          return s.departments.includes(dept);
        }
        return true;
      });

      const seed = idx * 31 + classId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const grid = autoFill(applicable, periodCount, seed, teacherBusy);
      byClass[classId] = serialize(periodRows, grid);
    });

    // For exam type there's only one entry
    if (setup.type === 'exam') {
      const grid = autoFill(withSlots, periodCount, 42);
      byClass['exam'] = serialize(periodRows, grid);
    }

    onGenerate({ rows: periodRows, byClass });
  };

  /* ── Phase A: structure ── */
  if (phase === 'structure') {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            <Clock size={12} /> Starts {setup.schoolStart} · {setup.periodDuration} min periods
          </span>
          <button onClick={onBack} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={12} /> Change setup
          </button>
        </div>

        <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 p-3">
          <AlertCircle size={14} className="text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700">
            Define the school day — teaching periods and any breaks.
            Times auto-calculate from your start time.
            Next, you'll set each subject's teacher availability as a <strong>time range per day</strong>.
          </p>
        </div>

        <DayStructureEditor setup={setup} slots={slots} setSlots={setSlots} />

        <div className="flex gap-3 pt-2">
          <button onClick={onBack}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <ArrowLeft size={15} /> Back
          </button>
          <button onClick={() => {
            if (periodCount === 0) return toast.error('Add at least one teaching period');
            setPhase('availability');
          }} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-colors">
            Set Teacher Availability →
          </button>
        </div>
      </div>
    );
  }

  /* ── Phase B: availability ── */
  const readyCount = subjects.filter(s => windowsToSlots(s.windows, periodTimes).length > 0).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
          <Clock size={12} /> {periodCount} periods · starts {setup.schoolStart}
        </span>
        <button onClick={() => setPhase('structure')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={12} /> Edit day structure
        </button>
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-green-50 border border-green-100 p-3">
        <CheckCircle size={14} className="text-green-500 mt-0.5 shrink-0" />
        <p className="text-xs text-green-700">
          For each subject, enable the days the teacher is available and set a <strong>start–end time window</strong>.
          The system automatically matches periods that fall within that window and fills the timetable.
        </p>
      </div>

      {loadingMeta ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-14 rounded-2xl bg-gray-100 animate-pulse" />)}</div>
      ) : subjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center">
          <BookOpen size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No subjects found. Make sure courses are set up.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {subjects.map((subj, si) => {
            const isOpen = expandedId === subj.subjectId;
            const slots2 = windowsToSlots(subj.windows, periodTimes);
            const isReady = slots2.length > 0;
            const colorClass = PERIOD_COLORS[si % PERIOD_COLORS.length];
            return (
              <div key={subj.subjectId} className={clsx(
                'rounded-2xl border overflow-hidden transition-all',
                isReady ? 'border-green-200' : 'border-gray-200'
              )}>
                <button
                  className={clsx('w-full flex items-center justify-between px-4 py-3 text-left transition-colors',
                    isOpen ? 'bg-gray-50' : 'bg-white hover:bg-gray-50/50')}
                  onClick={() => setExpandedId(isOpen ? null : subj.subjectId)}>
                  <div className="flex items-center gap-3">
                    <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white text-xs font-bold', colorClass)}>
                      {subj.subjectName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{subj.subjectName}</p>
                      <p className="text-[10px] text-gray-400">
                        {isReady
                          ? `${subj.minutesPerWeek} min/week · ${Math.max(1, Math.round(subj.minutesPerWeek / setup.periodDuration))} period${Math.max(1, Math.round(subj.minutesPerWeek / setup.periodDuration)) !== 1 ? 's' : ''} · ${subj.windows.length} day${subj.windows.length !== 1 ? 's' : ''}`
                          : 'No availability set'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {subj.classGroup !== 'all' && (
                      <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full hidden sm:inline">
                        {CLASS_GROUP_LABELS[subj.classGroup].split(' (')[0]}
                        {subj.classGroup === 'senior' && subj.departments.length > 0
                          ? ` · ${subj.departments.map(d => DEPT_LABELS[d]).join('/')}`
                          : ''}
                      </span>
                    )}
                    {isReady && <span className="text-[10px] font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">✓ Ready</span>}
                    <ChevronDown size={15} className={clsx('text-gray-400 transition-transform', isOpen && 'rotate-180')} />
                  </div>
                </button>
                {isOpen && (
                  <div className="px-4 py-4 border-t border-gray-100">
                    <SubjectAvailabilityEditor
                      subj={subj}
                      periodTimes={periodTimes}
                      periodDuration={setup.periodDuration}
                      colorClass={colorClass}
                      onChange={updateSubject}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {subjects.length > 0 && (
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 space-y-1.5 text-xs text-gray-600">
          <div className="flex flex-wrap gap-x-4 gap-y-1 items-center">
            <span><span className="font-semibold text-green-600">{readyCount}</span>/{subjects.length} subjects configured</span>
            {setup.type === 'class' && setup.classRoomIds.length > 1 && (
              <span className="text-gray-400">· {setup.classRoomIds.length} timetables will be generated</span>
            )}
          </div>
          {/* Show group breakdown if any subject is scoped */}
          {subjects.some(s => s.classGroup !== 'all') && (
            <div className="flex flex-wrap gap-2 pt-0.5">
              {(Object.entries(CLASS_GROUP_LABELS) as [ClassGroup, string][])
                .filter(([key]) => key !== 'all' && subjects.some(s => s.classGroup === key))
                .map(([key, label]) => {
                  const count = subjects.filter(s => s.classGroup === key).length;
                  // For senior, show dept breakdown
                  const deptScoped = key === 'senior'
                    ? subjects.filter(s => s.classGroup === 'senior' && s.departments.length > 0)
                    : [];
                  return (
                    <span key={key} className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full">
                      {label.split(' (')[0]}: {count} subject{count !== 1 ? 's' : ''}
                      {deptScoped.length > 0 && ` (${deptScoped.length} dept-specific)`}
                    </span>
                  );
                })}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button onClick={() => setPhase('structure')}
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={15} /> Back
        </button>
        <button onClick={handleGenerate}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-colors">
          <Sparkles size={15} /> Generate Timetable{setup.classRoomIds.length > 1 ? `s (${setup.classRoomIds.length})` : ''}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   WIZARD SHELL
═══════════════════════════════════════════════════════════════════════════ */
function AutoSchedulerWizard({ onClose, onSaved, allClasses }: {
  onClose: () => void;
  onSaved: () => void;
  allClasses: { id: string; name: string }[];
}) {
  const toast = useToast();
  const [step, setStep]          = useState<'setup' | 'schedule' | 'preview'>('setup');
  const [setup, setSetup]        = useState<SetupData | null>(null);
  const [allCourses, setCourses] = useState<{ id: string; course: string }[]>([]);
  const [loadingMeta, setMeta]   = useState(true);
  const [generated, setGenerated]= useState<GeneratedResult | null>(null);
  const [previewClass, setPreview]= useState<string>('');
  const [saving, setSaving]      = useState(false);

  // ── Persistent schedule state (survives Back navigation) ──────────────
  const [schedPhase, setSchedPhase]   = useState<'structure' | 'availability'>('structure');
  const [slots, setSlots]             = useState<ScheduleSlot[]>([]);   // empty = uninitialised
  const [subjects, setSubjects]       = useState<SubjectConfig[]>([]);
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  // ──────────────────────────────────────────────────────────────────────

  useEffect(() => {
    api.get<any>(endpoints.admin.courses)
      .then(crs => setCourses((crs.data ?? []).map((c: any) => ({ id: String(c.course_id ?? c.id), course: c.course }))))
      .catch(() => toast.error('Failed to load courses'))
      .finally(() => setMeta(false));
  }, []);

  // Set default preview class when generated
  useEffect(() => {
    if (!generated) return;
    const keys = Object.keys(generated.byClass);
    // Default to "All" view when multiple classes, otherwise show the single class
    if (keys.length > 1) setPreview('__all__');
    else if (keys.length === 1) setPreview(keys[0]);
  }, [generated]);

  const handleSave = async () => {
    if (!generated || !setup) return;
    setSaving(true);
    try {
      if (setup.type === 'class') {
        // Fire one POST per class in parallel
        await Promise.all(
          setup.classRoomIds.map(classRoomId =>
            api.post(endpoints.staff.classTimetable, { classRoomId, content: generated.byClass[classRoomId] })
          )
        );
        toast.success(`${setup.classRoomIds.length} timetable${setup.classRoomIds.length !== 1 ? 's' : ''} saved`);
      } else {
        await api.post(endpoints.staff.examTimetable, { level: setup.level, content: generated.byClass['exam'] });
        toast.success('Exam timetable saved');
      }
      onSaved();
    } catch {
      toast.error('Failed to save timetable');
    } finally {
      setSaving(false);
    }
  };

  const stepList = ['Setup', 'Periods & Availability', 'Preview & Save'];
  const stepIdx  = ['setup', 'schedule', 'preview'].indexOf(step);

  // Class name lookup
  const className = (id: string) => allClasses.find(c => c.id === id)?.name ?? id;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Auto-Generate Timetable</h2>
            <p className="text-xs text-gray-500">Set school hours, teacher availability — system fills the grid</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Step bar */}
      <div className="flex items-center px-6 pt-5 gap-2">
        {stepList.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className={clsx(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors',
              i < stepIdx ? 'bg-green-500 text-white' : i === stepIdx ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            )}>
              {i < stepIdx ? <CheckCircle size={13} /> : i + 1}
            </div>
            <span className={clsx('text-xs font-medium truncate', i === stepIdx ? 'text-blue-600' : 'text-gray-400')}>{label}</span>
            {i < stepList.length - 1 && <div className="flex-1 h-px bg-gray-200 ml-1 shrink-0" />}
          </div>
        ))}
      </div>

      <div className="p-6">
        {step === 'setup' && (
          <StepSetup
            classes={allClasses}
            loadingMeta={false}
            onNext={d => {
              // If setup changed (different classes/duration), reset schedule state
              const setupChanged = !setup
                || setup.periodDuration !== d.periodDuration
                || setup.schoolStart !== d.schoolStart
                || JSON.stringify(setup.classRoomIds) !== JSON.stringify(d.classRoomIds);
              if (setupChanged) {
                setSlots([]);        // will be reinitialised in StepBuildSchedule
                setSubjects([]);     // will be reinitialised when entering availability
                setSchedPhase('structure');
                setExpandedId(null);
              }
              setSetup(d);
              setStep('schedule');
            }}
          />
        )}

        {step === 'schedule' && setup && (
          <StepBuildSchedule
            setup={setup}
            courses={allCourses}
            allClasses={allClasses}
            loadingMeta={loadingMeta}
            onBack={() => setStep('setup')}
            onGenerate={result => { setGenerated(result); setStep('preview'); }}
            phase={schedPhase}
            setPhase={setSchedPhase}
            slots={slots}
            setSlots={setSlots}
            subjects={subjects}
            setSubjects={setSubjects}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
          />
        )}

        {step === 'preview' && generated && setup && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-green-500 shrink-0" />
              <span className="font-semibold text-gray-800">
                {setup.type === 'class'
                  ? `${setup.classRoomIds.length} timetable${setup.classRoomIds.length !== 1 ? 's' : ''} generated — review before saving`
                  : 'Exam timetable generated — review before saving'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Periods', value: generated.rows.filter(r => !r.isBreak).length },
                { label: 'Breaks',  value: generated.rows.filter(r => r.isBreak).length },
                { label: setup.type === 'class' ? 'Classes' : 'Level',
                  value: setup.type === 'class' ? setup.classRoomIds.length : setup.level },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Class tabs for multi-class preview — including "All" */}
            {setup.type === 'class' && setup.classRoomIds.length > 1 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setPreview('__all__')}
                  className={clsx('px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all',
                    previewClass === '__all__'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
                  All Classes
                </button>
                {setup.classRoomIds.map(id => (
                  <button key={id} onClick={() => setPreview(id)}
                    className={clsx('px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all',
                      previewClass === id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
                    {className(id)}
                  </button>
                ))}
              </div>
            )}

            {/* Grid — single class or combined view */}
            {previewClass === '__all__' ? (
              <div className="rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">All Classes — Combined View</span>
                  <p className="text-[10px] text-gray-400 mt-0.5">Rows = periods · Columns = classes · Select a day above</p>
                </div>
                <div className="p-4">
                  <CombinedTimetableGrid
                    entries={setup.classRoomIds.map(id => ({ label: className(id), content: generated.byClass[id] ?? '' }))}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Preview</span>
                  {setup.type === 'class' && (
                    <span className="text-xs text-gray-400">{className(previewClass)}</span>
                  )}
                </div>
                <div className="p-4">
                  <TimetableGrid content={generated.byClass[previewClass] ?? generated.byClass['exam'] ?? ''} />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep('schedule')}
                className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                <ArrowLeft size={15} /> Edit
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-600/25 hover:bg-green-700 transition-colors disabled:opacity-60">
                <Save size={15} /> {saving ? 'Saving…' : `Save ${setup.type === 'class' && setup.classRoomIds.length > 1 ? `All ${setup.classRoomIds.length} Timetables` : 'Timetable'}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOOK
═══════════════════════════════════════════════════════════════════════════ */
function useTimetableList(tab: 'class' | 'exam' | 'all') {
  const [data, setData]     = useState<AdminClassTimetable[] | AdminExamTimetable[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const reload = useCallback(() => {
    setLoading(true);
    // 'all' loads the same class endpoint — shows all classes together
    const ep = tab === 'exam' ? endpoints.admin.adminExamTimetable : endpoints.admin.adminClassTimetable;
    api.get<any>(ep)
      .then(r => setData(r.data ?? []))
      .catch(() => toast.error('Failed to load timetables'))
      .finally(() => setLoading(false));
  }, [tab]);
  useEffect(() => { reload(); }, [reload]);
  return { data, loading, reload };
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function AdminTimetablePage() {
  const [tab, setTab]             = useState<'all' | 'class' | 'exam'>('all');
  const [showWizard, setShowWizard] = useState(false);
  const [allClasses, setClasses]  = useState<{ id: string; name: string }[]>([]);
  const [allCourses, setCourses]  = useState<{ id: string; course: string }[]>([]);
  const { data, loading, reload } = useTimetableList(tab);
  const toast = useToast();
  const classTimetables = data as AdminClassTimetable[];
  const examTimetables  = data as AdminExamTimetable[];

  useEffect(() => {
    api.get<any>(endpoints.admin.classes)
      .then(r => setClasses((r.data ?? []).map((c: any) => ({ id: String(c.id ?? c.name), name: c.name }))))
      .catch(() => toast.error('Failed to load classes'));
    api.get<any>(endpoints.admin.courses)
      .then(r => setCourses((r.data ?? []).map((c: any) => ({ id: String(c.course_id ?? c.id), course: c.course }))))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timetables</h1>
          <p className="text-sm text-gray-500 mt-0.5">View all timetables or auto-generate new ones</p>
        </div>
        {!showWizard && (
          <button onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-colors">
            <Sparkles size={16} /> Auto-Generate Timetable
          </button>
        )}
      </div>

      {showWizard && (
        <AutoSchedulerWizard
          allClasses={allClasses}
          onClose={() => setShowWizard(false)}
          onSaved={() => { setShowWizard(false); reload(); }}
        />
      )}

      <div className="flex bg-gray-100 rounded-xl p-1 w-fit">
        {(['all', 'class', 'exam'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={clsx('px-5 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
            {t === 'all' ? 'All Classes' : t === 'class' ? 'Class Timetables' : 'Exam Timetables'}
          </button>
        ))}
      </div>

      {loading ? <Skeleton /> : tab === 'all' ? (
        /* ── All Classes combined view ── */
        classTimetables.length === 0
          ? <div className="bg-white rounded-2xl border border-gray-100 p-12"><EmptyState icon={Calendar} message="No class timetables yet. Use Auto-Generate to create one." card={false} /></div>
          : <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60">
                <p className="text-sm font-bold text-gray-800">All Classes</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {classTimetables.length} class{classTimetables.length !== 1 ? 'es' : ''} · select a day to view that day's schedule across all classes
                </p>
              </div>
              <div className="p-5">
                <CombinedTimetableGrid
                  entries={classTimetables.map(t => ({ label: t.classRoom, content: t.content }))}
                />
              </div>
            </div>
      ) : tab === 'class' ? (
        classTimetables.length === 0
          ? <div className="bg-white rounded-2xl border border-gray-100 p-12"><EmptyState icon={Calendar} message="No class timetables yet. Use Auto-Generate to create one." card={false} /></div>
          : <div className="space-y-4">{classTimetables.map(t => (
              <TimetableCard
                key={t.id}
                id={t.id}
                classRoomId={t.classRoomId}
                title={t.classRoom}
                icon={BookOpen}
                iconColor="bg-blue-100 text-blue-600"
                content={t.content}
                teacher={t.teacher}
                updatedAt={t.updatedAt}
                courses={allCourses}
                onDeleted={reload}
                onUpdated={reload}
              />
            ))}</div>
      ) : (
        examTimetables.length === 0
          ? <div className="bg-white rounded-2xl border border-gray-100 p-12"><EmptyState icon={Calendar} message="No exam timetables yet. Use Auto-Generate to create one." card={false} /></div>
          : <div className="space-y-4">{examTimetables.map(t => (
              <TimetableCard
                key={t.id}
                id={t.id}
                level={t.level}
                title={`${(t.level ?? '').charAt(0).toUpperCase() + (t.level ?? '').slice(1) || 'Exam'} Level`}
                icon={GraduationCap}
                iconColor="bg-purple-100 text-purple-600"
                content={t.content}
                teacher={t.teacher}
                updatedAt={t.updatedAt}
                courses={allCourses}
                onDeleted={reload}
                onUpdated={reload}
              />
            ))}</div>
      )}
    </div>
  );
}
