'use client';
import { useState, useRef } from 'react';
import { Plus, FileText, Calendar, Clock, CheckCircle, XCircle, AlertCircle, Upload, X, CalendarDays, ChevronRight, Briefcase } from 'lucide-react';
import { useMyLeaves, useLeaveBalance, useRequestLeave } from '@/hooks/leave';
import { Skeleton } from '@/components/ui/Skeleton';
import type { LeaveStatus, LeaveType } from '@/types';

const STATUS_STYLE: Record<LeaveStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  APPROVED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  REJECTED: 'bg-red-50 text-red-700 ring-red-600/20',
};

const STATUS_ICON: Record<LeaveStatus, React.ReactNode> = {
  PENDING: <Clock className="w-3 h-3" />,
  APPROVED: <CheckCircle className="w-3 h-3" />,
  REJECTED: <XCircle className="w-3 h-3" />,
};

const TYPE_EMOJI: Record<LeaveType, string> = {
  ANNUAL: '🏖️',
  SICK: '🤒',
  MATERNITY: '🤱',
  PATERNITY: '👶',
  UNPAID: '💸',
  OTHER: '📌',
};

const LEAVE_TYPES: LeaveType[] = ['ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER'];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function StaffLeavePage() {
  const { leaves, loading, reload } = useMyLeaves();
  const { balance, loading: balLoading } = useLeaveBalance();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'ANNUAL' as LeaveType, startDate: '', endDate: '', reason: '' });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { submit, loading: submitting, error, success } = useRequestLeave(() => {
    setShowForm(false);
    setForm({ type: 'ANNUAL', startDate: '', endDate: '', reason: '' });
    setProofFile(null);
    reload();
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('type', form.type);
    fd.append('startDate', form.startDate);
    fd.append('endDate', form.endDate);
    fd.append('reason', form.reason);
    if (proofFile) fd.append('proofFile', proofFile);
    submit(fd);
  };

  const days = form.startDate && form.endDate
    ? Math.max(0, Math.ceil((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000) + 1)
    : 0;

  const pendingCount = leaves.filter((l) => l.status === 'PENDING').length;
  const approvedCount = leaves.filter((l) => l.status === 'APPROVED').length;
  const rejectedCount = leaves.filter((l) => l.status === 'REJECTED').length;
  const totalEntitled = balance.reduce((s, b) => s + b.entitled, 0);
  const totalUsed = balance.reduce((s, b) => s + b.used, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="mt-1 text-sm text-gray-500">Request time off and track the status of every application</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Request Leave
        </button>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Pending', value: pendingCount, cls: 'bg-amber-50 text-amber-600', icon: Clock },
          { label: 'Approved', value: approvedCount, cls: 'bg-emerald-50 text-emerald-600', icon: CheckCircle },
          { label: 'Rejected', value: rejectedCount, cls: 'bg-red-50 text-red-600', icon: XCircle },
          { label: 'Days Used', value: totalUsed, cls: 'bg-blue-50 text-blue-600', icon: CalendarDays },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${s.cls}`}>
              <s.icon size={18} />
            </span>
            <div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs font-medium text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Balance cards */}
      <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <CalendarDays size={16} className="text-blue-500" /> Leave Balance
            </h2>
            <p className="text-xs text-gray-400">{new Date().getFullYear()} · {totalEntitled} days entitled · {totalUsed} used</p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">{totalEntitled - totalUsed} days left</span>
        </div>
        {balLoading ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : balance.length === 0 ? (
          <p className="mt-6 text-center text-sm text-gray-400">No leave balance configured yet.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {balance.map((b) => {
              const pct = b.entitled ? Math.min(100, Math.round((b.used / b.entitled) * 100)) : 0;
              return (
                <div key={b.type} className="flex flex-col items-center rounded-2xl border border-gray-100 bg-gray-50/60 p-4 text-center transition hover:border-blue-200 hover:bg-blue-50/40">
                  <span className="text-xl">{TYPE_EMOJI[b.type] ?? '📌'}</span>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-gray-500">{b.type}</p>
                  <p className="mt-1 text-2xl font-black text-gray-900">{b.remaining}</p>
                  <p className="text-[11px] text-gray-400">{b.used}/{b.entitled} used</p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                    <div className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Request form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6 py-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">New Leave Request</h2>
                <button onClick={() => setShowForm(false)} className="rounded-full bg-white/15 p-1.5 text-white transition hover:bg-white/25">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-0.5 text-xs text-blue-200">Fill in the details below — approval is instant for admins.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              {error && <p className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600"><AlertCircle size={15} /> {error}</p>}
              {success && <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-600"><CheckCircle size={15} /> {success}</p>}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Leave Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as LeaveType }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  required
                >
                  {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    min={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
              </div>
              {days > 0 && (
                <p className="-mt-1 text-xs font-medium text-blue-600">{days} day{days !== 1 ? 's' : ''} off</p>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Reason</label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  placeholder="Briefly describe the reason for your leave..."
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Supporting Document <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} />
                {proofFile ? (
                  <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="flex-1 truncate text-gray-700">{proofFile.name}</span>
                    <button type="button" onClick={() => setProofFile(null)} className="text-gray-400 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 px-4 py-3 text-sm text-gray-500 transition hover:border-blue-300 hover:bg-blue-50/40"
                  >
                    <Upload className="h-4 w-4" /> Upload letter / evidence
                  </button>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-60">
                  {submitting ? 'Submitting…' : 'Submit Request'}
                  {!submitting && <ChevronRight size={15} />}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave history */}
      <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">My Leave Requests</h2>
            <p className="text-xs text-gray-400">{leaves.length} request{leaves.length !== 1 ? 's' : ''} total</p>
          </div>
          <Briefcase size={16} className="text-gray-300" />
        </div>
        {loading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : leaves.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Calendar className="h-10 w-10 text-gray-300" />
            <p className="mt-2 text-sm text-gray-400">No leave requests yet</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700">
              Request your first leave →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {leaves.map((l) => (
              <div key={l.id} className="flex items-start gap-4 p-4 transition-colors hover:bg-gray-50/70">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg">
                  {TYPE_EMOJI[l.type] ?? '📌'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{l.type}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${STATUS_STYLE[l.status]}`}>
                      {STATUS_ICON[l.status]} {l.status}
                    </span>
                    {l.proofFile && (
                      <a
                        href={`/api/uploads/leave/${l.proofFile}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                      >
                        <FileText className="h-3 w-3" /> Proof
                      </a>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {fmtDate(l.startDate)} – {fmtDate(l.endDate)} · {l.days} day{l.days !== 1 ? 's' : ''}
                  </p>
                  {l.reason && <p className="mt-1 line-clamp-2 text-xs text-gray-600">{l.reason}</p>}
                  {l.adminNote && (
                    <p className="mt-1 flex items-center gap-1 text-xs italic text-gray-400">
                      <AlertCircle size={11} /> Admin: {l.adminNote}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-xs text-gray-400">{fmtDate(l.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
