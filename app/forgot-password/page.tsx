'use client';
import { api, endpoints } from '@/lib/api';
import studentBg from '@/public/student.png';
import { ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useSelectedSchool } from '@/hooks/useSelectedSchool';

export default function ForgotPasswordPage() {
  const { school } = useSelectedSchool();
  const primary = school?.primaryColor || '#1d4ed8';
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post(endpoints.auth.forgotPassword, { email });
      setSent(true);
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative w-full"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.8)), url('${studentBg.src}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#1f1f2e',
      }}
    >
      <div className="w-full max-w-md relative z-10">
        <div className="rounded-3xl overflow-hidden shadow-2xl p-8" style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)' }}>
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Mail size={24} />
          </div>

          {sent ? (
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-900">Check your email</h1>
              <p className="mt-2 text-sm text-slate-600">
                If <strong>{email}</strong> is registered, a 6-digit reset code has been sent. It expires in 15 minutes.
              </p>
              <Link
                href={`/reset-password?email=${encodeURIComponent(email)}`}
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: primary }}
              >
                Enter reset code
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-900 text-center">Forgot password?</h1>
              <p className="mt-2 text-sm text-slate-600 text-center">
                Enter your email address and we&apos;ll send you a reset code.
              </p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 shadow-lg shadow-blue-100"
                  style={{ backgroundColor: primary }}
                >
                  {loading ? 'Sending…' : 'Send reset code'}
                </button>
              </form>
            </>
          )}

          <Link 
            href="/login" 
            className="mt-6 flex items-center justify-center gap-2 text-sm font-bold hover:underline transition-all"
            style={{ color: primary }}
          >
            <ArrowLeft size={16} /> Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
