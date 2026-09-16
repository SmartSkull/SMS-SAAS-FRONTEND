'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Calendar, Clock, User, BookOpen, GraduationCap, Plus, Trash2,
  Save, Sparkles, ArrowLeft, CheckCircle, AlertCircle, X, ChevronDown,
  Download, FileImage, Pencil,
} from 'lucide-react';
import type { AdminClassTimetable, AdminExamTimetable } from '@/hooks/admin';
import { api, endpoints, getImageUrl } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/StateDisplay';
import { readSelectedSchool, useSelectedSchool } from '@/hooks/useSelectedSchool';
import clsx from 'clsx';

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
type Day = typeof DAYS[number];

const DAY_SHORT: Record<Day, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri',
};

/** Academic session/term row, used for the timetable title block. */
type PeriodRef = { id?: number | string; name?: string; isCurrent?: boolean };
type PeriodRefList = { data?: PeriodRef[] };

const PERIOD_COLORS = [
  'bg-blue-500', 'bg-sky-500', 'bg-indigo-500', 'bg-violet-500',
  'bg-fuchsia-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-orange-500',
];

const TIMETABLE_ACTIVITY_OPTIONS = [
  'Assembly',
  'Sport',
  'Chess',
  'Club Activities',
  'Extra-Curricular Activities / Fellowship',
  'Quiz / Debate',
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

/**
 * Each day owns its own period list, so a day can run a different number of
 * periods, different breaks and different lengths without touching the rest.
 * `startTime`/`endTime` are always kept recalculated for the day.
 */
type DaySlots = Record<Day, ScheduleSlot[]>;

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

/**
 * One subject configuration. A subject may appear more than once — schools often
 * teach the same subject to different class groups with different teachers, and
 * each teacher has their own availability. `instanceId` identifies the row,
 * `subjectId` the subject it teaches.
 */
interface SubjectConfig {
  instanceId: string;
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
  /**
   * Teaching period length in minutes, per day. Schools often run a shorter
   * period on one day (a Friday, say), so the length is chosen per day rather
   * than once for the whole week. Breaks keep their own length regardless.
   */
  dayDurations: Record<Day, number>;
}

interface GeneratedResult {
  rows: PeriodRow[];
  /** classRoomId → serialised content */
  byClass: Record<string, string>;
}

interface SchedulerDraft {
  setup: SetupData;
  daySlots: DaySlots;
  subjects: SubjectConfig[];
}

const schedulerDraftKey = (schoolId?: string) => `timetable-scheduler:${schoolId ?? 'default'}`;

function readSchedulerDraft(schoolId?: string): SchedulerDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(schedulerDraftKey(schoolId));
    return parseSchedulerDraft(raw);
  } catch {
    return null;
  }
}

function parseSchedulerDraft(content: unknown): SchedulerDraft | null {
  try {
    const raw: unknown = typeof content === 'string' ? JSON.parse(content) : content;
    if (!raw || typeof raw !== 'object') return null;
    const draft = raw as Partial<SchedulerDraft> & { slots?: ScheduleSlot[] };
    if (!draft.setup || !Array.isArray(draft.subjects)) return null;
    // Drafts saved before per-day lists held one shared list — treat it as every
    // day's list so old drafts still restore.
    const daySlots = draft.daySlots && typeof draft.daySlots === 'object'
      ? draft.daySlots
      : sameForEveryDay(Array.isArray(draft.slots) ? draft.slots : []);
    return { setup: draft.setup, daySlots, subjects: draft.subjects };
  } catch {
    return null;
  }
}

