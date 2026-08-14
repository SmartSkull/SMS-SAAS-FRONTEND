'use client';
import { useState } from 'react';
import { useTimetable } from '@/hooks/student';
import { Calendar, Clock } from 'lucide-react';
import { EmptyState } from '@/components/ui/StateDisplay';
import clsx from 'clsx';

/* ── Types ───────────────────────────────────────────────────────────────── */
type PeriodRow = { startTime: string; endTime: string; label: string; isBreak: boolean };

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const DAY_COLORS: Record<string, string> = {
  Monday:    'bg-blue-50 border-blue-200 text-blue-700',
  Tuesday:   'bg-indigo-50 border-indigo-200 text-indigo-700',
  Wednesday: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  Thursday:  'bg-amber-50 border-amber-200 text-amber-700',
  Friday:    'bg-purple-50 border-purple-200 text-purple-700',
};

const PERIOD_COLORS = [
  'bg-blue-500', 'bg-sky-500', 'bg-indigo-500', 'bg-violet-500',
  'bg-fuchsia-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-orange-500',
];

/* ── Content parser (matches staff page format) ──────────────────────────── */
function deserialize(content: string): { rows: PeriodRow[]; grid: Record<string, string[]> } {
  const emptyGrid = () => Object.fromEntries(DAYS.map(d => [d, [] as string[]]));
  if (!content) return { rows: [], grid: emptyGrid() };

  // New format: PERIODS2:[json]\nMonday:sub1,sub2\n...
  if (content.startsWith('PERIODS2:')) {
    const nl = content.indexOf('\n');
    const jsonStr = content.slice('PERIODS2:'.length, nl > 0 ? nl : undefined);
    const rest    = nl > 0 ? content.slice(nl + 1) : '';
    let rows: PeriodRow[] = [];
    try {
      rows = JSON.parse(jsonStr).map((r: any) => ({
        startTime: r.s, endTime: r.e, label: r.l, isBreak: r.b,
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
  const rows: PeriodRow[] = legacyTimes.map(t => ({ startTime: t, endTime: '', label: '', isBreak: false }));
  return { rows, grid };
}

/* ── Timetable grid component ────────────────────────────────────────────── */
function TimetableGrid({ content }: { content: string }) {
  const { rows, grid } = deserialize(content);
  const subjectSlots = rows.filter(r => !r.isBreak);

  // No period metadata — fall back to simple day list view
  if (rows.length === 0) {
    return (
      <div className="space-y-3">
        {DAYS.map(day => {
          const subs = (grid[day] || []).filter(Boolean);
          if (subs.length === 0) return null;
          return (
            <div key={day} className={clsx('flex gap-4 p-3 rounded-xl border', DAY_COLORS[day])}>
              <span className="text-xs font-bold w-28 shrink-0 pt-0.5">{day}</span>
              <div className="flex flex-wrap gap-2">
                {subs.map((s, j) => (
                  <span key={j} className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 shadow-sm">{s}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="w-36 p-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">Period</th>
            {DAYS.map(d => (
              <th key={d} className="p-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 text-center">{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => {
            if (row.isBreak) {
              return (
                <tr key={rowIdx} className="bg-amber-50/70">
                  <td className="p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                      <span>☕</span> {row.startTime}{row.endTime ? `–${row.endTime}` : ''}
                    </div>
                  </td>
                  <td colSpan={5} className="p-3 text-center text-xs font-medium text-amber-600 tracking-wide">
                    {row.label || 'Break / Activity'}
                  </td>
                </tr>
              );
            }

            const slotIdx = subjectSlots.findIndex(s => s === row);
            return (
              <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-gray-50/40' : 'bg-white'}>
                <td className="p-3">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                      <Clock size={11} className="text-gray-400" />
                      {row.startTime}{row.endTime ? `–${row.endTime}` : ''}
                    </div>
                    {row.label && <span className="text-[10px] text-gray-400 pl-4">{row.label}</span>}
                  </div>
                </td>
                {DAYS.map(day => {
                  const subject = grid[day]?.[slotIdx];
                  return (
                    <td key={day} className="p-2">
                      {subject ? (
                        <div className={clsx(
                          'rounded-xl px-3 py-2 text-white text-xs font-bold text-center shadow-sm',
                          PERIOD_COLORS[slotIdx % PERIOD_COLORS.length]
                        )}>
                          {subject}
                        </div>
                      ) : (
                        <div className="rounded-xl border-2 border-dashed border-gray-100 min-h-[40px]" />
                      )}
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

/* ── Skeleton loader ─────────────────────────────────────────────────────── */
function TimetableSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {/* Header row: period column + 5 day columns */}
      <div className="flex gap-3 pb-2 border-b border-gray-100">
        <div className="w-36 h-4 rounded-lg bg-gray-200 shrink-0" />
        {DAYS.map(d => (
          <div key={d} className="flex-1 h-4 rounded-lg bg-gray-200" />
        ))}
      </div>

      {/* 6 period rows */}
      {Array.from({ length: 6 }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-3 items-center">
          {/* Time / period label */}
          <div className="w-36 shrink-0 space-y-1.5">
            <div className="h-3 w-24 rounded-md bg-gray-200" />
            <div className="h-2.5 w-16 rounded-md bg-gray-100" />
          </div>
          {/* Subject cells */}
          {DAYS.map((d, colIdx) => (
            <div
              key={d}
              className={clsx(
                'flex-1 h-10 rounded-xl',
                // vary shade to give a subtle staggered shimmer feel
                (rowIdx + colIdx) % 3 === 0 ? 'bg-gray-200' :
                (rowIdx + colIdx) % 3 === 1 ? 'bg-gray-150' : 'bg-gray-100'
              )}
            />
          ))}
        </div>
      ))}

      {/* Break row hint */}
      <div className="flex gap-3 items-center pt-1">
        <div className="w-36 shrink-0 h-8 rounded-xl bg-amber-100" />
        <div className="flex-1 h-8 rounded-xl bg-amber-50" />
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function StudentTimetable() {
  const [tab, setTab] = useState<'class' | 'exam'>('class');
  const { data, loading } = useTimetable(tab);

  const classContent: string | null = (data as any)?.content ?? (data as any)?.timetable ?? null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Timetable</h1>

      <div className="flex bg-gray-100 rounded-xl p-1 w-fit">
        {(['class', 'exam'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={clsx('px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize',
              tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
            {t} Timetable
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {loading ? (
          <TimetableSkeleton />
        ) : tab === 'class' ? (
          !classContent ? (
            <EmptyState icon={Calendar} message="No class timetable available." card={false} />
          ) : (
            <TimetableGrid content={classContent} />
          )
        ) : (
          !data || (Array.isArray(data) && data.length === 0) ? (
            <EmptyState icon={Calendar} message="No exam timetable available." card={false} />
          ) : (
            <div className="space-y-6">
              {(Array.isArray(data) ? data : [data]).map((t: any) => (
                <div key={t.id}>
                  <p className="text-xs font-bold text-purple-600 uppercase mb-3 flex items-center gap-2">
                    <Calendar size={13} /> {t.level} Level
                  </p>
                  <TimetableGrid content={t.content ?? t.timetable ?? ''} />
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
