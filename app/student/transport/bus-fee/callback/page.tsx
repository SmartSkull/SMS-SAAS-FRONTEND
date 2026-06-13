'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, endpoints } from '@/lib/api';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function BusFeeCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');

  useEffect(() => {
    const reference = params.get('reference') || params.get('trxref');
    if (!reference) { setStatus('failed'); return; }
    api.post<any>(endpoints.student.transportBusFeeVerify(reference))
      .then(r => setStatus(r.data?.status === 'SUCCESS' ? 'success' : 'failed'))
      .catch(() => setStatus('failed'));
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center gap-4">
      {status === 'loading' && (
        <>
          <Loader2 size={48} className="text-purple-500 animate-spin" />
          <p className="text-gray-600 font-medium">Verifying your payment…</p>
        </>
      )}
      {status === 'success' && (
        <>
          <CheckCircle2 size={56} className="text-green-500" />
          <h2 className="text-xl font-bold text-gray-900">Bus Fee Paid!</h2>
          <p className="text-gray-500 text-sm">Your bus fee payment was successful.</p>
          <button onClick={() => router.push('/student/transport')}
            className="mt-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl font-semibold text-sm hover:bg-purple-700">
            Back to Transport
          </button>
        </>
      )}
      {status === 'failed' && (
        <>
          <XCircle size={56} className="text-red-400" />
          <h2 className="text-xl font-bold text-gray-900">Payment Failed</h2>
          <p className="text-gray-500 text-sm">Your payment could not be verified. Please try again.</p>
          <button onClick={() => router.push('/student/transport')}
            className="mt-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl font-semibold text-sm hover:bg-purple-700">
            Back to Transport
          </button>
        </>
      )}
    </div>
  );
}
