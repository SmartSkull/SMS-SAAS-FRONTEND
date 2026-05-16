'use client';
import { useState, useRef } from 'react';
import { Plus, FileText, Calendar, Clock, CheckCircle, XCircle, AlertCircle, Upload, X } from 'lucide-react';
import { useMyLeaves, useLeaveBalance, useRequestLeave } from '@/hooks/leave';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import type { LeaveStatus, LeaveType } from '@/types';

const STATUS_STYLE: Record<LeaveStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const STATUS_ICON: Record<LeaveStatus, React.ReactNode> = {
  PENDING: <Clock className="w-3 h-3" />,
  APPROVED: <CheckCircle className="w-3 h-3" />,
  REJECTED: <XCircle className="w-3 h-3" />,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-sm text-gray-500 mt-1">Request and track your leave applications</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
          style={{ background: 'var(--brand)' }}
        >
          <Plus className="w-4 h-4" /> Request Leave
        </button>
      </div>

      {/* Balance cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Leave Balance ({new Date().getFullYear()})</h2>
        {balLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {balance.map((b) => (
              <div key={b.type} className="bg-white rounded-xl border p-3 text-center shadow-sm">
                <p className="text-xs text-gray-500 font-medium">{b.type}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: 'var(--brand)' }}>{b.remaining}</p>
                <p className="text-xs text-gray-400">{b.used}/{b.entitled} used</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Request form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold text-gray-900">New Leave Request</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
              {success && <p className="text-sm text-green-600 bg-green-50 rounded-lg p-3">{success}</p>}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as LeaveType }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': 'var(--brand)' } as React.CSSProperties}
                  required
                >
                  {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    min={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                    required
                  />
                </div>
              </div>
              {days > 0 && (
                <p className="text-xs text-gray-500 -mt-2">{days} day{days !== 1 ? 's' : ''}</p>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none"
                  placeholder="Briefly describe the reason for your leave..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supporting Document <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} />
                {proofFile ? (
                  <div className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="flex-1 truncate text-gray-700">{proofFile.name}</span>
                    <button type="button" onClick={() => setProofFile(null)} className="text-gray-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2 border-2 border-dashed rounded-lg px-4 py-3 text-sm text-gray-500 hover:border-gray-400 w-full justify-center"
                  >
                    <Upload className="w-4 h-4" /> Upload letter / evidence
                  </button>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border rounded-xl py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 rounded-xl py-2 text-sm font-medium text-white disabled:opacity-60"
                  style={{ background: 'var(--brand)' }}>
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave history */}
      <div className="bg-white rounded-2xl shadow-sm border">
        <div className="p-5 border-b">
          <h2 className="font-semibold text-gray-900">My Leave Requests</h2>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : leaves.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No leave requests yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {leaves.map((l) => (
              <div key={l.id} className="p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900">{l.type}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[l.status]}`}>
                      {STATUS_ICON[l.status]} {l.status}
                    </span>
                    {l.proofFile && (
                      <a
                        href={`/api/uploads/leave/${l.proofFile}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        <FileText className="w-3 h-3" /> Proof
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {fmtDate(l.startDate)} – {fmtDate(l.endDate)} · {l.days} day{l.days !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{l.reason}</p>
                  {l.adminNote && (
                    <p className="text-xs text-gray-500 mt-1 italic">Admin note: {l.adminNote}</p>
                  )}
                </div>
                <p className="text-xs text-gray-400 whitespace-nowrap">{fmtDate(l.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
