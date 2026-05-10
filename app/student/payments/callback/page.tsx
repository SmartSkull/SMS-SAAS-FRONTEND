'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api, endpoints } from '@/lib/api';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function PaymentCallback() {
  const params    = useSearchParams();
  const router    = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [detail, setDetail] = useState<{ amount?: number; reference?: string }>({});

  useEffect(() => {
    const reference = params.get('reference') || params.get('trxref');
    if (!reference) { setStatus('failed'); return; }

    api.post<any>(endpoints.student.schoolFeesVerify(reference))
      .then((r) => {
        setDetail({ amount: r.data?.amount, reference: r.data?.reference });
        setStatus(r.data?.status === 'SUCCESS' ? 'success' : 'failed');
      })
      .catch(() => setStatus('failed'));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl card shadow-sm border border-gray-100 p-10 max-w-sm w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 size={48} className="text-blue-500 animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900">Verifying payment…</h2>
            <p className="text-sm text-gray-400 mt-1">Please wait</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Payment Successful!</h2>
            {detail.amount && (
              <p className="text-2xl font-bold text-blue-600 mt-2">
                ₦{Number(detail.amount).toLocaleString()}
              </p>
            )}
            {detail.reference && (
              <p className="text-xs text-gray-400 mt-1 font-mono">{detail.reference}</p>
            )}
            <button onClick={() => router.push('/student/payments')}
              className="mt-6 w-full py-2.5 btn-brand text-white rounded-xl text-sm font-semibold ">
              View Payment History
            </button>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <XCircle size={32} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Payment Failed</h2>
            <p className="text-sm text-gray-500 mt-1">Your payment could not be verified. Please try again.</p>
            <button onClick={() => router.push('/student/payments')}
              className="mt-6 w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700">
              Back to Payments
            </button>
          </>
        )}
      </div>
    </div>
  );
}
