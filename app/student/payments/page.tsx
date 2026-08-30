'use client';
import { EmptyState, LoadingState } from '@/components/ui/StateDisplay';
import { useToast } from '@/components/ui/Toast';
import { normalizeSchoolLogo, useSelectedSchool } from '@/hooks/useSelectedSchool';
import { api, endpoints, getImageUrl } from '@/lib/api';
import { auth } from '@/lib/auth';
import type { ApiResponse, SchoolProfile } from '@/types';
import clsx from 'clsx';
import {
  AlertCircle, CheckCircle2, Clock, CreditCard, Download,
  ExternalLink, Receipt, XCircle, ShieldCheck, Banknote,
  CalendarDays, GraduationCap, ChevronDown, ChevronUp,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useRef, useState } from 'react';

const TERMS = ['FIRST', 'SECOND', 'THIRD'];
const VERIFY_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/student/school-fees/verify`
  : `${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080'}/student/school-fees/verify`;

interface FeeStatus {
  session: string; term: string; class: string;
  amount: number | null; description: string; fee_configured: boolean;
  payment_status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'not_paid';
  paid_at: string | null; reference: string | null; history: any[];
}

/* ─────────────────────────────────────────────
   Receipt Modal
───────────────────────────────────────────── */
function ReceiptModal({
  payment, user, school, onClose,
}: { payment: any; user: any; school?: SchoolProfile | null; onClose: () => void }) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const verifyUrl  = `${VERIFY_BASE}?reference=${payment.reference}`;
  const paidDate   = new Date(payment.paidAt || payment.createdAt);
  const logo       = normalizeSchoolLogo(school?.logo);
  const primary    = school?.primaryColor || '#2563eb';
  const schoolName = school?.name || 'School Portal';
  const schoolSlogan = school?.slogan || school?.motto || '';

  const handlePrint = () => {
    const content = receiptRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Receipt</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Segoe UI',sans-serif;background:#f1f5f9;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
        .wrap{background:#fff;border-radius:16px;width:360px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.15)}
        .hdr{background:${primary};padding:24px 20px;text-align:center;color:#fff}
        .hdr img{width:44px;height:44px;border-radius:50%;border:2px solid rgba(255,255,255,.35);display:block;margin:0 auto 10px}
        .hdr h1{font-size:13px;font-weight:800;letter-spacing:1px}
        .hdr p{font-size:10px;opacity:.65;margin-top:2px}
        .hdr .tag{display:inline-block;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);font-size:9px;font-weight:700;letter-spacing:1.5px;padding:3px 12px;border-radius:999px;margin-top:10px}
        .amt{background:#f0f7ff;border-bottom:2px dashed #bfdbfe;padding:18px;display:flex;align-items:center;gap:16px}
        .amt img{width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid #bfdbfe;flex-shrink:0}
        .row{display:flex;justify-content:space-between;padding:7px 18px;border-bottom:1px solid #f1f5f9}
        .rl{font-size:9px;color:#94a3b8;text-transform:uppercase}
        .rv{font-size:11px;color:#1e293b;font-weight:600;text-align:right;max-width:62%;word-break:break-all}
        .qr{padding:14px 18px 18px;text-align:center;border-top:2px dashed #bfdbfe}
        .qr p{font-size:9px;color:#94a3b8;margin-top:6px}
        .foot{background:#f8faff;padding:10px;text-align:center;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0}
      </style></head><body><div class="wrap">${content}</div></body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div ref={receiptRef} className="bg-white rounded-2xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div style={{ background: primary }} className="p-6 text-center">
            {logo && (
              <img src={logo} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-white/30 mx-auto mb-3" />
            )}
            <p className="text-white font-bold text-sm">{schoolName}</p>
            {schoolSlogan && <p className="text-white/60 text-xs mt-0.5">{schoolSlogan}</p>}
            <span className="inline-block mt-3 bg-white/15 border border-white/25 text-white text-[9px] font-bold tracking-widest px-3 py-1 rounded-full">
              PAYMENT RECEIPT
            </span>
          </div>

          {/* Amount */}
          <div className="bg-blue-50 border-b-2 border-dashed border-blue-200 p-5 flex items-center gap-4">
            {user?.image && (
              <img
                src={getImageUrl(user.image) ?? ''}
                alt="student"
                className="w-14 h-14 rounded-full object-cover border-[3px] border-blue-200 shrink-0"
              />
            )}
            <div>
              <p className="text-[9px] text-gray-400 uppercase tracking-wider">Amount Paid</p>
              <p className="text-3xl font-black mt-1" style={{ color: primary }}>
                ₦{Number(payment.amount).toLocaleString()}
              </p>
              <span className="inline-block mt-1.5 bg-green-100 text-green-700 text-[9px] font-bold px-2.5 py-0.5 rounded-full">
                ✓ {payment.status}
              </span>
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-50">
            {[
              ['Student',     user ? `${user.firstName} ${user.lastName}` : '—'],
              ['Reference',   payment.reference],
              ['Description', payment.description || 'School Fees'],
              ['Date',        paidDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })],
              ['Time',        paidDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between px-5 py-2.5">
                <span className="text-[9px] text-gray-400 uppercase tracking-wider">{label}</span>
                <span className="text-[11px] text-gray-800 font-semibold text-right max-w-[60%] break-all">{value}</span>
              </div>
            ))}
          </div>

          {/* QR */}
          <div className="border-t-2 border-dashed border-blue-200 p-5 flex flex-col items-center">
            <QRCodeSVG
              value={verifyUrl}
              size={120}
              level="H"
              imageSettings={logo ? { src: logo, height: 26, width: 26, excavate: true } : undefined}
            />
            <p className="text-[9px] text-gray-400 mt-2">Scan to verify authenticity</p>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-100 px-5 py-2.5 text-center">
            <p className="text-[9px] text-gray-400">© {new Date().getFullYear()} {schoolName}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-white/10 border border-white/15 text-white/70 transition-colors hover:bg-white/15"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white btn-brand"
          >
            <Download size={14} /> Download
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Status config
───────────────────────────────────────────── */
const STATUS_CFG = {
  SUCCESS:  {
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
    heroBg: 'from-emerald-600 to-emerald-500',
    strip: 'bg-emerald-500',
    label: 'Paid',
  },
  PENDING:  {
    icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    heroBg: 'from-amber-500 to-yellow-400',
    strip: 'bg-amber-400',
    label: 'Pending',
  },
  FAILED:   {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700',
    heroBg: 'from-red-600 to-rose-500',
    strip: 'bg-red-500',
    label: 'Failed',
  },
  not_paid: {
    icon: AlertCircle,
    color: 'text-gray-400',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    badge: 'bg-gray-100 text-gray-600',
    heroBg: 'from-blue-700 to-blue-500',
    strip: 'bg-gray-300',
    label: 'Unpaid',
  },
};

/* ─────────────────────────────────────────────
   Hero Banner
───────────────────────────────────────────── */
function HeroBanner({
  data,
  cfg,
  school,
  user,
  onPay,
  onReceipt,
  paying,
}: {
  data: FeeStatus;
  cfg: typeof STATUS_CFG[keyof typeof STATUS_CFG];
  school?: SchoolProfile | null;
  user: any;
  onPay: () => void;
  onReceipt: () => void;
  paying: boolean;
}) {
  const primary = school?.primaryColor || '#2563eb';
  const StatusIcon = cfg.icon;
  const isPaid = data.payment_status === 'SUCCESS';
  const isConfigured = data.fee_configured;

  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-lg"
      style={{ background: `linear-gradient(135deg, ${primary} 0%, color-mix(in srgb, ${primary} 70%, black) 100%)` }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute top-1/2 right-16 -translate-y-1/2 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

      <div className="relative z-10 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">

          {/* Left: amount + meta */}
          <div className="flex items-center gap-5">
            {/* Status icon bubble */}
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
              <StatusIcon size={32} className="text-white" />
            </div>

            <div>
              <p className="text-white/70 text-xs font-medium uppercase tracking-widest mb-1">
                {data.term} Term · {data.session}
              </p>
              <p className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none">
                {data.amount !== null ? `₦${Number(data.amount).toLocaleString()}` : 'Not set'}
              </p>
              {data.description && (
                <p className="text-white/60 text-xs mt-2">{data.description}</p>
              )}
              {/* Status pill */}
              <span className="inline-flex items-center gap-1.5 mt-3 bg-white/15 border border-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                <StatusIcon size={11} />
                {cfg.label}
                {isPaid && data.paid_at && (
                  <span className="text-white/60 font-normal">
                    · {new Date(data.paid_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Right: CTA */}
          <div className="flex flex-col gap-2 shrink-0">
            {isPaid && data.reference && (
              <button
                onClick={onReceipt}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-gray-800 rounded-xl text-sm font-semibold shadow hover:shadow-md transition-shadow"
              >
                <Receipt size={15} /> View Receipt
              </button>
            )}
            {isConfigured && !isPaid && (
              <button
                onClick={onPay}
                disabled={paying}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Banknote size={16} />
                {paying ? 'Redirecting…' : data.payment_status === 'PENDING' ? 'Complete Payment' : 'Pay Now'}
              </button>
            )}
          </div>
        </div>

        {/* Student meta strip */}
        {(data.class || user?.firstName) && (
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap gap-x-6 gap-y-2">
            {user?.firstName && (
              <div className="flex items-center gap-2 text-white/70 text-xs">
                <GraduationCap size={13} className="text-white/50" />
                <span>{user.firstName} {user.lastName}</span>
              </div>
            )}
            {data.class && (
              <div className="flex items-center gap-2 text-white/70 text-xs">
                <CalendarDays size={13} className="text-white/50" />
                <span>{data.class}</span>
              </div>
            )}
            {!isPaid && isConfigured && (
              <div className="flex items-center gap-2 text-white/50 text-xs ml-auto">
                <ShieldCheck size={12} />
                <span>Secured by Paystack</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Fee Details Card
───────────────────────────────────────────── */
function FeeDetailsCard({ data, cfg }: { data: FeeStatus; cfg: typeof STATUS_CFG[keyof typeof STATUS_CFG] }) {
  const items = [
    { label: 'Class',   value: data.class,          icon: GraduationCap },
    { label: 'Session', value: data.session,         icon: CalendarDays },
    { label: 'Term',    value: `${data.term} Term`,  icon: Clock },
    { label: 'Status',  value: cfg.label,            icon: cfg.icon },
  ].filter(i => i.value);

  if (!items.length) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50">
        <h2 className="text-sm font-bold text-gray-800">Fee Details</h2>
      </div>
      <div className="grid grid-cols-2 gap-px bg-gray-100">
        {items.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white px-5 py-4 flex items-center gap-3">
            <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', cfg.bg)}>
              <Icon size={14} className={cfg.color} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Payment History
───────────────────────────────────────────── */
function HistoryCard({
  history,
  onReceipt,
}: { history: any[]; onReceipt: (p: any) => void }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full px-6 py-4 border-b border-gray-50 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-800">Payment History</h2>
          <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5 font-semibold">
            {history.length}
          </span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="divide-y divide-gray-50">
          {history.map((p: any, i: number) => {
            const hcfg = STATUS_CFG[p.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.not_paid;
            const HIcon = hcfg.icon;
            const date = new Date(p.createdAt);
            return (
              <div
                key={p.id ?? i}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/70 transition-colors group"
              >
                {/* Status bubble */}
                <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', hcfg.bg)}>
                  <HIcon size={18} className={hcfg.color} />
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-gray-900">
                      ₦{Number(p.amount).toLocaleString()}
                    </p>
                    <span className={clsx('px-2.5 py-0.5 rounded-full text-[10px] font-bold', hcfg.badge)}>
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">{p.reference}</p>
                </div>

                {/* Date + receipt */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-medium text-gray-700">
                      {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {p.status === 'SUCCESS' && (
                    <button
                      onClick={() => onReceipt(p)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Receipt size={12} /> Receipt
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export default function StudentPayments() {
  const { school } = useSelectedSchool();
  const [data, setData]         = useState<FeeStatus | null>(null);
  const [sessions, setSessions] = useState<{ name: string }[]>([]);
  const [session, setSession]   = useState('');
  const [term, setTerm]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [paying, setPaying]     = useState(false);
  const [receipt, setReceipt]   = useState<any | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(auth.getUser());
  const toast = useToast();

  useEffect(() => {
    api.get<ApiResponse<any>>(endpoints.student.profile)
      .then(r => setCurrentUser((u: any) => ({ ...u, image: r.data?.image ?? u?.image })))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = school?.slug ? { school: school.slug } : undefined;
    Promise.all([
      api.get<ApiResponse<any[]>>(endpoints.public.sessions, params),
      api.get<ApiResponse<{ session: string; term: string }>>(endpoints.public.currentPeriod, params),
    ]).then(([s, p]) => {
      setSessions(s.data);
      setSession(p.data.session);
      setTerm(p.data.term);
    }).catch(() => toast.error('Failed to load filters'));
  }, [school?.slug]);

  useEffect(() => {
    if (!session || !term) return;
    setLoading(true);
    setData(null);
    api.get<ApiResponse<FeeStatus>>(endpoints.student.schoolFees, { session, term })
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [session, term]);

  const handlePay = async () => {
    setPaying(true);
    try {
      const r = await api.post<ApiResponse<{ authorization_url: string }>>(
        endpoints.student.schoolFeesInit, { session, term },
      );
      window.location.href = r.data.authorization_url;
    } catch (e: any) {
      toast.error(e?.message || 'Failed to initialize payment');
    } finally { setPaying(false); }
  };

  const openReceipt = (p?: any) => {
    if (!p && data?.reference) {
      p = data.history?.find((h: any) => h.reference === data.reference) ?? {
        reference: data.reference,
        amount: data.amount,
        status: 'SUCCESS',
        paidAt: data.paid_at,
        createdAt: data.paid_at,
      };
    }
    setReceipt(p ?? null);
  };

  const cfg = data ? (STATUS_CFG[data.payment_status] ?? STATUS_CFG.not_paid) : null;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">School Fees</h1>
          <p className="text-sm text-gray-400 mt-0.5">View your fee balance and payment history</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <select
              value={session}
              onChange={e => setSession(e.target.value)}
              className="appearance-none border border-gray-200 rounded-xl pl-3 pr-8 py-2 text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white shadow-sm cursor-pointer"
            >
              {sessions.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={term}
              onChange={e => setTerm(e.target.value)}
              className="appearance-none border border-gray-200 rounded-xl pl-3 pr-8 py-2 text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white shadow-sm cursor-pointer"
            >
              {TERMS.map(t => <option key={t} value={t}>{t} Term</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <LoadingState message="Loading fee status…" />
      ) : !data ? (
        <EmptyState icon={CreditCard} message="No fee information available for this period." />
      ) : (
        <>
          {/* Hero banner */}
          <HeroBanner
            data={data}
            cfg={cfg!}
            school={school}
            user={currentUser}
            onPay={handlePay}
            onReceipt={openReceipt}
            paying={paying}
          />

          {/* Fee details */}
          <FeeDetailsCard data={data} cfg={cfg!} />

          {/* Payment history */}
          {data.history?.length > 0 && (
            <HistoryCard history={data.history} onReceipt={setReceipt} />
          )}

          {/* Security note (only when unpaid) */}
          {data.fee_configured && data.payment_status !== 'SUCCESS' && (
            <p className="text-xs text-gray-400 flex items-center gap-1.5 px-1">
              <ShieldCheck size={13} className="shrink-0 text-gray-400" />
              Secured by Paystack · Your card details are never stored on our servers
            </p>
          )}
        </>
      )}

      {/* Receipt modal */}
      {receipt && (
        <ReceiptModal
          payment={receipt}
          user={currentUser}
          school={school}
          onClose={() => setReceipt(null)}
        />
      )}
    </div>
  );
}
