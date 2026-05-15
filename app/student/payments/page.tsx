'use client';
import { EmptyState, LoadingState } from '@/components/ui/StateDisplay';
import { useToast } from '@/components/ui/Toast';
import { normalizeSchoolLogo, useSelectedSchool } from '@/hooks/useSelectedSchool';
import { api, endpoints, getImageUrl } from '@/lib/api';
import { auth } from '@/lib/auth';
import type { ApiResponse, SchoolProfile } from '@/types';
import clsx from 'clsx';
import { CheckCircle2, Clock, CreditCard, Download, ExternalLink, Receipt, XCircle } from 'lucide-react';
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

/* ── Receipt Modal ─────────────────────────────────────────────────────────── */
function ReceiptModal({ payment, user, school, onClose }: { payment: any; user: any; school?: SchoolProfile | null; onClose: () => void }) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const verifyUrl  = `${VERIFY_BASE}?reference=${payment.reference}`;
  const paidDate   = new Date(payment.paidAt || payment.createdAt);
  const logo = normalizeSchoolLogo(school?.logo);
  const primary = school?.primaryColor || '#1d4ed8';
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
        .hdr .logos{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:10px}
        .hdr img{width:44px;height:44px;border-radius:50%;border:2px solid rgba(255,255,255,.35)}
        .hdr h1{font-size:13px;font-weight:800;letter-spacing:1px}
        .hdr p{font-size:10px;opacity:.65;margin-top:2px}
        .hdr .tag{display:inline-block;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);font-size:9px;font-weight:700;letter-spacing:1.5px;padding:3px 12px;border-radius:999px;margin-top:10px}
        .amt{background:#f0f7ff;border-bottom:2px dashed #bfdbfe;padding:18px;display:flex;align-items:center;gap:16px}
        .amt img{width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid #bfdbfe;flex-shrink:0}
        .amt .info{flex:1}
        .amt .lbl{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em}
        .amt .val{font-size:32px;font-weight:900;color:${primary};margin-top:2px;line-height:1}
        .amt .badge{display:inline-block;background:#dcfce7;color:#15803d;font-size:9px;font-weight:700;padding:2px 10px;border-radius:999px;margin-top:6px}
        .rows{padding:14px 18px}
        .row{display:flex;justify-content:space-between;align-items:flex-start;padding:7px 0;border-bottom:1px solid #f1f5f9}
        .row:last-child{border:none}
        .rl{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;padding-top:1px;white-space:nowrap}
        .rv{font-size:11px;color:#1e293b;font-weight:600;text-align:right;max-width:62%;word-break:break-all}
        .qr{padding:14px 18px 18px;text-align:center;border-top:2px dashed #bfdbfe}
        .qr p{font-size:9px;color:#94a3b8;margin-top:6px}
        .foot{background:#f8faff;padding:10px;text-align:center;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0}
      </style></head><body><div class="wrap">${content}</div></body></html>`);
    win.document.close();
    win.print();
  };

  const s = (style: React.CSSProperties) => style;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xs sm:max-w-md" onClick={(e) => e.stopPropagation()}>

        <div ref={receiptRef} style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,.3)' }}>

          {/* Header */}
          <div className="hdr" style={{ background: primary, padding: '22px 20px', textAlign: 'center' }}>
            {logo && <img src={logo}
              style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,.35)', display: 'block', margin: '0 auto 10px' }} />}
            <p style={{ color: '#fff', fontSize: 13, fontWeight: 800, letterSpacing: 1 }}>{schoolName}</p>
            {schoolSlogan && <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 10, marginTop: 2 }}>{schoolSlogan}</p>}
            <span style={{ display: 'inline-block', background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, padding: '3px 12px', borderRadius: 999, marginTop: 10 }}>
              PAYMENT RECEIPT
            </span>
          </div>

          {/* Amount + Student Image */}
          <div style={{ background: '#f0f7ff', borderBottom: '2px dashed #bfdbfe', padding: '18px', display: 'flex', alignItems: 'center', gap: 16 }}>
            {user?.image && (
              <img src={getImageUrl(user.image) ?? ''} alt="student"
                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid #bfdbfe', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, textAlign: user?.image ? 'left' : 'center' }}>
              <p style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.1em' }}>Amount Paid</p>
              <p style={{ fontSize: 32, fontWeight: 900, color: primary, marginTop: 2, lineHeight: 1 }}>₦{Number(payment.amount).toLocaleString()}</p>
              <span style={{ display: 'inline-block', background: '#dcfce7', color: '#15803d', fontSize: 9, fontWeight: 700, padding: '2px 12px', borderRadius: 999, marginTop: 6 }}>
                ✓ {payment.status}
              </span>
            </div>
          </div>

          {/* Rows */}
          <div className="rows" style={{ padding: '14px 18px' }}>
            {[
              ['Student',     user ? `${user.firstName} ${user.lastName}` : '—'],
              ['Reference',   payment.reference],
              ['Description', payment.description || 'School Fees'],
              ['Date',        paidDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })],
              ['Time',        paidDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })],
            ].map(([label, value]) => (
              <div key={label} className="row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '7px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em' }}>{label}</span>
                <span style={{ fontSize: 11, color: '#1e293b', fontWeight: 600, textAlign: 'right', maxWidth: '62%', wordBreak: 'break-all' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* QR */}
          <div className="qr" style={{ padding: '14px 18px 18px', textAlign: 'center', borderTop: '2px dashed #bfdbfe', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <QRCodeSVG value={verifyUrl} size={140} level="H"
              imageSettings={logo ? { src: logo, height: 30, width: 30, excavate: true } : undefined} />
            <p style={{ fontSize: 9, color: '#94a3b8', marginTop: 6 }}>Scan to verify authenticity</p>
          </div>

          {/* Footer */}
          <div className="foot" style={{ background: '#f8faff', padding: 10, textAlign: 'center', fontSize: 9, color: '#94a3b8', borderTop: '1px solid #e2e8f0' }}>
            © {new Date().getFullYear()} {schoolName}
          </div>
        </div>

        {/* Buttons outside receipt */}
        <div className="flex gap-3 mt-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>
            Close
          </button>
          <button onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white btn-brand">
            <Download size={14} /> Download
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────────────── */
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

  // Fetch fresh profile so image is up-to-date
  useEffect(() => {
    api.get<ApiResponse<any>>(endpoints.student.profile)
      .then((r) => setCurrentUser((u: any) => ({ ...u, image: r.data?.image ?? u?.image })))
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
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [session, term]);

  const handlePay = async () => {
    setPaying(true);
    try {
      const r = await api.post<ApiResponse<{ authorization_url: string }>>(
        endpoints.student.schoolFeesInit, { session, term }
      );
      window.location.href = r.data.authorization_url;
    } catch (e: any) {
      toast.error(e?.message || 'Failed to initialize payment');
    } finally { setPaying(false); }
  };

  const statusConfig = {
    SUCCESS:  { icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Paid' },
    PENDING:  { icon: Clock,        color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Pending' },
    FAILED:   { icon: XCircle,      color: 'text-red-600',   bg: 'bg-red-50',   border: 'border-red-200',   label: 'Failed' },
    not_paid: { icon: CreditCard,   color: 'text-gray-500',  bg: 'bg-gray-50',  border: 'border-gray-200',  label: 'Not Paid' },
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">School Fees</h1>

      <div className="flex flex-wrap gap-3">
        <select value={session} onChange={(e) => setSession(e.target.value)}
          className="border border-gray-300 rounded-xl px-4 py-2 text-sm text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white shadow-sm">
          {sessions.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
        </select>
        <select value={term} onChange={(e) => setTerm(e.target.value)}
          className="border border-gray-300 rounded-xl px-4 py-2 text-sm text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white shadow-sm">
          {TERMS.map((t) => <option key={t} value={t}>{t} Term</option>)}
        </select>
      </div>

      {loading ? <LoadingState message="Loading fee status…" /> : !data ? (
        <EmptyState icon={CreditCard} message="No fee information available for this period." />
      ) : (
        <>
          {/* Fee status card */}
          {(() => {
            const cfg = statusConfig[data.payment_status] ?? statusConfig.not_paid;
            const Icon = cfg.icon;
            return (
              <div className={clsx('bg-white rounded-2xl card border p-6 shadow-sm', cfg.border)}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className={clsx('w-12 h-12 rounded-2xl flex items-center justify-center', cfg.bg)}>
                      <Icon size={22} className={cfg.color} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">School Fees — {term} Term</p>
                      <p className="text-2xl font-bold text-gray-900 mt-0.5">
                        {data.amount !== null ? `₦${Number(data.amount).toLocaleString()}` : 'Not configured'}
                      </p>
                      {data.description && <p className="text-xs text-gray-500 mt-0.5">{data.description}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={clsx('px-3 py-1 rounded-full text-xs font-bold', cfg.bg, cfg.color)}>{cfg.label}</span>
                    {data.paid_at && <p className="text-xs text-gray-400">Paid {new Date(data.paid_at).toLocaleDateString()}</p>}
                  </div>
                </div>

                {data.payment_status === 'SUCCESS' && data.reference && (
                  <div className="mt-5 pt-5 border-t border-gray-100">
                    <button onClick={() => setReceipt(data.history?.find((h: any) => h.reference === data.reference) ?? { reference: data.reference, amount: data.amount, status: 'SUCCESS', paidAt: data.paid_at, createdAt: data.paid_at })}
                      className="flex items-center gap-2 px-5 py-2 btn-brand text-white rounded-xl text-sm font-semibold cursor-pointer">
                      <Receipt size={15} /> View Receipt
                    </button>
                  </div>
                )}

                {data.fee_configured && data.payment_status !== 'SUCCESS' && (
                  <div className="mt-5 pt-5 border-t border-gray-100">
                    <button onClick={handlePay} disabled={paying}
                      className="flex items-center gap-2 px-6 py-2.5 btn-brand text-white rounded-xl text-sm font-semibold  disabled:opacity-60 transition-colors">
                      <ExternalLink size={15} />
                      {paying ? 'Redirecting…' : data.payment_status === 'PENDING' ? 'Complete Payment' : 'Pay Now'}
                    </button>
                    <p className="text-xs text-gray-400 mt-2">You will be redirected to Paystack to complete your payment securely.</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Payment history */}
          {data.history?.length > 0 && (
            <div className="bg-white rounded-2xl card border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="text-sm font-semibold text-gray-700">Payment History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Reference', 'Amount', 'Status', 'Date', ''].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.history.map((p: any) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.reference}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">₦{Number(p.amount).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold',
                            p.status === 'SUCCESS' ? 'bg-blue-100 text-blue-700' :
                            p.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          )}>{p.status}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          {p.status === 'SUCCESS' && (
                            <button onClick={() => setReceipt(p)}
                              className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:text-blue-700 cursor-pointer">
                              <Receipt size={13} /> Receipt
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {receipt && <ReceiptModal payment={receipt} user={currentUser} school={school} onClose={() => setReceipt(null)} />}
    </div>
  );
}
