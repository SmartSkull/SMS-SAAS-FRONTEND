'use client';
import { useEffect, useState } from 'react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import type { ApiResponse } from '@/types';
import { Calendar } from 'lucide-react';
import { EmptyState } from '@/components/ui/StateDisplay';
import clsx from 'clsx';

function TimetableGrid({ data }: { data: any }) {
  const rows = (data?.timetable as string)?.split('|') ?? [];
  return (
    <div className="space-y-3">
      {rows.map((day, i) => {
        const colonIdx = day.indexOf(':');
        const label = day.slice(0, colonIdx).trim();
        const subjects = day.slice(colonIdx + 1).split(',');
        return (
          <div key={i} className="flex gap-4 p-3 rounded-xl bg-gray-50">
            <span className="text-xs font-bold text-blue-700 w-28 shrink-0 pt-0.5">{label}</span>
            <div className="flex flex-wrap gap-2">
              {subjects.map((s, j) => (
                <span key={j} className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 shadow-sm">{s.trim()}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function StudentTimetable() {
  const [tab, setTab] = useState<'class' | 'exam'>('class');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const ep = tab === 'class' ? endpoints.student.classTimetable : endpoints.student.examTimetable;
    setLoading(true);
    api.get<ApiResponse<any>>(ep)
      .then((r) => setData(r.data))
      .catch(() => toast.error('Failed to load timetable'))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Timetable</h1>
      <div className="flex bg-gray-100 rounded-xl p-1 w-fit">
        {(['class', 'exam'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={clsx('px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize',
              tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
            {t} Timetable
          </button>
        ))}
      </div>
      <div className="bg-white rounded-2xl card shadow-sm border border-gray-100 p-6">
        {loading ? (
          <div className="text-center text-gray-400 py-8">Loading…</div>
        ) : !data || (Array.isArray(data) && data.length === 0) ? (
          <EmptyState icon={Calendar} message="No timetable available." card={false} />
        ) : tab === 'class' ? (
          <TimetableGrid data={data} />
        ) : (
          <TimetableGrid data={data} />
        )}
      </div>
    </div>
  );
}
