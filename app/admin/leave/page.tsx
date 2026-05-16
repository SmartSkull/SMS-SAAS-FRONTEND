'use client';
import { useState } from 'react';
import { CheckCircle, XCircle, Clock, FileText, User, BarChart2, X, Settings, Save } from 'lucide-react';
import { useAdminLeaves, useReviewLeave, useStaffLeaveBalance, useLeaveEntitlements } from '@/hooks/leave';
import { Skeleton } from '@/components/ui/Skeleton';
import { getImageUrl } from '@/lib/api';
import type { LeaveStatus, LeaveRequestWithStaff } from '@/types';

const STATUS_STYLE: Record<LeaveStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

function ReviewModal({
  leave,
  onClose,
  onDone,
}: {
  leave: LeaveRequestWithStaff;
  onClose: () => void;
  onDone: () => void;
}) {
  const [adminNote, setAdminNote] = useState('');
  const { review, loading, error } = useReviewLeave(onDone);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-5 border-b">
          <h2 className="font-semibold text-gray-900">Review Leave Request</h2>
          <p className="text-sm text-gray-500 mt-0.5">{leave.staff.name} · {leave.type}</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
            <p><span className="text-gray-600 font-medium">Period:</span> <span className="text-gray-900">{fmtDate(leave.startDate)} – {fmtDate(leave.endDate)} ({leave.days} days)</span></p>
            <p><span className="text-gray-600 font-medium">Reason:</span> <span className="text-gray-900">{leave.reason}</span></p>
            {leave.proofFile && (
              <a href={`/api/uploads/leave/${leave.proofFile}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                <FileText className="w-3 h-3" /> View supporting document
              </a>
            )}
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Note <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none"
              placeholder="Add a note for the staff member..."
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 border rounded-xl py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={() => review(leave.id, 'REJECTED', adminNote)}
              disabled={loading}
              className="flex-1 rounded-xl py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-60"
            >
              Reject
            </button>
            <button
              onClick={() => review(leave.id, 'APPROVED', adminNote)}
              disabled={loading}
              className="flex-1 rounded-xl py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-60"
            >
              Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BalancePanel({ staffId, staffName, onClose }: { staffId: string; staffName: string; onClose: () => void }) {
  const { balance, loading } = useStaffLeaveBalance(staffId);
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Leave Balance</h2>
            <p className="text-sm text-gray-500">{staffName} · {new Date().getFullYear()}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <div className="space-y-2">
              {balance.map((b) => (
                <div key={b.type} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm font-medium text-gray-700">{b.type}</span>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-500">{b.used}/{b.entitled} used</span>
                    <span className="font-semibold" style={{ color: b.remaining > 0 ? 'var(--brand)' : '#ef4444' }}>
                      {b.remaining} left
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminLeavePage() {
  const [filter, setFilter] = useState<string>('');
  const { leaves, loading, reload } = useAdminLeaves(filter || undefined);
  const [reviewing, setReviewing] = useState<LeaveRequestWithStaff | null>(null);
  const [balanceStaff, setBalanceStaff] = useState<{ id: string; name: string } | null>(null);
  const [showEntitlements, setShowEntitlements] = useState(false);

  const pending = leaves.filter((l) => l.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            {pending > 0 ? <span className="text-yellow-600 font-medium">{pending} pending</span> : 'All requests'} · {leaves.length} total
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowEntitlements(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-white text-gray-600 hover:bg-gray-50"
          >
            <Settings className="w-3.5 h-3.5" /> Entitlements
          </button>
          {(['', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                filter === s ? 'text-white border-transparent' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
              style={filter === s ? { background: 'var(--brand)', borderColor: 'var(--brand)' } : {}}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : leaves.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No leave requests found</p>
          </div>
        ) : (
          <div className="divide-y">
            {leaves.map((l) => (
              <div key={l.id} className="p-4 flex items-start gap-4">
                {/* Staff avatar */}
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {l.staff.image ? (
                    <img src={getImageUrl(l.staff.image) ?? ''} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-gray-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900">{l.staff.name}</span>
                    <span className="text-xs text-gray-400">{l.staff.staffNo}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[l.status]}`}>
                      {l.status}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{l.type}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {fmtDate(l.startDate)} – {fmtDate(l.endDate)} · {l.days} day{l.days !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-1">{l.reason}</p>
                  {l.adminNote && <p className="text-xs text-gray-400 italic mt-0.5">Note: {l.adminNote}</p>}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {l.proofFile && (
                    <a href={`/api/uploads/leave/${l.proofFile}`} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50" title="View document">
                      <FileText className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => setBalanceStaff({ id: l.staff.id, name: l.staff.name })}
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" title="View balance"
                  >
                    <BarChart2 className="w-4 h-4" />
                  </button>
                  {l.status === 'PENDING' && (
                    <button
                      onClick={() => setReviewing(l)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                      style={{ background: 'var(--brand)' }}
                    >
                      Review
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {reviewing && (
        <ReviewModal
          leave={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => { setReviewing(null); reload(); }}
        />
      )}

      {balanceStaff && (
        <div onClick={() => setBalanceStaff(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <BalancePanel staffId={balanceStaff.id} staffName={balanceStaff.name} onClose={() => setBalanceStaff(null)} />
          </div>
        </div>
      )}

      {showEntitlements && <EntitlementsPanel onClose={() => setShowEntitlements(false)} />}
    </div>
  );
}

function EntitlementsPanel({ onClose }: { onClose: () => void }) {
  const { entitlements, loading, saving, error, save } = useLeaveEntitlements();
  const [draft, setDraft] = useState<Record<string, number>>({});

  const getValue = (type: string) =>
    draft[type] !== undefined ? draft[type] : (entitlements.find((e) => e.type === type)?.days ?? 0);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Leave Entitlements</h2>
            <p className="text-sm text-gray-500">Set the number of days per leave type for this school</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            entitlements.map(({ type }) => (
              <div key={type} className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-gray-700 w-28">{type}</span>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="number"
                    min={0}
                    value={getValue(type)}
                    onChange={(e) => setDraft((d) => ({ ...d, [type]: Number(e.target.value) }))}
                    className="w-20 border rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2"
                  />
                  <span className="text-xs text-gray-400">days/year</span>
                  <button
                    onClick={async () => { await save(type, getValue(type)); setDraft((d) => { const n = { ...d }; delete n[type]; return n; }); }}
                    disabled={saving || draft[type] === undefined}
                    className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-40"
                    style={{ background: 'var(--brand)' }}
                  >
                    <Save className="w-3 h-3" /> Save
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
