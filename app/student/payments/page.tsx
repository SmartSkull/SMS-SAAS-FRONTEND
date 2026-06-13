'use client';
import { EmptyState, LoadingState } from '@/components/ui/StateDisplay';
import { useToast } from '@/components/ui/Toast';
import { normalizeSchoolLogo, useSelectedSchool } from '@/hooks/useSelectedSchool';
import { api, endpoints, getImageUrl } from '@/lib/api';
import { auth } from '@/lib/auth';
import type { ApiResponse, SchoolProfile } from '@/types';
import clsx from 'clsx';
import { AlertCircle, CheckCircle2, Clock, CreditCard, Download, ExternalLink, Receipt, XCircle } from 'lucide-react';
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

/* ── Receipt Modal ── */
function ReceiptModal({ payment, user, school, onClose }: { payment: any; user: any; school?: SchoolProfile | null; onClose: () => void }) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const verifyUrl  = `${VERIFY_BASE}?reference=${payment.reference}`;
  const paidDate   = new Date(payment.paidAt || payment.createdAt);
  const logo       = normalizeSchoolLogo(school?.logo);
  const primary    = school?.primaryColor || '#1d4ed8';
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
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div ref={receiptRef} className="bg-white rounded-2xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div style={{ background: primary }} className="p-6 text-center">
            {logo && <img src={logo} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-white/30 mx-auto mb-3"/>}
            <p className="text-white font-bold text-sm">{schoolName}</p>
            {schoolSlogan && <p className="text-white/60 text-xs mt-0.5">{schoolSlogan}</p>}
            <span className="inline-block mt-3 bg-white/15 border border-white/25 text-white text-[9px] font-bold tracking-widest px-3 py-1 rounded-full">
              PAYMENT RECEIPT
            </span>
          </div>

          {/* Amount */}
          <div className="bg-blue-50 border-b-2 border-dashed border-blue-200 p-5 flex items-center gap-4">
            {user?.image && (
              <img src={getImageUrl(user.image) ?? ''} alt="student"
                className="w-14 h-14 rounded-full object-cover border-3 border-blue-200 shrink-0"/>
            )}
            <div>
              <p className="text-[9px] text-gray-400 uppercase tracking-wider">Amount Paid</p>
              <p className="text-3xl font-black mt-1" style={{ color: primary }}>₦{Number(payment.amount).toLocaleString()}</p>
              <span className="inline-block mt-1.5 bg-green-100 text-green-700 text-[9px] font-bold px-2.5 py-0.5 rounded-full">✓ {payment.status}</span>
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-50">
            {[
              ['Student',     user ? `${user.firstName} ${user.lastName}` : '—'],
              ['Reference',   payment.reference],
              ['Description', payment.description || 'School Fees'],
              ['Date',        paidDate.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })],
              ['Time',        paidDate.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between px-5 py-2.5">
                <span className="text-[9px] text-gray-400 uppercase tracking-wider">{label}</span>
                <span className="text-[11px] text-gray-800 font-semibold text-right max-w-[60%] break-all">{value}</span>
              </div>
            ))}
          </div>

          {/* QR */}
          <div className="border-t-2 border-dashed border-blue-200 p-5 flex flex-col items-center">
            <QRCodeSVG value={verifyUrl} size={120} level="H"
              imageSettings={logo ? { src: logo, height: 26, width: 26, excavate: true } : undefined}/>
            <p className="text-[9px] text-gray-400 mt-2">Scan to verify authenticity</p>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-100 px-5 py-2.5 text-center">
            <p className="text-[9px] text-gray-400">© {new Date().getFullYear()} {schoolName}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-white/10 border border-white/15 text-white/70 transition-colors hover:bg-white/15">
            Close
          </button>
          <button onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white btn-brand">
            <Download size={14}/> Download
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Status config ── */
const STATUS_CFG = {
  SUCCESS:  { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50',  border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', label: 'Paid' },
  PENDING:  { icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-50',    border: 'border-amber-200',   badge: 'bg-amber-100 text-amber-700',    label: 'Pending' },
  FAILED:   { icon: XCircle,      color: 'text-red-600',     bg: 'bg-red-50',      border: 'border-red-200',     badge: 'bg-red-100 text-red-700',        label: 'Failed' },
  not_paid: { icon: AlertCircle,  color: 'text-gray-400',    bg: 'bg-gray-50',     border: 'border-gray-200',    badge: 'bg-gray-100 text-gray-600',      label: 'Not Paid' },
};

/* ── Main Page ── */
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
    Promise.all([
      api.get<ApiResponse<any[]>>(endpoints.public.sessions),
      api.get<ApiResponse<{ session: string; term: string }>>(endpoints.public.currentPeriod),
    ]).then(([s, p]) => {
      setSessions(s.data);
      setSession(p.data.session);
      setTerm(p.data.term);
    }).catch(() => toast.error('Failed to load filters'));
  }, []);

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
      const r = await api.post<ApiResponse<{ authorization_url: string }>>(endpoints.student.schoolFeesInit, { session, term });
      window.location.href = r.data.authorization_url;
    } catch (e: any) {
      toast.error(e?.message || 'Failed to initialize payment');
    } finally { setPaying(false); }
  };

  const cfg = data ? (STATUS_CFG[data.payment_status] ?? STATUS_CFG.not_paid) : null;
  const StatusIcon = cfg?.icon;

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">School Fees</h1>
          <p className="text-sm text-gray-400 mt-0.5">View your fee balance and payment history</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <select value={session} onChange={e => setSession(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white shadow-sm">
            {sessions.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
          <select value={term} onChange={e => setTerm(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white shadow-sm">
            {TERMS.map(t => <option key={t} value={t}>{t} Term</option>)}
          </select>
        </div>
      </div>

      {loading ? <LoadingState message="Loading fee status…"/> : !data ? (
        <EmptyState icon={CreditCard} message="No fee information available for this period."/>
      ) : (
        <>
          {/* ── Main fee card ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Top colour strip based on status */}
            <div className={clsx('h-1.5', {
              'bg-emerald-500': data.payment_status === 'SUCCESS',
              'bg-amber-400':   data.payment_status === 'PENDING',
              'bg-red-500':     data.payment_status === 'FAILED',
              'bg-gray-300':    data.payment_status === 'not_paid',
            })}/>

            <div className="p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className={clsx('w-14 h-14 rounded-2xl flex items-center justify-center shrink-0', cfg!.bg)}>
                    {StatusIcon && <StatusIcon size={26} className={cfg!.color}/>}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                      {term} Term · {session}
                    </p>
                    <p className="text-3xl font-black text-gray-900 mt-1">
                      {data.amount !== null ? `₦${Number(data.amount).toLocaleString()}` : 'Not configured'}
                    </p>
                    {data.description && <p className="text-xs text-gray-400 mt-1">{data.description}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={clsx('px-3 py-1 rounded-full text-xs font-bold', cfg!.badge)}>
                    {cfg!.label}
                  </span>
                  {data.paid_at && (
                    <p className="text-xs text-gray-400">
                      Paid {new Date(data.paid_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
                    </p>
                  )}
                </div>
              </div>

              {/* Details grid */}
              {data.class && (
                <div className="mt-5 pt-5 border-t border-gray-50 grid grid-cols-2 gap-3">
                  {[
                    ['Class', data.class],
                    ['Session', data.session],
                    ['Term', `${data.term} Term`],
                    ['Status', cfg!.label],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-gray-50 rounded-xl px-4 py-3">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{k}</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{v}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="mt-5 pt-5 border-t border-gray-50 flex flex-wrap gap-3">
                {data.payment_status === 'SUCCESS' && data.reference && (
                  <button
                    onClick={() => setReceipt(data.history?.find((h: any) => h.reference === data.reference) ?? {
                      reference: data.reference, amount: data.amount,
                      status: 'SUCCESS', paidAt: data.paid_at, createdAt: data.paid_at,
                    })}
                    className="flex items-center gap-2 px-5 py-2.5 btn-brand text-white rounded-xl text-sm font-semibold">
                    <Receipt size={15}/> View Receipt
                  </button>
                )}
                {data.fee_configured && data.payment_status !== 'SUCCESS' && (
                  <button onClick={handlePay} disabled={paying}
                    className="flex items-center gap-2 px-6 py-2.5 btn-brand text-white rounded-xl text-sm font-semibold disabled:opacity-60">
                    <ExternalLink size={15}/>
                    {paying ? 'Redirecting…' : data.payment_status === 'PENDING' ? 'Complete Payment' : 'Pay Now via Paystack'}
                  </button>
                )}
              </div>

              {data.fee_configured && data.payment_status !== 'SUCCESS' && (
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
                  <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Secured by Paystack · Your card details are never stored
                </p>
              )}
            </div>
          </div>

          {/* ── Payment history ── */}
          {data.history?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-800">Payment History</h2>
                <span className="text-xs text-gray-400 bg-gray-50 rounded-full px-2.5 py-0.5">{data.history.length} record{data.history.length > 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {data.history.map((p: any) => {
                  const hcfg = STATUS_CFG[p.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.not_paid;
                  const HIcon = hcfg.icon;
                  return (
                    <div key={p.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', hcfg.bg)}>
                        <HIcon size={16} className={hcfg.color}/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">₦{Number(p.amount).toLocaleString()}</p>
                        <p className="text-xs text-gray-400 font-mono truncate">{p.reference}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={clsx('px-2.5 py-0.5 rounded-full text-[10px] font-bold', hcfg.badge)}>{p.status}</span>
                        <p className="text-[10px] text-gray-400 mt-1">{new Date(p.createdAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</p>
                      </div>
                      {p.status === 'SUCCESS' && (
                        <button onClick={() => setReceipt(p)}
                          className="ml-2 flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 shrink-0 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                          <Receipt size={12}/> Receipt
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {receipt && <ReceiptModal payment={receipt} user={currentUser} school={school} onClose={() => setReceipt(null)}/>}
    </div>
  );
}
