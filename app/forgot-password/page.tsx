'use client';
import { api, endpoints } from '@/lib/api';
import studentBg from '@/public/student.png';
import { ArrowLeft, BookOpen, Mail, MessageSquare, Shield } from 'lucide-react';
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
    <div className="min-h-screen w-full flex">
      {/* Left side - Forgot password form (50% width on desktop) */}
      <div className="w-full lg:w-1/2 min-h-screen bg-white flex flex-col p-4 lg:p-8 lg:overflow-y-auto">
        <div className="w-full max-w-md mx-auto my-auto py-6 lg:py-10">
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