function saveSchedulerDraft(draft: SchedulerDraft, schoolId?: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(schedulerDraftKey(schoolId), JSON.stringify(draft));
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

/** Period length applied to a day that has no explicit value. */
const DEFAULT_PERIOD_MINUTES = 40;

/** Period length for one day from a durations map, falling back to the default. */
function durationFrom(dayDurations: Record<Day, number> | undefined, day: Day): number {
  return dayDurations?.[day] ?? DEFAULT_PERIOD_MINUTES;
}

/** Period length for one day, falling back to the default. */
function durationForDay(setup: SetupData, day: Day): number {
  return durationFrom(setup.dayDurations, day);
}

/**
 * The week's normal period length: the value most days use. Used for the
 * minutes-per-week → periods maths and for the times stored on each row, so a
 * single short day (say Friday at 30 min) doesn't drag those numbers around.
 */
function basePeriodDuration(setup: SetupData): number {
  const counts = new Map<number, number>();
  for (const day of DAYS) {
    const value = durationForDay(setup, day);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  let best = DEFAULT_PERIOD_MINUTES;
  let bestCount = -1;
  for (const day of DAYS) {
    const value = durationForDay(setup, day);
    const count = counts.get(value) ?? 0;
    // `>` keeps the earliest day on a tie, so the value is stable.
    if (count > bestCount) { best = value; bestCount = count; }
  }
  return best;
}

/**
 * Lay the period structure onto a timeline. Teaching periods take the given
 * day's length; breaks always keep their own, so a 30-minute break stays 30
 * minutes on every day. Omitting `teachingDuration` uses each slot's own value.
 */
function recalcTimes(slots: ScheduleSlot[], schoolStart: string, teachingDuration?: number): ScheduleSlot[] {
  let cursor = schoolStart;
  return slots.map(slot => {
    const duration = (slot.isBreak || teachingDuration === undefined) ? slot.duration : teachingDuration;
    const start = cursor;
    const end = addMinutes(start, duration);
    cursor = end;
    return { ...slot, startTime: start, endTime: end, duration };
  });
}

/** A fresh day list cloned from another, with new ids so edits stay independent. */
function cloneDaySlots(slots: ScheduleSlot[]): ScheduleSlot[] {
  return slots.map(slot => ({ ...slot, id: uid() }));
}

/** Every day starting from the same list — the common case. */
function sameForEveryDay(slots: ScheduleSlot[]): DaySlots {
  return Object.fromEntries(DAYS.map(day => [day, cloneDaySlots(slots)])) as DaySlots;
}

/** Teaching-period times for every day, from that day's own list. */
function periodTimesByDay(daySlots: DaySlots): Record<Day, { start: string; end: string }[]> {
  const result = {} as Record<Day, { start: string; end: string }[]>;
  for (const day of DAYS) {
    result[day] = (daySlots[day] ?? [])
      .filter(slot => !slot.isBreak)
      .map(slot => ({ start: slot.startTime, end: slot.endTime }));
  }
  return result;
}

/** Every day's period rows, for serialising and rendering. */
function rowsByDay(daySlots: DaySlots): Record<Day, PeriodRow[]> {
  const result = {} as Record<Day, PeriodRow[]>;
  for (const day of DAYS) {
    result[day] = (daySlots[day] ?? []).map(slot => ({
      startTime: slot.startTime, endTime: slot.endTime, label: slot.label, isBreak: slot.isBreak,
    }));
  }
  return result;
}

/** Teaching slots a day runs, i.e. the length of its subject list. */
function teachingCount(rows: PeriodRow[]): number {
  return rows.filter(row => !row.isBreak).length;
}

/** True when any day's period list differs from the first day's. */
function daySlotsDiffer(daySlots: DaySlots): boolean {
  const signature = (day: Day) =>
    (daySlots[day] ?? []).map(s => `${s.isBreak ? 'break' : 'period'}:${s.duration}`).join('|');
  const first = signature(DAYS[0]);
  return DAYS.some(day => signature(day) !== first);
}

/**
 * Given a teacher's availability windows, return which (day, periodIdx) slots
 * fall inside them. Each window is matched against its own day's period times,
 * since days can run different-length periods.
 */
function windowsToSlots(
  windows: DayWindow[],
  timesByDay: Record<Day, { start: string; end: string }[]>,
): { day: Day; periodIdx: number }[] {
  const result: { day: Day; periodIdx: number }[] = [];
  for (const win of windows) {
    const winFrom = toMinutes(win.from);
    const winTo   = toMinutes(win.to);
    (timesByDay[win.day] ?? []).forEach((p, idx) => {
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
/**
 * Per-day lengths ride along as a trailing `#DURATIONS:` line. Older readers
 * (the student view, the desktop app) only look for lines starting with a day
 * name, so they skip it and keep working off the row times.
 */
const DURATIONS_PREFIX = '#DURATIONS:';
const DAYROWS_PREFIX = '#DAYROWS:';

type RowPayload = { s?: string; e?: string; l?: string; b?: boolean };

const toPayload = (rows: PeriodRow[]) =>
  rows.map(r => ({ s: r.startTime, e: r.endTime, l: r.label, b: r.isBreak }));

const fromPayload = (r: RowPayload): PeriodRow => ({
  startTime: r.s ?? '', endTime: r.e ?? '', label: r.l ?? '', isBreak: !!r.b,
});

function serialize(rows: PeriodRow[], grid: Record<string, string[]>, dayRows?: Record<Day, PeriodRow[]>): string {
  const periodsJson = JSON.stringify(toPayload(rows));
  const gridPart = DAYS.map(d => `${d}:${(grid[d] ?? []).join(',')}`).join('\n');
  const dayRowsPart = dayRows
    ? `\n${DAYROWS_PREFIX}${JSON.stringify(
        Object.fromEntries(DAYS.map(d => [d, toPayload(dayRows[d] ?? [])])),
      )}`
    : '';
  return `PERIODS2:${periodsJson}\n${gridPart}${dayRowsPart}`;
}

function deserialize(content: string): { rows: PeriodRow[]; grid: Record<string, string[]>; dayRows?: Record<Day, PeriodRow[]> } {
  const emptyGrid = () => Object.fromEntries(DAYS.map(d => [d, [] as string[]]));
  if (!content || !content.startsWith('PERIODS2:')) return { rows: [], grid: emptyGrid() };
  const nl = content.indexOf('\n');
  const jsonStr = content.slice('PERIODS2:'.length, nl > 0 ? nl : undefined);
  const rest = nl > 0 ? content.slice(nl + 1) : '';
  let rows: PeriodRow[] = [];
  try { rows = (JSON.parse(jsonStr) as RowPayload[]).map(fromPayload); }
  catch { rows = []; }
  const grid = emptyGrid();
  let dayDurations: Record<Day, number> | undefined;
  let dayRows: Record<Day, PeriodRow[]> | undefined;
  rest.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith(DAYROWS_PREFIX)) {
      try {
        const parsed = JSON.parse(trimmed.slice(DAYROWS_PREFIX.length)) as Record<string, RowPayload[]>;
        const out = {} as Record<Day, PeriodRow[]>;
        for (const day of DAYS) {
          if (Array.isArray(parsed[day])) out[day] = parsed[day].map(fromPayload);
        }
        if (Object.keys(out).length) dayRows = out;
      } catch { /* ignore a corrupt line */ }
      return;
    }
    if (trimmed.startsWith(DURATIONS_PREFIX)) {
      const parsed = {} as Record<Day, number>;
      let found = false;
      for (const pair of trimmed.slice(DURATIONS_PREFIX.length).split(',')) {
        const [day, value] = pair.split('=');
        const name = (day ?? '').trim() as Day;
        const minutes = Number(value);
        if ((DAYS as readonly string[]).includes(name) && Number.isFinite(minutes)) {
          parsed[name] = minutes;
          found = true;
        }
      }
      if (found) dayDurations = { ...({} as Record<Day, number>), ...parsed };
      return;
    }
    const ci = trimmed.indexOf(':');
    if (ci < 0) return;
    const day = trimmed.slice(0, ci).trim();
    if ((DAYS as readonly string[]).includes(day)) grid[day] = trimmed.slice(ci + 1).split(',').map(s => s.trim());
  });

  // Content saved earlier today stored one shared row list plus per-day lengths.
  // Rebuild each day from those so per-day rendering still works.
  if (!dayRows && dayDurations && rows.length) {
    const start = rows[0].startTime;
    dayRows = Object.fromEntries(
      DAYS.map(d => [d, rowTimesForDay(rows, start, durationFrom(dayDurations, d))]),
    ) as Record<Day, PeriodRow[]>;
  }

  return { rows, grid, dayRows };
}

/**
 * Re-lay a stored period list for one day's teaching length. Break lengths come
 * from the stored rows, teaching lengths from the day.
 */
function rowTimesForDay(rows: PeriodRow[], schoolStart: string, teachingDuration: number): PeriodRow[] {
  let cursor = schoolStart;
  return rows.map(row => {
    const stored = Math.max(0, toMinutes(row.endTime) - toMinutes(row.startTime));
    const duration = row.isBreak ? stored : teachingDuration;
    const start = cursor;
    const end = addMinutes(start, duration);
    cursor = end;
    return { ...row, startTime: start, endTime: end };
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORT UTILITY
   PNG: html-to-image captures the DOM node as a PNG and triggers download.
   PDF: opens a minimal print window containing just the timetable table so
        the user can save as PDF from the browser print dialog.
═══════════════════════════════════════════════════════════════════════════ */
async function exportAsPng(node: HTMLElement, filename: string) {
  const { toPng } = await import('html-to-image');
  const dataUrl = await toPng(node, {
    backgroundColor: '#ffffff',
    pixelRatio: 2,
    cacheBust: true,
    skipFonts: true,       // avoids CORS errors loading external fonts
    includeQueryParams: true,
  });
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${filename.replace(/[^a-z0-9 _-]/gi, '_')}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* The PNG path captures the live DOM, so Tailwind styles it. A print window has
 * no Tailwind either — exporting the DOM there dropped every utility class and
 * the sheet collapsed. The PDF now prints a clone of the live grid with the
 * page's own stylesheets carried across, so the sheet is the on-screen UI
 * exactly; a transform then shrinks it to a single A4 landscape page. */

/** Every same-origin stylesheet on the page, as text, for the print window. */
function collectDocumentCss(): string {
  let css = '';
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules;
      if (!rules) continue;
      for (const rule of Array.from(rules)) css += rule.cssText + '\n';
    } catch {
      // A cross-origin sheet (a web font, say). The app's own Tailwind bundle
      // is same-origin and is what the grid needs.
    }
  }
  return css;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, char => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char] as string
  ));
}

/* Page setup only — the timetable itself is styled by the app's own CSS, which
 * is copied in alongside this. print-color-adjust keeps the day bands, period
 * colours and break tints from being stripped when the browser prints. */
const PRINT_PAGE_CSS = `
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #fff; }
  @page { size: A4 landscape; margin: 8mm; }
  #inner { overflow: hidden; }
  /* The sheet is sized to the page and the table stretches into it, so the
   * printed page is filled edge to edge rather than sitting in one corner. */
  #sheet { display: flex; flex-direction: column; transform-origin: top left; background: #fff; }
  #sheet > div, #sheet div:has(table) { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
  #sheet table { flex: 1 1 auto; width: 100%; height: 100%; min-height: 0; }
`;

/* Measures the sheet and shrinks it to one page. A transform doesn't affect
 * layout, so the wrapper's box is set to the scaled size to avoid a blank
 * second page from the unscaled overflow. */
const PRINT_FIT_SCRIPT = `
  (function () {
    var MM = 96 / 25.4;
    var PAGE_W = 297, PAGE_H = 210, MARGIN = 8;
    var availW = (PAGE_W - MARGIN * 2) * MM;
    var availH = (PAGE_H - MARGIN * 2) * MM;
    function print() {
      window.onafterprint = function () { window.close(); };
      window.print();
    }
    function go() {
      var inner = document.getElementById('inner');
      var sheet = document.getElementById('sheet');
      if (!inner || !sheet) { print(); return; }
      var w = sheet.offsetWidth;
      var h = sheet.offsetHeight;
      if (w > 0 && h > 0) {
        // Size the sheet to the page at the scale that fits it, then let the
        // table stretch into whatever the scale left over — the sheet covers the
        // printable area instead of sitting in one corner of it.
        var scale = Math.min(availW / w, availH / h);
        sheet.style.width = Math.ceil(availW / scale) + 'px';
        sheet.style.height = Math.ceil(availH / scale) + 'px';
        // Re-measure: sizing the sheet changes what the table needs, and the
        // final scale has to keep the whole sheet inside the page.
        var fit = Math.min(availW / sheet.offsetWidth, availH / sheet.offsetHeight);
        sheet.style.transform = 'scale(' + fit + ')';
        // Floor, not round: a wrapper a fraction over the printable height can
        // spill a blank second page.
        inner.style.width = Math.floor(availW) + 'px';
        inner.style.height = Math.floor(availH) + 'px';
      }
      print();
    }
    if (document.readyState === 'complete') setTimeout(go, 30);
    else window.addEventListener('load', function () { setTimeout(go, 30); });
  })();
`;

/** Prints a clone of the live grid with the app's own stylesheets. Returns
 *  false when the browser blocked the print window. */
function exportNodeAsPdf(node: HTMLElement, title: string): boolean {
  const win = window.open('', '_blank', 'width=1200,height=850');
  if (!win) return false;

  const clone = node.cloneNode(true) as HTMLElement;
  // The grid scrolls on screen; the printed sheet shows all of it.
  clone.classList.remove('overflow-x-auto');
  clone.querySelectorAll('.overflow-x-auto').forEach(el => el.classList.remove('overflow-x-auto'));
  // Editing is a screen affordance — print the chosen subject, not the control.
  clone.querySelectorAll('select').forEach(select => {
    const chosen = (select as HTMLSelectElement).selectedOptions[0]?.textContent?.trim() ?? '';
    const text = document.createElement('span');
    text.textContent = chosen;
    select.replaceWith(text);
  });

  win.document.write(
    '<!DOCTYPE html><html><head><meta charset="utf-8">'
    + '<title>' + escapeHtml(title) + '</title>'
    // App styles first, then the page setup, so the latter wins any conflict
    // (an app-level body padding would otherwise push the sheet off the page).
    + '<style>' + collectDocumentCss() + '</style>'
    + '<style>' + PRINT_PAGE_CSS + '</style>'
    + '</head><body><div id="inner"><div id="sheet">'
    + clone.outerHTML
    + '</div></div>'
    + '<script>' + PRINT_FIT_SCRIPT + '<\/script>'
    + '</body></html>',
  );
  win.document.close();
  return true;
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
     Key format: "<instanceId>|<day>|<periodIdx>"
═══════════════════════════════════════════════════════════════════════════ */
function autoFill(
  configs: (SubjectConfig & { availableSlots: { day: Day; periodIdx: number }[]; periodsCount: number })[],
  periodCountByDay: Record<Day, number>,
  seed: number = 0,
  teacherBusy: Set<string> = new Set(),
): Record<string, string[]> {
  const grid: Record<string, string[]> = Object.fromEntries(
    DAYS.map(d => [d, Array(periodCountByDay[d] ?? 0).fill('')])
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

        // Teacher conflict: this teacher is already in another class at this time.
        // Keyed by configuration, not subject name, so two teachers of the same
        // subject can each be scheduled in that slot.
        const busyKey = `${subj.instanceId}|${slot.day}|${slot.periodIdx}`;
        if (teacherBusy.has(busyKey)) continue;

        // Avoid back-to-back same subject on the same day
        const dayLength = periodCountByDay[slot.day] ?? 0;
        const prevSubj = slot.periodIdx > 0 ? grid[slot.day][slot.periodIdx - 1] : '';
        const nextSubj = slot.periodIdx < dayLength - 1 ? grid[slot.day][slot.periodIdx + 1] : '';
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
/** Slot position → teaching index; breaks and missing slots hold no subject. */
function teachingIndexAt(rows: PeriodRow[], slotIdx: number): number {
  if (slotIdx >= rows.length || rows[slotIdx].isBreak) return -1;
  let count = 0;
  for (let i = 0; i < slotIdx; i++) if (!rows[i].isBreak) count++;
  return count;
}

function TimetableGrid({ content }: { content: string }) {
  const { rows, grid, dayRows } = deserialize(content);

  // Each day can run its own list, so read each day's own rows. Content saved
  // without per-day rows falls back to the shared list.
  const rowsForDay = (day: Day): PeriodRow[] => dayRows?.[day] ?? rows;
  const slotCount = DAYS.reduce((max, day) => Math.max(max, rowsForDay(day).length), 0);

  if (slotCount === 0) return <p className="text-sm text-gray-400 py-4 text-center">Empty timetable.</p>;

  return (
    <div className="overflow-x-auto border-2 border-slate-700 bg-white">
      <table className="w-full min-w-[640px] border-collapse font-mono text-xs">
        <thead>
          <tr className="border-b-2 border-slate-700 bg-slate-100">
            <th className="w-20 border-r border-slate-500 px-3 py-2 text-left text-[9px] font-black uppercase tracking-[0.12em] text-slate-800">Day</th>
            {Array.from({ length: slotCount }, (_, i) => (
              <th key={i} className="border-r border-slate-500 px-3 py-2 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-900 last:border-r-0">{i + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map(day => {
            const dayList = rowsForDay(day);
            return (
              <tr key={day} className="border-b border-slate-400 last:border-b-0">
                <td className="border-r border-slate-500 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-900">
                  {DAY_SHORT[day]}
                </td>
                {Array.from({ length: slotCount }, (_, slotIdx) => {
                  const row = dayList[slotIdx];
                  // This day has no such slot — leave it blank rather than
                  // borrowing another day's time.
                  if (!row) return <td key={slotIdx} className="border-r border-slate-400 bg-slate-50 p-1.5 last:border-r-0" />;
                  if (row.isBreak) {
                    return (
                      <td key={slotIdx} className="border-r border-slate-400 bg-slate-200 p-1.5 text-center last:border-r-0">
                        <div className="text-[9px] font-black tabular-nums text-slate-700">{row.startTime}</div>
                        <div className="text-[9px] font-black uppercase tracking-wide text-slate-800">{row.label || 'Break'}</div>
                      </td>
                    );
                  }
                  const subject = grid[day]?.[teachingIndexAt(dayList, slotIdx)] ?? '';
                  return (
                    <td key={slotIdx} className="border-r border-slate-400 p-1.5 text-center last:border-r-0">
                      <div className="text-[9px] font-bold tabular-nums text-slate-500">{row.startTime}</div>
                      <div className="min-h-[30px] px-1 py-1 text-[10px] font-black uppercase leading-tight text-slate-800">{subject}</div>
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
   The whole week in one table, laid out like the school's printed master sheet:
   period number and time down the left, days across the top, and each cell
   listing every class timetabled then as "CLASS: SUBJECT". Non-teaching
   periods (assembly, sport, break, lunch) run as a full-width band.
═══════════════════════════════════════════════════════════════════════════ */
function CombinedTimetableGrid({ entries, exportTitle, courses, onSaved, onSaveDrafts }: {
  entries: { id?: string; classRoomId?: string; label: string; content: string }[];
  exportTitle?: string;
  courses?: { id: string; course: string }[];
  onSaved?: () => void;
  onSaveDrafts?: (contentById: Record<string, string>) => Promise<void> | void;
}) {
  const [exporting, setExporting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Record<string, string[]>>>({});
  const [heading, setHeading] = useState<{ term?: string; session?: string }>({});
  const gridRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Current term/session for the title block. Pulled from the public endpoints
  // so the admin and staff pages can share this component unchanged.
  // Purely cosmetic — any failure just leaves the title line off.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [termsRes, sessionsRes] = await Promise.all([
          api.get<PeriodRefList>(endpoints.public.terms),
          api.get<PeriodRefList>(endpoints.public.sessions),
        ]);
        if (cancelled) return;
        setHeading({
          term: (termsRes?.data ?? []).find(t => t.isCurrent)?.name,
          session: (sessionsRes?.data ?? []).find(s => s.isCurrent)?.name,
        });
      } catch { /* cosmetic only */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleExport = async (format: 'png' | 'pdf') => {
    const title = exportTitle ?? 'All Classes Timetable';
    setExporting(true);
    try {
      if (!gridRef.current) return;
      if (format === 'pdf') {
        // The live grid already is the sheet — print a clone of it.
        if (!exportNodeAsPdf(gridRef.current, title)) {
          toast.error('Allow pop-ups for this site to save the PDF');
        }
      } else {
        await exportAsPng(gridRef.current, title);
      }
    } catch (e) {
      console.error('Export error:', e);
      toast.error('Export failed — check browser console for details');
    } finally {
      setExporting(false);
    }
  };

  // Keep the master sheet in school order even when timetable records arrive
  // from the API in a different order (for example, SS3 before JSS1).
  const parsed = useMemo(() => {
    const classOrder = (label: string) => {
      const value = label.toUpperCase().replace(/\s+/g, '');
      const match = value.match(/^(JSS|JS|SS|SSS|SENIOR)([1-3])$/);
      if (!match) return 100;

      const level = match[1];
      const year = Number(match[2]);
      return (level === 'JSS' || level === 'JS' ? 10 : 20) + year;
    };

    return entries
      .map(e => ({ ...e, ...deserialize(e.content) }))
      .sort((a, b) => classOrder(a.label) - classOrder(b.label) || a.label.localeCompare(b.label));
  }, [entries]);

  // Use the period structure shared by most classes as the column set. Unioning
  // every structure instead would add a near-duplicate column for every class
  // that starts a few minutes off, leaving the table full of empty columns.
  const periods = useMemo(() => {
    const groups = new Map<string, { rows: PeriodRow[]; count: number }>();
    for (const entry of parsed) {
      if (!entry.rows.length) continue;
      const signature = entry.rows.map(r => `${r.startTime}-${r.endTime}-${r.isBreak ? 1 : 0}`).join('|');
      const group = groups.get(signature);
      if (group) group.count += 1;
      else groups.set(signature, { rows: entry.rows, count: 1 });
    }
    const best = [...groups.values()].sort(
      (a, b) => b.count - a.count || b.rows.length - a.rows.length
    )[0];
    return best ? [...best.rows].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)) : [];
  }, [parsed]);

  // Every class is generated with the same per-day structures, so the first
  // entry that carries them supplies the sheet's rows for each day.
  const sheetDayRows = useMemo(
    () => parsed.find(entry => entry.dayRows)?.dayRows,
    [parsed]
  );

  /** The period rows a day actually runs. */
  const dayRowsFor = (day: Day): PeriodRow[] => sheetDayRows?.[day] ?? periods;

  // Columns are slot positions, so the longest day decides how many there are.
  // A day with fewer slots simply leaves the later cells blank.
  const slotCount = useMemo(
    () => Math.max(periods.length, ...DAYS.map(d => (sheetDayRows?.[d] ?? periods).length)),
    [periods, sheetDayRows],
  );

  const entryKey = (entry: typeof parsed[number], entryIdx: number) => entry.id ?? String(entryIdx);

  /** The rows to read a class's subjects through on one day. */
  const rowsForEntryDay = (entryIdx: number, day: Day): PeriodRow[] =>
    parsed[entryIdx].dayRows?.[day] ?? dayRowsFor(day);

  const subjectAt = (entryIdx: number, day: Day, slotIdx: number) => {
    const entry = parsed[entryIdx];
    const teachIdx = teachingIndexAt(rowsForEntryDay(entryIdx, day), slotIdx);
    if (teachIdx < 0) return '';
    return (editing ? drafts[entryKey(entry, entryIdx)]?.[day]?.[teachIdx] : entry.grid[day]?.[teachIdx]) ?? '';
  };

  /**
   * When every class reads the same thing in a slot — a whole-school activity
   * like Chess or Assembly — the grid prints it once across the class rows
   * instead of repeating it on each, the way a break is written once.
   * Only outside edit mode, so editing still reaches every class on its own.
   */
  const sharedAt = (day: Day, slotIdx: number): string | null => {
    if (editing || parsed.length < 2) return null;
    let value: string | null = null;
    for (let i = 0; i < parsed.length; i++) {
      const row = rowsForEntryDay(i, day)[slotIdx];
      if (!row || row.isBreak) return null;
      const subject = subjectAt(i, day, slotIdx);
      if (!subject) return null;
      if (value === null) value = subject;
      else if (value !== subject) return null;
    }
    return value;
  };

  const startEditing = () => {
    setDrafts(Object.fromEntries(parsed.map((entry, entryIdx) => [
      entryKey(entry, entryIdx),
      Object.fromEntries(Object.entries(entry.grid).map(([day, subjects]) => [day, [...subjects]])),
    ])));
    setEditing(true);
  };

  const setSubject = (entryIdx: number, day: Day, slotIdx: number, subject: string) => {
    const teachIdx = teachingIndexAt(rowsForEntryDay(entryIdx, day), slotIdx);
    if (teachIdx < 0) return;
    const key = entryKey(parsed[entryIdx], entryIdx);
    setDrafts(current => {
      const classDraft = current[key] ?? {};
      const dayDraft = [...(classDraft[day] ?? parsed[entryIdx].grid[day] ?? [])];
      dayDraft[teachIdx] = subject;
      return { ...current, [key]: { ...classDraft, [day]: dayDraft } };
    });
  };

  const saveAll = async () => {
    if (!courses) return;
    setSaving(true);
    try {
      const contentById = Object.fromEntries(parsed.map((entry, entryIdx) => [
        entryKey(entry, entryIdx),
        // Carry each day's own rows through, or a save here would drop them.
        serialize(entry.rows, drafts[entryKey(entry, entryIdx)] ?? entry.grid, entry.dayRows ?? sheetDayRows),
      ]));
      if (onSaveDrafts) {
        await onSaveDrafts(contentById);
        toast.success('Generated timetable changes applied');
      } else {
        if (parsed.some(entry => !entry.id || !entry.classRoomId)) return;
        await Promise.all(parsed.map((entry, entryIdx) => api.post(endpoints.staff.classTimetable, {
          id: entry.id,
          classRoomId: entry.classRoomId,
          content: contentById[entryKey(entry, entryIdx)],
        })));
        toast.success('All class timetables updated');
      }
      setEditing(false);
      onSaved?.();
    } catch {
      toast.error('Could not save all timetable changes');
    } finally {
      setSaving(false);
    }
  };

  const teachingPeriods = periods.filter(p => !p.isBreak);
  const canEdit = Boolean(courses && (onSaveDrafts || parsed.every(entry => entry.id && entry.classRoomId)));

  if (!periods.length) return <p className="text-sm text-gray-400 py-4 text-center">No timetable data.</p>;

  // Day and class labels form the first columns; one column per slot position.
  const gridWidth = 72 + 108 + slotCount * 112;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-[11px] text-gray-400">
          {DAYS.length} days · {parsed.length} class{parsed.length !== 1 ? 'es' : ''} ·{' '}
          {teachingPeriods.length} teaching period{teachingPeriods.length !== 1 ? 's' : ''} — days and classes down the side, time across the top
        </p>
        <div className="flex items-center gap-1.5">
          {canEdit && (editing ? (
            <>
              <button onClick={() => setEditing(false)} disabled={saving}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40">
                <X size={13} /> Cancel
              </button>
              <button onClick={saveAll} disabled={saving}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-green-600 text-xs font-bold text-white hover:bg-green-700 transition-colors disabled:opacity-50">
                <Save size={13} /> {saving ? 'Saving...' : onSaveDrafts ? 'Apply changes' : 'Save all'}
              </button>
            </>
          ) : (
            <button onClick={startEditing}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 transition-colors">
              <Pencil size={13} /> Edit all classes
            </button>
          ))}
          <button onClick={() => handleExport('png')} disabled={exporting}
            title="Download as PNG"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-colors disabled:opacity-40">
            <FileImage size={13} /> PNG
          </button>
          <button onClick={() => handleExport('pdf')} disabled={exporting}
            title="Print / Save as PDF"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-40">
            <Download size={13} /> PDF
          </button>
        </div>
      </div>

      {/* Grid */}
      <div ref={gridRef} className="overflow-x-auto border-2 border-slate-700 bg-white shadow-sm">
        {/* Title block */}
        <div className="border-b-2 border-slate-700 px-4 py-4 text-center">
          <p className="text-[15px] font-black uppercase tracking-[0.16em] text-slate-950">
            {exportTitle ?? 'Master Timetable'}
          </p>
          {(heading.term || heading.session) && (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
              {[heading.term, heading.session].filter(Boolean).join(' · ')} — All Classes
            </p>
          )}
        </div>

        <table className="w-full border-collapse font-mono text-xs" style={{ minWidth: `${gridWidth}px` }}>
          <thead>
            <tr className="border-b-2 border-slate-700 bg-slate-100">
              <th className="w-[72px] border-r border-slate-500 px-1 py-2 text-center text-[9px] font-black uppercase tracking-[0.12em] text-slate-800">
                Day
              </th>
              <th className="w-[108px] border-r border-slate-500 px-2 py-2 text-left text-[9px] font-black uppercase tracking-[0.12em] text-slate-800">
                Class
              </th>
              {/* Columns are slot positions. Each day prints its own times in the
                  strip below, since days can differ in length and in count. */}
              {Array.from({ length: slotCount }, (_, i) => (
                <th key={i} className="border-r border-slate-500 px-1 py-2 text-center last:border-r-0">
                  <p className="text-[9px] font-black tabular-nums text-slate-900">{i + 1}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.flatMap(day => {
              // A day whose period lengths differ from the shared header gets its
              // own time strip, so Friday at 30 minutes reads correctly.
              const dayRows = dayRowsFor(day);
              const teachingOnDay = dayRows.filter(r => !r.isBreak).length;
              // Every day prints its own times, so a day that runs a different
              // number of periods or different lengths still reads correctly.
              const strip = (
                <tr key={`strip-${day}`} className="border-b-2 border-slate-700 bg-slate-100">
                  <td className="border-r border-slate-500 px-1 py-1 text-center text-[9px] font-black uppercase tracking-[0.12em] text-slate-800">
                    {DAY_SHORT[day]}
                  </td>
                  <td className="border-r border-slate-500 px-2 py-1 text-left text-[9px] font-black uppercase tracking-[0.12em] text-slate-700">
                    {teachingOnDay} period{teachingOnDay !== 1 ? 's' : ''}
                  </td>
                  {Array.from({ length: slotCount }, (_, i) => {
                    const row = dayRows[i];
                    return (
                      <td key={`${day}-${i}`}
                        className={clsx('border-r border-slate-500 px-1 py-1 text-center last:border-r-0',
                          row?.isBreak ? 'bg-slate-300' : '')}>
                        {row ? (
                          <>
                            <p className="text-[9px] font-black tabular-nums text-slate-900">{row.startTime}</p>
                            <p className="mt-0.5 text-[8px] font-bold text-slate-600">{row.endTime}</p>
                            <p className="mt-1 text-[8px] font-black uppercase tracking-wide text-slate-700">
                              {row.isBreak ? (row.label || 'Break') : `P${i + 1}`}
                            </p>
                          </>
                        ) : (
                          <p className="text-[9px] font-bold text-slate-400">—</p>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );

              return [
                strip,
                ...parsed.map((entry, entryIdx) => (
              <tr key={`${day}-${entry.label}`} className="border-b border-slate-400 align-middle last:border-b-0">
                {entryIdx === 0 && <td rowSpan={parsed.length} className="border-r border-slate-500 bg-slate-200 px-2 text-center text-[11px] font-black uppercase tracking-[0.16em] text-slate-900 [writing-mode:vertical-rl] [transform:rotate(180deg)]">{DAY_SHORT[day]}</td>}
                <td className="border-r border-slate-500 bg-slate-50 px-2 py-2 text-center text-[10px] font-black uppercase text-slate-900">{entry.label}</td>
                {Array.from({ length: slotCount }, (_, slotIdx) => {
                  const row = rowsForEntryDay(entryIdx, day)[slotIdx];
                  // No slot that day, or it is a break — the strip above already
                  // says what it is, so the body stays calm.
                  if (!row || row.isBreak) {
                    return (
                      <td key={slotIdx}
                        className={clsx('border-r border-slate-400 last:border-r-0',
                          row?.isBreak ? 'bg-slate-200 px-1 py-2' : 'bg-slate-50 px-1 py-2')} />
                    );
                  }
                  // Whole-school activity in this slot: one cell spanning the
                  // class rows, carried by the first row only.
                  const shared = sharedAt(day, slotIdx);
                  if (shared) {
                    if (entryIdx !== 0) return null;
                    return (
                      <td key={slotIdx} rowSpan={parsed.length}
                        className="border-r border-slate-400 bg-slate-100 px-1 py-2 text-center text-[10px] font-black uppercase tracking-wide text-slate-800 last:border-r-0">
                        {shared}
                      </td>
                    );
                  }
                  const subject = subjectAt(entryIdx, day, slotIdx);
                  return (
                    <td key={slotIdx} className="border-r border-slate-400 px-1 py-2 text-center text-[10px] font-black uppercase leading-tight text-slate-800 last:border-r-0">
                      {editing ? (
                        <select
                          value={subject}
                          onChange={event => setSubject(entryIdx, day, slotIdx, event.target.value)}
                          className={clsx(
                            'w-full min-w-24 rounded-md border px-1 py-1.5 text-center text-[9px] font-black uppercase outline-none',
                            subject ? 'border-blue-300 bg-blue-50 text-slate-800' : 'border-dashed border-slate-300 bg-white text-slate-400'
                          )}>
                          <option value="">Free</option>
                          <optgroup label="Subjects">
                            {courses?.map(course => <option key={course.id} value={course.course}>{course.course}</option>)}
                          </optgroup>
                          <optgroup label="Timetable activities">
                            {TIMETABLE_ACTIVITY_OPTIONS.map(activity => <option key={activity} value={activity}>{activity}</option>)}
                          </optgroup>
                        </select>
                      ) : subject}
                    </td>
                  );
                })}
              </tr>
                )),
              ];
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
  const { rows, grid: initGrid, dayRows } = deserialize(content);
  const [grid, setGrid] = useState<Record<string, string[]>>(() => {
    // deep-clone
    return Object.fromEntries(Object.entries(initGrid).map(([d, arr]) => [d, [...arr]]));
  });

  // Each day can run its own list, so the editor walks all of them.
  const rowsForDay = (day: Day): PeriodRow[] => dayRows?.[day] ?? rows;
  const slotCount = DAYS.reduce((max, day) => Math.max(max, rowsForDay(day).length), 0);

  const setCell = (day: Day, teachIdx: number, value: string) => {
    setGrid(g => {
      const arr = [...(g[day] ?? [])];
      while (arr.length <= teachIdx) arr.push('');
      arr[teachIdx] = value;
      return { ...g, [day]: arr };
    });
  };

  if (slotCount === 0) return <p className="text-sm text-gray-400 py-4 text-center">Nothing to edit.</p>;

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
              {DAYS.map(d => <th key={d} className="p-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 text-center">{DAY_SHORT[d]}</th>)}
            </tr>
          </thead>
          <tbody>
            {/* Rows are slot positions; each day shows its own slot there, so a
                day with more (or fewer) periods is still fully editable. */}
            {Array.from({ length: slotCount }, (_, slotIdx) => (
              <tr key={slotIdx} className={slotIdx % 2 === 0 ? 'bg-gray-50/40' : 'bg-white'}>
                <td className="p-3 align-top">
                  <div className="text-xs font-black text-gray-500">P{slotIdx + 1}</div>
                </td>
                {DAYS.map(day => {
                  const list = rowsForDay(day);
                  const row = list[slotIdx];
                  // This day has no such slot.
                  if (!row) {
                    return <td key={day} className="p-1.5 align-top"><div className="rounded-xl bg-gray-50 py-3 text-center text-[10px] font-bold text-gray-300">—</div></td>;
                  }
                  if (row.isBreak) {
                    return (
                      <td key={day} className="p-1.5 align-top">
                        <div className="rounded-xl bg-amber-50 px-2 py-2 text-center text-[10px] font-bold text-amber-700">
                          {row.startTime}
                          <div className="uppercase tracking-wide">☕ {row.label || 'Break'}</div>
                        </div>
                      </td>
                    );
                  }
                  const teachIdx = teachingIndexAt(list, slotIdx);
                  const current = grid[day]?.[teachIdx] ?? '';
                  return (
                    <td key={day} className="p-1.5 align-top">
                      <div className="mb-0.5 text-center text-[9px] font-bold tabular-nums text-gray-400">{row.startTime}</div>
                      <select
                        value={current}
                        onChange={e => setCell(day, teachIdx, e.target.value)}
                        className={clsx(
                          'w-full rounded-xl border-2 px-2 py-2 text-xs font-bold text-center appearance-none focus:outline-none transition-colors cursor-pointer',
                          current
                            ? `${PERIOD_COLORS[slotIdx % PERIOD_COLORS.length]} text-white border-transparent`
                            : 'border-dashed border-gray-200 bg-white text-gray-400 hover:border-blue-300'
                        )}>
                        <option value="">— free —</option>
                        <optgroup label="Subjects">
                          {courses.map(c => (
                            <option key={c.id} value={c.course}>{c.course}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Timetable activities">
                          {TIMETABLE_ACTIVITY_OPTIONS.map(activity => <option key={activity} value={activity}>{activity}</option>)}
                        </optgroup>
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onCancel}
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          <X size={14} /> Cancel
        </button>
        <button
          // Carry each day's own rows through, or saving here would drop the
          // per-day structure and the edits would vanish.
          onClick={() => onSave(serialize(rows, grid, dayRows))}
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
function TimetableCard({ title, icon: Icon, iconColor, content, teacher, updatedAt, id, classRoomId, level, courses, selected, onToggleSelect, onDeleted, onUpdated, startInEditMode = false }: {
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
  /** When provided, the card shows a checkbox for bulk selection. */
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onDeleted: () => void;
  onUpdated: () => void;
  startInEditMode?: boolean;
}) {
  const [expanded, setExpanded] = useState(startInEditMode);
  const [mode, setMode]         = useState<'view' | 'edit'>(startInEditMode ? 'edit' : 'view');
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pendingExport, setPendingExport] = useState<'png' | 'pdf' | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Fires after expanded=true causes gridRef.current to be populated. Both
  // formats export the live grid, so both wait for it.
  useEffect(() => {
    if (!pendingExport || !gridRef.current) return;
    const format = pendingExport;
    setPendingExport(null);
    setExporting(true);
    (async () => {
      try {
        if (format === 'pdf') {
          if (!exportNodeAsPdf(gridRef.current!, title)) {
            toast.error('Allow pop-ups for this site to save the PDF');
          }
        } else {
          await exportAsPng(gridRef.current!, title);
        }
      } catch (e) {
        console.error('Export error:', e);
        toast.error('Export failed — check browser console for details');
      } finally {
        setExporting(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingExport, expanded]);

  const handleExport = (format: 'png' | 'pdf') => {
    setExpanded(true);
    setMode('view');
    setPendingExport(format);
  };

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
    <div className={clsx(
      'bg-white rounded-2xl shadow-sm border overflow-hidden transition-colors',
      selected ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-100'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        {/* Selection checkbox — outside the expand target so ticking it doesn't
            also open the card. */}
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={() => onToggleSelect(id)}
            aria-label={`Select ${title}`}
            className="w-4 h-4 mr-3 shrink-0 cursor-pointer rounded accent-blue-600"
          />
        )}
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

          {/* Export buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleExport('png')}
              disabled={exporting}
              title="Download as PNG image"
              className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-colors disabled:opacity-40">
              <FileImage size={14} />
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting}
              title="Print / Save as PDF"
              className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-40">
              <Download size={14} />
            </button>
          </div>

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
        <div className="p-5" ref={gridRef}>
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
  classes, loadingMeta, onNext, initialClassRoomIds = [],
}: { classes: { id: string; name: string }[]; loadingMeta: boolean; onNext: (d: SetupData) => void; initialClassRoomIds?: string[] }) {
  const toast = useToast();
  const [type, setType]            = useState<'class' | 'exam'>('class');
  const [level, setLevel]          = useState<'junior' | 'senior'>('junior');
  const [selectedIds, setSelected] = useState<string[]>(initialClassRoomIds);
  const [schoolStart, setStart]    = useState('08:00');
  const [dayDurations, setDayDurations] = useState<Record<Day, number>>(
    () => Object.fromEntries(DAYS.map(d => [d, DEFAULT_PERIOD_MINUTES])) as Record<Day, number>
  );

  // Kept permissive while typing so clearing the field doesn't snap to a
  // minimum mid-edit; clamped on blur and again before continuing.
  const setDayDur = (day: Day, raw: number) =>
    setDayDurations(prev => ({ ...prev, [day]: Number.isFinite(raw) ? raw : prev[day] }));
  const clampDayDur = (day: Day) =>
    setDayDurations(prev => ({
      ...prev,
      [day]: Math.min(180, Math.max(5, Math.round(prev[day]) || DEFAULT_PERIOD_MINUTES)),
    }));
  const applyFirstToAll = () =>
    setDayDurations(prev => Object.fromEntries(DAYS.map(d => [d, prev[DAYS[0]]])) as Record<Day, number>);

  const durationsVary = new Set(DAYS.map(d => dayDurations[d])).size > 1;
  const standardLength = basePeriodDuration({ type, level, classRoomIds: selectedIds, schoolStart, dayDurations });

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

      {/* Period length, per day */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-gray-700">Teaching period length</label>
          <button type="button" onClick={applyFirstToAll}
            className="text-xs text-blue-500 hover:text-blue-700 font-medium">
            Apply {DAY_SHORT[DAYS[0]]} to all days
          </button>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {DAYS.map(day => (
            <label key={day}
              className={clsx(
                'flex flex-col items-center gap-0.5 rounded-xl border px-1.5 py-2 bg-white transition-colors',
                durationsVary && dayDurations[day] !== standardLength ? 'border-amber-300' : 'border-gray-200'
              )}>
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{DAY_SHORT[day]}</span>
              <input type="number" min={5} max={180} step={5} value={dayDurations[day]}
                onChange={e => setDayDur(day, Number(e.target.value))}
                onBlur={() => clampDayDur(day)}
                className="w-full min-w-0 text-center text-sm font-bold text-gray-800 tabular-nums focus:outline-none" />
              <span className="text-[9px] text-gray-400">min</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          {durationsVary
            ? `Days with different lengths get their own times on the timetable. Subject minutes use the standard ${standardLength} min period.`
            : 'Used on every day. Change a single day if it runs shorter or longer periods.'}
        </p>
      </div>

      <button onClick={() => {
        if (type === 'class' && selectedIds.length === 0) return toast.error('Select at least one class');
        if (!schoolStart) return toast.error('Set a school start time');
        const cleaned = Object.fromEntries(DAYS.map(d => [
          d, Math.min(180, Math.max(5, Math.round(dayDurations[d]) || DEFAULT_PERIOD_MINUTES)),
        ])) as Record<Day, number>;
        setDayDurations(cleaned);
        onNext({ type, level, classRoomIds: selectedIds, schoolStart, dayDurations: cleaned });
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
  setup, daySlots, setDaySlots,
}: {
  setup: SetupData;
  daySlots: DaySlots;
  setDaySlots: React.Dispatch<React.SetStateAction<DaySlots>>;
}) {
  // One day is edited at a time and only that day's list is touched, so giving
  // Friday six periods leaves Monday's five alone.
  const [editDay, setEditDay] = useState<Day>(DAYS[0]);
  const defaultLength = durationForDay(setup, editDay);
  const timedSlots = daySlots[editDay] ?? [];

  /** Rewrite only the day being edited, keeping its times current. */
  const updateDay = (updater: (slots: ScheduleSlot[]) => ScheduleSlot[]) =>
    setDaySlots(prev => ({
      ...prev,
      [editDay]: recalcTimes(updater(prev[editDay] ?? []), setup.schoolStart),
    }));

  const addPeriod = () =>
    updateDay(s => [...s, { id: uid(), isBreak: false, startTime: '', endTime: '', label: '', duration: defaultLength }]);

  const insertBreakAfter = (id: string) =>
    updateDay(s => {
      const idx = s.findIndex(x => x.id === id);
      const next = [...s];
      next.splice(idx + 1, 0, { id: uid(), isBreak: true, startTime: '', endTime: '', label: 'Break', duration: 30 });
      return next;
    });

  const removeSlot = (id: string) => updateDay(s => s.filter(x => x.id !== id));
  const patchSlot  = (id: string, patch: Partial<ScheduleSlot>) =>
    updateDay(s => s.map(x => x.id === id ? { ...x, ...patch } : x));

  /** Copy the day being edited over every other day — the common case. */
  const applyToAllDays = () =>
    setDaySlots(prev => sameForEveryDay(prev[editDay] ?? []));

  const editDayCount = teachingCount(rowsByDay(daySlots)[editDay] ?? []);

  const teachCount = timedSlots.filter(s => !s.isBreak).length;

  return (
    <div className="space-y-3">
      {/* Pick the day to edit. Only that day's list changes below. */}
      <div className="flex items-center gap-1.5 flex-wrap rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-blue-700">Editing day</span>
        {DAYS.map(day => {
          const count = teachingCount(rowsByDay(daySlots)[day] ?? []);
          const isEditing = editDay === day;
          return (
            <button key={day} type="button" onClick={() => setEditDay(day)}
              className={clsx('rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors',
                isEditing
                  ? 'bg-blue-600 text-white'
                  : 'border border-blue-200 bg-white text-blue-700 hover:bg-blue-100')}>
              {DAY_SHORT[day]}{!isEditing && ` · ${count}`}
            </button>
          );
        })}
        <button type="button" onClick={applyToAllDays}
          className="ml-auto rounded-lg border border-blue-300 bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 transition-colors hover:bg-blue-100">
          Copy {DAY_SHORT[editDay]} to all days
        </button>
      </div>

      <p className="text-[11px] text-gray-500">
        {DAY_SHORT[editDay]}: <strong>{editDayCount}</strong> teaching period{editDayCount !== 1 ? 's' : ''} ·{' '}
        ends {timedSlots[timedSlots.length - 1]?.endTime ?? '—'}
      </p>

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
                {/* Every slot is editable here — teaching and breaks alike — and
                    the change applies to this day only. */}
                <div className="flex items-center gap-1">
                  <button onClick={() => patchSlot(slot.id, { duration: Math.max(5, slot.duration - 5) })}
                    className="w-6 h-6 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs font-bold flex items-center justify-center">−</button>
                  <span className="text-xs text-gray-600 w-12 text-center">{slot.duration}m</span>
                  <button onClick={() => patchSlot(slot.id, { duration: Math.min(180, slot.duration + 5) })}
                    className="w-6 h-6 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs font-bold flex items-center justify-center">+</button>
                </div>
                <button onClick={() => removeSlot(slot.id)} disabled={timedSlots.length === 1}
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
  timesByDay,
  periodDuration,
  colorClass,
  onChange,
}: {
  subj: SubjectConfig;
  /** Teaching-period times per day, since days can run different lengths. */
  timesByDay: Record<Day, { start: string; end: string }[]>;
  /** The week's standard period length, used for the minutes → periods maths. */
  periodDuration: number;
  colorClass: string;
  onChange: (s: SubjectConfig) => void;
}) {
  const computedSlots = useMemo(
    () => windowsToSlots(subj.windows, timesByDay),
    [subj.windows, timesByDay]
  );

  // Derived: how many periods this subject needs per week
  const periodsNeeded = Math.max(1, Math.round(subj.minutesPerWeek / periodDuration));
  const maxAvailableMinutes = computedSlots.length * periodDuration;

  const toggleDay = (day: Day) => {
    const exists = subj.windows.some(w => w.day === day);
    if (exists) {
      onChange({ ...subj, windows: subj.windows.filter(w => w.day !== day) });
    } else {
      // Default window: that day's full school span (first period start → last end)
      const dayTimes = timesByDay[day] ?? [];
      const from = dayTimes[0]?.start ?? timesByDay[DAYS[0]]?.[0]?.start ?? '08:00';
      const to   = dayTimes[dayTimes.length - 1]?.end ?? '14:00';
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
                // Which of that day's periods fall in this window? Days can run
                // different-length periods, so this uses the day's own times.
                const matchingPeriods = (timesByDay[win.day] ?? [])
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
  phase, setPhase, daySlots, setDaySlots, subjects, setSubjects, expandedId, setExpandedId,
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
  /** Each day owns its own period list. */
  daySlots: DaySlots;
  setDaySlots: React.Dispatch<React.SetStateAction<DaySlots>>;
  subjects: SubjectConfig[];
  setSubjects: React.Dispatch<React.SetStateAction<SubjectConfig[]>>;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
}) {
  const toast = useToast();

  // Keep a ref to allClasses so handleGenerate can access it without stale closure
  const allClassesRef = { current: allClasses };

  // Step 1's most common length — used for the minutes → periods maths and as
  // the seed for a new period row. Times themselves are per day.
  const standardLength = basePeriodDuration(setup);

  // Give every day one period to start with (first time entering this step).
  useEffect(() => {
    setDaySlots(prev => {
      if (DAYS.some(d => (prev[d] ?? []).length > 0)) return prev;
      const seed = recalcTimes(
        [{ id: uid(), isBreak: false, startTime: '', endTime: '', label: '', duration: standardLength }],
        setup.schoolStart,
      );
      return sameForEveryDay(seed);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timesByDay   = periodTimesByDay(daySlots);
  const rowsForDays  = rowsByDay(daySlots);
  // Slot count can differ per day now, so the scheduler gets a count per day.
  const periodCountByDay = Object.fromEntries(
    DAYS.map(d => [d, teachingCount(rowsForDays[d] ?? [])]),
  ) as Record<Day, number>;
  const daysDiffer   = daySlotsDiffer(daySlots);

  // Init subjects only once when first entering availability phase
  useEffect(() => {
    if (phase !== 'availability') return;
    if (subjects.length > 0) return; // already initialised — don't overwrite
    const initial: SubjectConfig[] = courses.map(c => ({
      instanceId: uid(),
      subjectId: c.id,
      subjectName: c.course,
      minutesPerWeek: standardLength,
      classGroup: 'all' as ClassGroup,
      departments: [] as SeniorDept[],
      windows: [],
    }));
    setSubjects(initial);
    if (initial.length > 0) setExpandedId(initial[0].instanceId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const updateSubject = (updated: SubjectConfig) =>
    setSubjects(s => s.map(x => x.instanceId === updated.instanceId ? updated : x));

  /** Add a second (or third) configuration for the same subject — another
   *  teacher, usually for a different class group. Starts unconfigured so it
   *  can't be scheduled until its own availability is set.
   *
   *  Inserted directly after the row it came from, not appended to the end:
   *  appending put the new (open) panel far below the fold, so the row you were
   *  editing appeared to just collapse with nothing added. */
  const addSubjectInstance = (instanceId: string) => {
    const source = subjects.find(s => s.instanceId === instanceId);
    if (!source) return;
    const next: SubjectConfig = {
      instanceId: uid(),
      subjectId: source.subjectId,
      subjectName: source.subjectName,
      // Same subject, so carry over its weekly load as a starting point.
      minutesPerWeek: source.minutesPerWeek,
      classGroup: 'all',
      departments: [],
      windows: [],
    };
    setSubjects(prev => {
      const at = prev.findIndex(s => s.instanceId === instanceId);
      if (at < 0) return [...prev, next];
      const copy = [...prev];
      copy.splice(at + 1, 0, next);
      return copy;
    });
    setExpandedId(next.instanceId);
  };

  const removeSubjectInstance = (instanceId: string) =>
    setSubjects(s => s.filter(x => x.instanceId !== instanceId));

  const handleGenerate = () => {
    const configured = subjects.filter(s => s.windows.length > 0);
    if (configured.length === 0) return toast.error('Set availability for at least one subject');

    // Each day keeps its own rows; the first day's list doubles as the base
    // written into the main array, which older readers still use.
    const baseRows: PeriodRow[] = rowsForDays[DAYS[0]] ?? [];

    // Resolve available slots from time windows, and compute period count from minutes
    const withSlots = configured.map(s => ({
      ...s,
      availableSlots: windowsToSlots(s.windows, timesByDay),
      // Round to nearest whole period; minimum 1
      periodsCount: Math.max(1, Math.round(s.minutesPerWeek / standardLength)),
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
      const grid = autoFill(applicable, periodCountByDay, seed, teacherBusy);
      byClass[classId] = serialize(baseRows, grid, rowsForDays);
    });

    // For exam type there's only one entry
    if (setup.type === 'exam') {
      const grid = autoFill(withSlots, periodCountByDay, 42);
      byClass['exam'] = serialize(baseRows, grid, rowsForDays);
    }

    onGenerate({ rows: baseRows, byClass });
  };

  /* ── Phase A: structure ── */
  if (phase === 'structure') {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            <Clock size={12} /> Starts {setup.schoolStart} ·{' '}
            {daysDiffer ? 'days differ — see each day' : `${standardLength} min periods`}
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

        <DayStructureEditor setup={setup} daySlots={daySlots} setDaySlots={setDaySlots} />

        <div className="flex gap-3 pt-2">
          <button onClick={onBack}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <ArrowLeft size={15} /> Back
          </button>
          <button onClick={() => {
            if (DAYS.some(d => (periodCountByDay[d] ?? 0) === 0)) {
              return toast.error('Every day needs at least one teaching period');
            }
            setPhase('availability');
          }} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-colors">
            Set Teacher Availability →
          </button>
        </div>
      </div>
    );
  }

  /* ── Phase B: availability ── */
  const readyCount = subjects.filter(s => windowsToSlots(s.windows, timesByDay).length > 0).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
          <Clock size={12} /> {DAYS.map(d => periodCountByDay[d]).join('/')} periods · starts {setup.schoolStart}
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
          If the same subject is taught by more than one teacher, press <strong>+</strong> on that subject
          to add another assignment and give each one its own class group and availability.
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
            const isOpen = expandedId === subj.instanceId;
            const slots2 = windowsToSlots(subj.windows, timesByDay);
            const isReady = slots2.length > 0;
            const colorClass = PERIOD_COLORS[si % PERIOD_COLORS.length];
            // How many configurations this subject has, so duplicates are
            // distinguishable and the last one can't be removed.
            const siblings = subjects.filter(x => x.subjectId === subj.subjectId);
            const copyIndex = siblings.indexOf(subj) + 1;
            return (
              <div key={subj.instanceId} className={clsx(
                'rounded-2xl border overflow-hidden transition-all',
                isReady ? 'border-green-200' : 'border-gray-200'
              )}>
                <div className={clsx('flex items-center gap-1 pr-2 transition-colors',
                  isOpen ? 'bg-gray-50' : 'bg-white')}>
                  <button
                    className={clsx('flex-1 min-w-0 flex items-center justify-between gap-2 px-4 py-3 text-left transition-colors',
                      !isOpen && 'hover:bg-gray-50/50')}
                    onClick={() => setExpandedId(isOpen ? null : subj.instanceId)}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white text-xs font-bold', colorClass)}>
                        {subj.subjectName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {subj.subjectName}
                          {siblings.length > 1 && (
                            <span className="ml-2 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
                              #{copyIndex}
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {isReady
                            ? `${subj.minutesPerWeek} min/week · ${Math.max(1, Math.round(subj.minutesPerWeek / standardLength))} period${Math.max(1, Math.round(subj.minutesPerWeek / standardLength)) !== 1 ? 's' : ''} · ${subj.windows.length} day${subj.windows.length !== 1 ? 's' : ''}`
                            : 'No availability set'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
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

                  {/* Per-row actions, kept outside the expand button */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button"
                      onClick={() => addSubjectInstance(subj.instanceId)}
                      aria-label={`Add another teacher for ${subj.subjectName}`}
                      title="Add another teacher for this subject, with its own availability"
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-400 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600">
                      <Plus size={13} />
                    </button>
                    {siblings.length > 1 && (
                      <button type="button"
                        onClick={() => removeSubjectInstance(subj.instanceId)}
                        title="Remove this configuration"
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="px-4 py-4 border-t border-gray-100">
                    <SubjectAvailabilityEditor
                      subj={subj}
                      timesByDay={timesByDay}
                      periodDuration={standardLength}
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
            <span><span className="font-semibold text-green-600">{readyCount}</span>/{subjects.length} configured</span>
            {subjects.length > new Set(subjects.map(s => s.subjectId)).size && (
              <span className="text-gray-400">
                · {new Set(subjects.map(s => s.subjectId)).size} subject{new Set(subjects.map(s => s.subjectId)).size !== 1 ? 's' : ''} taught by {subjects.length} teacher assignment{subjects.length !== 1 ? 's' : ''}
              </span>
            )}
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
function AutoSchedulerWizard({ onClose, onSaved, allClasses, initialClassRoomIds = [], existingTimetableIds = {}, initialDraft = null }: {
  onClose: () => void;
  onSaved: () => void;
  allClasses: { id: string; name: string }[];
  initialClassRoomIds?: string[];
  existingTimetableIds?: Record<string, string>;
  initialDraft?: SchedulerDraft | null;
}) {
  const toast = useToast();
  const [step, setStep]          = useState<'setup' | 'schedule' | 'preview'>(initialDraft ? 'schedule' : 'setup');
  const [setup, setSetup]        = useState<SetupData | null>(initialDraft?.setup ?? null);
  const [allCourses, setCourses] = useState<{ id: string; course: string }[]>([]);
  const [loadingMeta, setMeta]   = useState(true);
  const [generated, setGenerated]= useState<GeneratedResult | null>(null);
  const [previewClass, setPreview]= useState<string>('');
  const [previewEditing, setPreviewEditing] = useState(false);
  const [saving, setSaving]      = useState(false);

  // ── Persistent schedule state (survives Back navigation) ──────────────
  const [schedPhase, setSchedPhase]   = useState<'structure' | 'availability'>(initialDraft ? 'availability' : 'structure');
  const [daySlots, setDaySlots]       = useState<DaySlots>(initialDraft?.daySlots ?? sameForEveryDay([]));
  const [subjects, setSubjects]       = useState<SubjectConfig[]>(initialDraft?.subjects ?? []);
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

  useEffect(() => { setPreviewEditing(false); }, [previewClass]);

  const handleSave = async () => {
    if (!generated || !setup) return;
    setSaving(true);
    try {
      if (setup.type === 'class') {
        // Fire one POST per class in parallel
        await Promise.all(
          setup.classRoomIds.map(classRoomId =>
            api.post(endpoints.staff.classTimetable, {
              id: existingTimetableIds[classRoomId],
              classRoomId,
              content: generated.byClass[classRoomId],
            })
          )
        );
        toast.success(`${setup.classRoomIds.length} timetable${setup.classRoomIds.length !== 1 ? 's' : ''} saved`);
      } else {
        await api.post(endpoints.staff.examTimetable, { level: setup.level, content: generated.byClass['exam'] });
        toast.success('Exam timetable saved');
      }
      const schedulerDraft = { setup, daySlots, subjects };
      // The scheduler-config route only exists under /staff, so admin keeps the
      // draft locally and skips the server copy.
      saveSchedulerDraft(schedulerDraft, readSelectedSchool()?.id);
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
            initialClassRoomIds={initialClassRoomIds}
            onNext={d => {
              // If setup changed (different classes/duration), reset schedule state
              const setupChanged = !setup
                || JSON.stringify(setup.dayDurations) !== JSON.stringify(d.dayDurations)
                || setup.schoolStart !== d.schoolStart
                || JSON.stringify(setup.classRoomIds) !== JSON.stringify(d.classRoomIds);
              if (setupChanged) {
                setDaySlots(sameForEveryDay([])); // reinitialised in StepBuildSchedule
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
            daySlots={daySlots}
            setDaySlots={setDaySlots}
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
                  <p className="text-[10px] text-gray-400 mt-0.5">Periods down the side · Days across the top · Every class in each cell</p>
                </div>
                <div className="p-4">
                  <CombinedTimetableGrid
                    entries={setup.classRoomIds.map(id => ({ id, label: className(id), content: generated.byClass[id] ?? '' }))}
                    courses={allCourses}
                    onSaveDrafts={async contentById => {
                      setGenerated(current => current
                        ? { ...current, byClass: { ...current.byClass, ...contentById } }
                        : current);
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Preview</span>
                  <div className="flex items-center gap-3">
                    {setup.type === 'class' && <span className="text-xs text-gray-400">{className(previewClass)}</span>}
                    <button
                      onClick={() => setPreviewEditing(value => !value)}
                      className={clsx('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors', previewEditing ? 'bg-blue-100 text-blue-700' : 'bg-blue-600 text-white hover:bg-blue-700')}>
                      <Pencil size={13} /> {previewEditing ? 'Close editor' : 'Edit timetable'}
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  {previewEditing ? (
                    <TimetableEditor
                      content={generated.byClass[previewClass] ?? generated.byClass['exam'] ?? ''}
                      courses={allCourses}
                      saving={false}
                      onCancel={() => setPreviewEditing(false)}
                      onSave={content => {
                        const key = setup.type === 'class' ? previewClass : 'exam';
                        setGenerated(current => current ? { ...current, byClass: { ...current.byClass, [key]: content } } : current);
                        setPreviewEditing(false);
                      }}
                    />
                  ) : <TimetableGrid content={generated.byClass[previewClass] ?? generated.byClass['exam'] ?? ''} />}
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
    // 'all' loads the same class endpoint — shows all classes together.
    // Admin reads the read-only overview routes; writes stay on the staff
    // routes, which is what this page has always used.
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
  const [regeneratingClassRoomIds, setRegeneratingClassRoomIds] = useState<string[]>([]);
  const [existingTimetableIds, setExistingTimetableIds] = useState<Record<string, string>>({});
  const [schedulerDraft, setSchedulerDraft] = useState<SchedulerDraft | null>(null);
  const [selectedClassTimetableId, setSelectedClassTimetableId] = useState('');
  const [editingClassTimetableId, setEditingClassTimetableId] = useState<string | null>(null);
  const [allClasses, setClasses]  = useState<{ id: string; name: string }[]>([]);
  const [allCourses, setCourses]  = useState<{ id: string; course: string }[]>([]);
  const { data, loading, reload } = useTimetableList(tab);
  const toast = useToast();
  const { school } = useSelectedSchool();
  const classTimetables = data as AdminClassTimetable[];
  const examTimetables  = data as AdminExamTimetable[];

  // ── Bulk selection (Class Timetables tab) ────────────────────────────────
  const [selectedIds, setSelectedIds]             = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting]           = useState(false);

  // Only ever act on ids still in the list, so a selection left behind by a card
  // deleted on its own can't be sent to the API.
  const selectedVisible = useMemo(
    () => classTimetables.filter(t => selectedIds.has(t.id)).map(t => t.id),
    [classTimetables, selectedIds]
  );
  const selectedCount = selectedVisible.length;
  const allSelected   = classTimetables.length > 0 && selectedCount === classTimetables.length;
  const someSelected  = selectedCount > 0 && !allSelected;

  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleSelectAll = () =>
    setSelectedIds(allSelected ? new Set() : new Set(classTimetables.map(t => t.id)));

  const handleBulkDelete = async () => {
    const ids = selectedVisible;
    if (ids.length === 0) return;
    setBulkDeleting(true);
    const failed: string[] = [];
    let deleted = 0;
    for (const id of ids) {
      // No bulk endpoint exists, so delete one at a time and keep going if one
      // fails — a single bad row shouldn't block the rest.
      try {
        await api.delete(`${endpoints.staff.classTimetable}/${id}`);
        deleted++;
      } catch {
        failed.push(id);
      }
    }
    setBulkDeleting(false);
    setConfirmBulkDelete(false);
    // Leave only the failures selected so a retry is one click away.
    setSelectedIds(new Set(failed));

    if (failed.length === 0) {
      toast.success(`${deleted} timetable${deleted !== 1 ? 's' : ''} deleted`);
    } else if (deleted === 0) {
      toast.error('Failed to delete the selected timetables');
    } else {
      toast.error(`${deleted} deleted, ${failed.length} failed — still selected`);
    }
    reload();
  };

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
          <button onClick={() => {
            setRegeneratingClassRoomIds([]);
            setExistingTimetableIds({});
            setSchedulerDraft(null);
            setShowWizard(true);
          }}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-colors">
            <Sparkles size={16} /> Auto-Generate Timetable
          </button>
        )}
      </div>

      {showWizard && (
        <AutoSchedulerWizard
          allClasses={allClasses}
          initialClassRoomIds={regeneratingClassRoomIds}
          existingTimetableIds={existingTimetableIds}
          initialDraft={schedulerDraft}
          onClose={() => { setShowWizard(false); setRegeneratingClassRoomIds([]); setExistingTimetableIds({}); setSchedulerDraft(null); }}
          onSaved={() => { setShowWizard(false); setRegeneratingClassRoomIds([]); setExistingTimetableIds({}); setSchedulerDraft(null); reload(); }}
        />
      )}

      <div className="flex bg-gray-100 rounded-xl p-1 w-fit">
        {(['all', 'class', 'exam'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setSelectedIds(new Set()); setConfirmBulkDelete(false); }}
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
                  {classTimetables.length} class{classTimetables.length !== 1 ? 'es' : ''} · the full week at a glance — no day switching
                </p>
              </div>
              <div className="p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <p className="text-xs text-amber-800">Changed a subject's availability? Regenerate the existing schedules without creating new timetable records.</p>
                  <button
                    onClick={async () => {
                      setRegeneratingClassRoomIds(classTimetables.map(t => t.classRoomId));
                      setExistingTimetableIds(Object.fromEntries(classTimetables.map(t => [t.classRoomId, t.id])));
                      // No admin scheduler-config route — restore the local draft.
                      setSchedulerDraft(readSchedulerDraft(school?.id));
                      setShowWizard(true);
                    }}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-100">
                    <Sparkles size={13} /> Regenerate existing timetables
                  </button>
                </div>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <select
                    value={selectedClassTimetableId || classTimetables[0]?.id || ''}
                    onChange={event => setSelectedClassTimetableId(event.target.value)}
                    aria-label="Choose a class timetable to edit"
                    className="h-9 max-w-44 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 outline-none focus:border-blue-400">
                    {classTimetables.map(t => <option key={t.id} value={t.id}>{t.classRoom}</option>)}
                  </select>
                  <button
                    onClick={() => {
                      const id = selectedClassTimetableId || classTimetables[0]?.id;
                      if (!id) return;
                      setEditingClassTimetableId(id);
                      setTab('class');
                    }}
                    className="flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700">
                    <Pencil size={13} /> Edit timetable
                  </button>
                </div>
                <CombinedTimetableGrid
                  entries={classTimetables.map(t => ({ id: t.id, classRoomId: t.classRoomId, label: t.classRoom, content: t.content }))}
                  exportTitle={school?.name ?? 'School Timetable'}
                  courses={allCourses}
                  onSaved={reload}
                />
              </div>
            </div>
      ) : tab === 'class' ? (
        classTimetables.length === 0
          ? <div className="bg-white rounded-2xl border border-gray-100 p-12"><EmptyState icon={Calendar} message="No class timetables yet. Use Auto-Generate to create one." card={false} /></div>
          : <div className="space-y-4">
              {/* Bulk selection bar */}
              <div className="flex items-center justify-between gap-3 flex-wrap rounded-2xl border border-gray-100 bg-white px-5 py-3 shadow-sm">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleSelectAll}
                    aria-label="Select all class timetables"
                    className="w-4 h-4 rounded cursor-pointer accent-blue-600"
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    {selectedCount > 0
                      ? `${selectedCount} of ${classTimetables.length} selected`
                      : 'Select all'}
                  </span>
                </label>

                {selectedCount > 0 && (
                  confirmBulkDelete ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-red-600">
                        Delete {selectedCount} timetable{selectedCount !== 1 ? 's' : ''} permanently?
                      </span>
                      <button onClick={handleBulkDelete} disabled={bulkDeleting}
                        className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60">
                        <Trash2 size={13} />
                        {bulkDeleting ? 'Deleting…' : `Yes, delete ${selectedCount}`}
                      </button>
                      <button onClick={() => setConfirmBulkDelete(false)} disabled={bulkDeleting}
                        className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmBulkDelete(true)}
                      className="flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-600">
                      <Trash2 size={13} /> Delete selected ({selectedCount})
                    </button>
                  )
                )}
              </div>

              <div className="space-y-4">{classTimetables.map(t => (
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
                selected={selectedIds.has(t.id)}
                onToggleSelect={toggleSelect}
                startInEditMode={editingClassTimetableId === t.id}
                onDeleted={() => { setEditingClassTimetableId(null); reload(); }}
                onUpdated={() => { setEditingClassTimetableId(null); reload(); }}
              />
            ))}</div>
            </div>
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
