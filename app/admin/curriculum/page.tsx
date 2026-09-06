'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  FileText, CheckCircle2, RefreshCw, Clock, Filter, Send,
  ChevronDown, ChevronUp, X, Tag, GraduationCap, User,
  MessageSquare, BookOpen, Layers,
} from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import clsx from 'clsx';

type Status = 'ALL' | 'SUBMITTED' | 'APPROVED' | 'NEEDS_REVISION' | 'DRAFT';

interface LessonPlanAdmin {
  id: string;
  title: string;
  objectives?: string;
  content?: string;
  resources?: string;
  evaluation?: string;
  date?: string;
  duration?: number;
  status: string;
  reviewComment?: string | null;
  reviewedAt?: string | null;
  topic?: string | null;
  subject?: string | null;
  classRoom?: string | null;
  staffName?: string;
  staffId?: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CFG: Record<string, { label: string; icon: React.ElementType; badge: string }> = {
  DRAFT:          { label: 'Draft',          icon: Clock,         badge: 'bg-gray-100 text-gray-600' },
  SUBMITTED:      { label: 'Under Review',   icon: Clock,         badge: 'bg-blue-50 text-blue-700 border border-blue-200' },
  APPROVED:       { label: 'Approved',       icon: CheckCircle2,  badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  NEEDS_REVISION: { label: 'Needs Revision', icon: RefreshCw,     badge: 'bg-amber-50 text-amber-700 border border-amber-200' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.DRAFT;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold ${cfg.badge}`}>
      <Icon size={10} /> {cfg.label}
    </span>
  );
}

/* ─── Review Modal ───────────────────────────────────────────────────── */
function ReviewModal({
  plan, onClose, onDone,
}: {
  plan: LessonPlanAdmin;
  onClose: () => void;
  onDone: () => void;
}) {
  const [comment, setComment] = useState(plan.reviewComment ?? '');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const submit = async (status: 'APPROVED' | 'NEEDS_REVISION') => {
    if (status === 'NEEDS_REVISION' && !comment.trim()) {
      toast.error('Please enter a review comment explaining what needs to change');
      return;
    }
    setSaving(true);
    try {
      await api.post((endpoints.admin as any).adminCurriculumReview(plan.id), {
        status,
        comment: comment.trim() || undefined,
      });
      toast.success(status === 'APPROVED' ? 'Lesson plan approved!' : 'Revision requested');
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to submit review');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Review Lesson Plan</h2>
            <p className="text-xs text-gray-400 mt-0.5">{plan.staffName} · {plan.classRoom ?? '—'} · {plan.subject ?? '—'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Plan details */}
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-3">
            <p className="font-bold text-gray-900 text-sm">{plan.title}</p>
            {plan.objectives && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Objectives</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{plan.objectives}</p>
              </div>
            )}
            {plan.content && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Content</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{plan.content}</p>
              </div>
            )}
            {plan.resources && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Resources</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{plan.resources}</p>
              </div>
            )}
            {plan.evaluation && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Evaluation</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{plan.evaluation}</p>
              </div>
            )}
          </div>

          {/* Review comment */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Review Comment <span className="text-gray-400">(required when requesting revision)</span>
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Describe what needs to be changed, or leave a note for the teacher…"
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={() => submit('NEEDS_REVISION')}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-amber-300 text-amber-700 bg-amber-50 text-sm font-bold hover:bg-amber-100 transition disabled:opacity-50"
          >
            <RefreshCw size={15} /> Request Revision
          </button>
          <button
            onClick={() => submit('APPROVED')}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 shadow-sm transition disabled:opacity-50"
          >
            <CheckCircle2 size={15} /> {saving ? 'Saving…' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Plan Card ──────────────────────────────────────────────────────── */
function PlanCard({ plan, onReview }: { plan: LessonPlanAdmin; onReview: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={clsx(
      'bg-white rounded-2xl border shadow-sm overflow-hidden',
      plan.status === 'SUBMITTED'      ? 'border-blue-200'    :
      plan.status === 'APPROVED'       ? 'border-emerald-200' :
      plan.status === 'NEEDS_REVISION' ? 'border-amber-200'   : 'border-gray-100'
    )}>
      <div
        className="flex items-start justify-between gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50/40 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-semibold text-gray-900 text-sm">{plan.title}</p>
            <StatusBadge status={plan.status} />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {plan.staffName && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                <User size={10} /> {plan.staffName}
              </span>
            )}
            {plan.classRoom && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                <GraduationCap size={10} /> {plan.classRoom}
              </span>
            )}
            {plan.subject && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                <Tag size={10} /> {plan.subject}
              </span>
            )}
            {plan.duration && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                <Clock size={10} /> {plan.duration} mins
              </span>
            )}
          </div>
          {plan.reviewComment && !expanded && (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-600">
              <MessageSquare size={10} /> {plan.reviewComment.slice(0, 60)}{plan.reviewComment.length > 60 ? '…' : ''}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {plan.status === 'SUBMITTED' && (
            <button
              onClick={e => { e.stopPropagation(); onReview(); }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition shadow-sm"
            >
              <Send size={12} /> Review
            </button>
          )}
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-3 bg-gray-50/30">
          {[
            ['Objectives', plan.objectives],
            ['Content', plan.content],
            ['Resources', plan.resources],
            ['Evaluation', plan.evaluation],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div key={label as string}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{label}</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{value}</p>
            </div>
          ))}
          {plan.reviewComment && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1">Review Comment</p>
              <p className="text-sm text-amber-800">{plan.reviewComment}</p>
            </div>
          )}
          {plan.status === 'SUBMITTED' && (
            <button
              onClick={onReview}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-sm w-full justify-center"
            >
              <Send size={14} /> Write Review
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════ */
export default function AdminCurriculumPage() {
  const toast = useToast();
  const [plans, setPlans]       = useState<LessonPlanAdmin[]>([]);
  const [loading, setLoading]   = useState(true);
  const [status, setStatus]     = useState<Status>('SUBMITTED');
  const [reviewing, setReviewing] = useState<LessonPlanAdmin | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = status !== 'ALL' ? { status } : {};
    api.get<any>((endpoints.admin as any).adminCurriculumLessonPlans, params)
      .then(r => setPlans(r.data ?? []))
      .catch(() => toast.error('Failed to load lesson plans'))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const STATUS_TABS: [Status, string][] = [
    ['SUBMITTED',      'Under Review'],
    ['NEEDS_REVISION', 'Needs Revision'],
    ['APPROVED',       'Approved'],
    ['DRAFT',          'Drafts'],
    ['ALL',            'All'],
  ];

  const submittedCount = plans.filter(p => p.status === 'SUBMITTED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Curriculum Review</h1>
        <p className="text-sm text-gray-500 mt-0.5">Review and approve lesson plans submitted by staff</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Pending Review', value: submittedCount,                               color: 'bg-blue-50 text-blue-700 border-blue-100', icon: Clock },
          { label: 'Approved',       value: plans.filter(p => p.status === 'APPROVED').length,        color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle2 },
          { label: 'Needs Revision', value: plans.filter(p => p.status === 'NEEDS_REVISION').length,  color: 'bg-amber-50 text-amber-700 border-amber-100', icon: RefreshCw },
          { label: 'Total Plans',    value: plans.length,                                             color: 'bg-gray-50 text-gray-700 border-gray-100', icon: FileText },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className={`rounded-2xl border p-4 ${color}`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={16} />
              <span className="text-xs font-semibold">{label}</span>
            </div>
            <p className="text-2xl font-black">{value}</p>
          </div>
        ))}
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1 flex-wrap">
        {STATUS_TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStatus(key)}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
              status === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {label}
            {key !== 'ALL' && (
              <span className={clsx(
                'text-[10px] font-bold rounded-full px-1.5 min-w-[18px] text-center',
                status === key ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              )}>
                {plans.filter(p => p.status === key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Plan list */}
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />)}</div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <FileText size={30} className="text-gray-300" />
          </div>
          <p className="text-base font-semibold text-gray-400">
            {status === 'SUBMITTED' ? 'No lesson plans pending review' : 'No lesson plans in this category'}
          </p>
          <p className="text-sm text-gray-300 mt-1">Staff will submit their plans for review and they'll appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map(p => (
            <PlanCard key={p.id} plan={p} onReview={() => setReviewing(p)} />
          ))}
        </div>
      )}

      {/* Review modal */}
      {reviewing && (
        <ReviewModal
          plan={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => { setReviewing(null); load(); }}
        />
      )}
    </div>
  );
}
