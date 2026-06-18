'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { CalendarDays, Download, FileText, UserRound, X, Search, CheckCircle2, Clock, AlertCircle, Paperclip, Send } from 'lucide-react';
import { useAssignments } from '@/hooks/student';
import { EmptyState } from '@/components/ui/StateDisplay';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import type { Assignment } from '@/types';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
function fileHref(path?: string) {
  if (!path) return '#';
  if (path.startsWith('http')) return path;
  return path.startsWith('/api') ? path : `/api/uploads/${path.replace(/^\/?(uploads\/)?/, '')}`;
}
const title   = (a: Assignment) => a.title || a.subject || a.course || 'Assignment';
const body    = (a: Assignment) => a.assignment || a.description || a.content || '';
const file    = (a: Assignment) => a.file_url || a.file;
const due     = (a: Assignment) => a.due_date || a.deadline || a.dueAt;
const teacher = (a: Assignment) => [a.firstname, a.lastname].filter(Boolean).join(' ') || 'Teacher';

function dueStatus(dateStr?: string): 'overdue' | 'soon' | 'upcoming' | 'none' {
  if (!dateStr) return 'none';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'none';
  const diff = (d.getTime() - Date.now()) / 86400000;
  if (diff < 0) return 'overdue';
  if (diff <= 3) return 'soon';
  return 'upcoming';
}
function daysLabel(dateStr?: string) {
  if (!dateStr) return 'No due date';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'No due date';
  const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  return `${diff} days left`;
}
function formatDate(date?: string) {
  if (!date) return 'No due date';
  const d = new Date(date);
  return isNaN(d.getTime()) ? 'No due date' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function downloadFile(a: Assignment) {
  const f = file(a);
  if (!f) return;
  const href = fileHref(f);
  try {
    const res = await fetch(href);
    if (!res.ok) throw new Error();
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const ext = new URL(href, window.location.href).pathname.split('.').pop();
    link.href = url; link.download = `${title(a).replace(/[^\w.-]+/g, '-')}${ext && ext.length <= 5 ? `.${ext}` : ''}`;
    document.body.appendChild(link); link.click(); link.remove();
    URL.revokeObjectURL(url);
  } catch { window.open(href, '_blank'); }
}

const STATUS_STYLES = {
  overdue:  { bar: 'border-l-4 border-red-400',   badge: 'bg-red-100 text-red-600',     icon: AlertCircle,  label: 'Overdue' },
  soon:     { bar: 'border-l-4 border-amber-400',  badge: 'bg-amber-100 text-amber-600', icon: Clock,        label: 'Due Soon' },
  upcoming: { bar: 'border-l-4 border-blue-400',   badge: 'bg-blue-100 text-blue-600',   icon: CalendarDays, label: 'Upcoming' },
  none:     { bar: 'border-l-4 border-gray-200',   badge: 'bg-gray-100 text-gray-500',   icon: CalendarDays, label: 'No date' },
};

/* ─── submit form ─────────────────────────────────────────────────────────── */
function SubmitForm({ assignmentId, existing, onSubmitted }: {
  assignmentId: number;
  existing?: { submittedAt: string; note?: string; fileUrl?: string } | null;
  onSubmitted: () => void;
}) {
  const toast = useToast();
  const [note, setNote]     = useState(existing?.note ?? '');
  const [file, setFile]     = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submitted = !!existing;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      if (note) fd.append('note', note);
      if (file) fd.append('file', file);
      await api.upload<any>(endpoints.student.assignmentSubmit(assignmentId), fd);
      toast.success('Assignment submitted!');
      onSubmitted();
    } catch (err: any) {
      toast.error(err?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`rounded-xl border-2 p-4 ${submitted ? 'border-green-200 bg-green-50' : 'border-blue-100 bg-blue-50/50'}`}>
      {submitted && (
        <div className="flex items-center gap-2 mb-3 text-green-700">
          <CheckCircle2 size={16} />
          <span className="text-sm font-semibold">Submitted on {formatDate(existing.submittedAt)}</span>
        </div>
      )}
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">{submitted ? 'Resubmit with a note' : 'Note (optional)'}</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Add a note to your teacher…"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-400" />
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors">
            <Paperclip size={13} />
            {file ? file.name.slice(0, 20) + '…' : 'Attach file'}
          </button>
          <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          {existing?.fileUrl && !file && (
            <a href={existing.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 underline">View submitted file</a>
          )}
        </div>
        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all">
          <Send size={14} />
          {loading ? 'Submitting…' : submitted ? 'Resubmit' : 'Submit Assignment'}
        </button>
      </form>
    </div>
  );
}

/* ─── modal ───────────────────────────────────────────────────────────────── */
function Modal({ a, onClose, onSubmitted }: { a: Assignment; onClose: () => void; onSubmitted: () => void }) {
  const status = dueStatus(due(a));
  const s = STATUS_STYLES[status];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title(a)}</h2>
            <p className="mt-1 text-sm text-gray-500">{a.course || a.subject || 'Subject'}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><X size={20} /></button>
        </div>

        <div className="space-y-5 p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
              <CalendarDays size={18} className="text-amber-600 shrink-0" />
              <div><p className="text-xs font-medium text-gray-500">Due date</p><p className="text-sm font-semibold text-gray-900">{formatDate(due(a))}</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
              <UserRound size={18} className="text-blue-600 shrink-0" />
              <div><p className="text-xs font-medium text-gray-500">Teacher</p><p className="text-sm font-semibold text-gray-900">{teacher(a)}</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
              <s.icon size={18} className="shrink-0 text-gray-500" />
              <div><p className="text-xs font-medium text-gray-500">Status</p><p className="text-sm font-semibold text-gray-900">{daysLabel(due(a))}</p></div>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900 mb-2">Assignment</p>
            <p className="whitespace-pre-wrap rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm leading-6 text-gray-700">
              {body(a) || 'No details provided.'}
            </p>
          </div>

          <SubmitForm assignmentId={a.id} existing={a.submission} onSubmitted={onSubmitted} />
        </div>

        {file(a) && (
          <div className="flex justify-end border-t border-gray-100 p-6 pt-4">
            <button onClick={() => downloadFile(a)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <Download size={16} /> Download assignment file
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── page ────────────────────────────────────────────────────────────────── */
type FilterType = 'all' | 'overdue' | 'soon' | 'upcoming' | 'submitted';

export default function StudentAssignments() {
  const { items, loading, refresh } = useAssignments();
  const [selected, setSelected] = useState<Assignment | null>(null);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState<FilterType>('all');

  const counts = useMemo(() => ({
    overdue:   items.filter(a => dueStatus(due(a)) === 'overdue'  && !a.submission).length,
    soon:      items.filter(a => dueStatus(due(a)) === 'soon'     && !a.submission).length,
    upcoming:  items.filter(a => dueStatus(due(a)) === 'upcoming' && !a.submission).length,
    submitted: items.filter(a => !!a.submission).length,
  }), [items]);

  const filtered = useMemo(() => items.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || title(a).toLowerCase().includes(q) || (a.course || a.subject || '').toLowerCase().includes(q);
    const status = dueStatus(due(a));
    const isSubmitted = !!a.submission;
    const matchFilter =
      filter === 'all'       ? true :
      filter === 'submitted' ? isSubmitted :
      filter === 'overdue'   ? status === 'overdue'  && !isSubmitted :
      filter === 'soon'      ? status === 'soon'     && !isSubmitted :
      filter === 'upcoming'  ? status === 'upcoming' && !isSubmitted : true;
    return matchSearch && matchFilter;
  }), [items, search, filter]);

  const FILTERS: { key: FilterType; label: string; count: number; color: string }[] = [
    { key: 'all',       label: 'All',       count: items.length,   color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
    { key: 'overdue',   label: 'Overdue',   count: counts.overdue,  color: 'bg-red-100 text-red-700 hover:bg-red-200' },
    { key: 'soon',      label: 'Due Soon',  count: counts.soon,     color: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
    { key: 'upcoming',  label: 'Upcoming',  count: counts.upcoming,  color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
    { key: 'submitted', label: 'Submitted', count: counts.submitted, color: 'bg-green-100 text-green-700 hover:bg-green-200' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
        <span className="text-xs text-gray-400">{items.length} total</span>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or subject…"
          className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all
              ${filter === f.key ? f.color + ' ring-2 ring-offset-1 ring-current' : f.color}`}>
            {f.label}
            <span className="rounded-full bg-white/60 px-1.5 py-0.5 font-bold text-[10px]">{f.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-200" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} message="No assignments match your filter." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map(a => {
            const status = dueStatus(due(a));
            const isSubmitted = !!a.submission;
            const s = STATUS_STYLES[status];
            return (
              <button key={a.id} type="button" onClick={() => setSelected(a)}
                className={`card w-full rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${s.bar} ${isSubmitted ? 'opacity-70' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isSubmitted ? 'bg-green-100' : 'bg-blue-100'}`}>
                    {isSubmitted ? <CheckCircle2 size={18} className="text-green-600" /> : <FileText size={18} className="text-blue-600" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate font-semibold text-gray-900">{title(a)}</h3>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${isSubmitted ? 'bg-green-100 text-green-600' : s.badge}`}>
                        {isSubmitted ? 'Submitted' : s.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">{a.course || a.subject || 'Subject'}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-gray-400">{body(a)}</p>
                    <p className={`mt-2 text-xs font-semibold ${status === 'overdue' && !isSubmitted ? 'text-red-500' : status === 'soon' && !isSubmitted ? 'text-amber-500' : 'text-gray-400'}`}>
                      {daysLabel(due(a))}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <Modal
          a={selected}
          onClose={() => setSelected(null)}
          onSubmitted={() => { refresh?.(); setSelected(null); }}
        />
      )}
    </div>
  );
}
