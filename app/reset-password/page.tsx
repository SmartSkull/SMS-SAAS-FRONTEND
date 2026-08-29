'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, endpoints } from '@/lib/api';
import Link from 'next/link';
import { BookOpen, KeyRound, ArrowLeft, Eye, EyeOff, MessageSquare, Shield } from 'lucide-react';
import studentBg from '@/public/student.png';
import { useSelectedSchool } from '@/hooks/useSelectedSchool';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { school } = useSelectedSchool();
  const primary = school?.primaryColor || '#1d4ed8';

  const [email, setEmail] = useState(params.get('email') ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post(endpoints.auth.resetPassword, { email, code, password });
      router.push('/login?reset=1');
    } catch (err: any) {
      setError(err?.message ?? 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left side - Reset password form (50% width on desktop) */}
      <div className="w-full lg:w-1/2 min-h-screen bg-white flex flex-col p-4 lg:p-8 lg:overflow-y-auto">
        <div className="w-full max-w-md mx-auto my-auto py-6 lg:py-10">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <KeyRound size={24} />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 text-center">Reset your password</h1>
          <p className="mt-2 text-sm text-slate-600 text-center">
            Enter the 6-digit code sent to your email and choose a new password.
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

            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1.5">
                Reset code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 tracking-widest text-center font-mono text-lg"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1.5">
                New password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 shadow-lg shadow-blue-100"
              style={{ backgroundColor: primary }}
            >
              {loading ? 'Resetting…' : 'Reset password'}
            </button>
          </form>

          <Link 
            href="/forgot-password" 
            className="mt-6 flex items-center justify-center gap-2 text-sm font-bold hover:underline transition-all"
            style={{ color: primary }}
          >
            <ArrowLeft size={16} /> Resend code
          </Link>
        </div>
      </div>

      {/* Right side - Background image (50% width on desktop, hidden on mobile) */}
      <div className="hidden lg:block lg:w-1/2 min-h-screen relative">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${studentBg.src}')`,
          }}
        />
        <div className="absolute inset-0 bg-black/80" />
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="text-white max-w-md">
            <h2 className="text-3xl font-bold mb-4">Welcome to SmartCampus</h2>
            <p className="text-lg mb-8 text-gray-100">Join thousands of schools using our platform to manage academics, finances, and student life efficiently.</p>
            <div className="space-y-5">
              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mr-4 flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1 text-white">Comprehensive Academic Management</h3>
                  <p className="text-gray-100 text-sm">Manage grades, attendance, timetables, and curriculum all in one place.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mr-4 flex-shrink-0">
                  <Shield className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1 text-white">Secure Financial Transactions</h3>
                  <p className="text-gray-100 text-sm">Process payments, track expenses, and manage school finances securely.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mr-4 flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1 text-white">Real-time Communication Tools</h3>
                  <p className="text-gray-100 text-sm">Connect with parents, staff, and students through instant messaging and notifications.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
