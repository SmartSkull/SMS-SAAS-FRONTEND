'use client';
import { useState, useEffect, useRef } from 'react';
import { useLogin } from '@/hooks/useLogin';
import clsx from 'clsx';
import { Eye, EyeOff, GraduationCap, Users, ShieldCheck } from 'lucide-react';
import type { Role } from '@/types';

type Tab = Role;

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'student', label: 'Student',  icon: GraduationCap },
  { id: 'staff',   label: 'Staff',    icon: Users },
  { id: 'admin',   label: 'Admin',    icon: ShieldCheck },
];

export default function LoginPage() {
  const { tab, switchTab, loading, form, setForm, suggestions, showSug, setShowSug, handleIdChange, handleSubmit } = useLogin();
  const [showPw, setShowPw] = useState(false);
  const sugRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sugRef.current && !sugRef.current.contains(e.target as Node)) setShowSug(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const idLabel       = tab === 'student' ? 'Student Name or ID' : tab === 'staff' ? 'Staff ID' : 'Admin ID';
  const idPlaceholder = tab === 'student' ? 'e.g. David Emmanuel' : tab === 'staff' ? 'e.g. STF001' : 'e.g. ADM001';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #eff6ff 50%, #f0f9ff 100%)' }}>

      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-40 blur-[120px] animate-pulse"
          style={{ background: 'radial-gradient(circle, #93c5fd, transparent)' }} />
        <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-30 blur-[100px] animate-pulse"
          style={{ background: 'radial-gradient(circle, #a5b4fc, transparent)', animationDelay: '1.5s' }} />
        <div className="absolute top-[30%] right-[20%] w-[350px] h-[350px] rounded-full opacity-25 blur-[80px] animate-pulse"
          style={{ background: 'radial-gradient(circle, #7dd3fc, transparent)', animationDelay: '3s' }} />
        <div className="absolute bottom-[20%] left-[15%] w-[250px] h-[250px] rounded-full opacity-20 blur-[60px] animate-pulse"
          style={{ background: 'radial-gradient(circle, #c7d2fe, transparent)', animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-4xl relative z-10">
        {/* Card */}
        <div className="grid lg:grid-cols-5 rounded-3xl overflow-hidden shadow-2xl"
          style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 20px 60px rgba(37,99,235,0.12)' }}>

          {/* ── Left panel (2/5) ── */}
          <div className="hidden lg:flex lg:col-span-2 flex-col items-center justify-between p-10 relative overflow-hidden"
            style={{ background: 'linear-gradient(160deg, #1d4ed8 0%, #1e40af 40%, #1e3a8a 100%)' }}>
            {/* Decorative circles */}
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full border border-white/10" />
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full border border-white/10" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full border border-white/10" />

            <div className="text-center relative z-10">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 rounded-full blur-xl opacity-40"
                  style={{ background: 'radial-gradient(circle, #93c5fd, transparent)' }} />
                <img src="https://florierenparklaneis.com.ng/assets/img/florieren/logo.png"
                  alt="Logo" className="relative w-24 h-24 rounded-full ring-4 ring-white/30 shadow-2xl" />
              </div>
              <h1 className="text-white font-bold text-2xl leading-tight">Florieren Parklane</h1>
              <p className="text-blue-200 text-sm mt-1 font-medium">International School</p>
            </div>

            <div className="space-y-4 relative z-10 w-full">
              {[
                { label: 'Excellence in Education',   sub: 'World-class curriculum' },
                { label: 'Nurturing Future Leaders',  sub: 'Holistic development' },
                { label: 'Building Character',        sub: 'Values-driven learning' },
              ].map(({ label, sub }) => (
                <div key={label} className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3">
                  <div className="w-2 h-2 rounded-full bg-blue-300 shrink-0" />
                  <div>
                    <p className="text-white text-sm font-medium">{label}</p>
                    <p className="text-blue-200/70 text-xs">{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-white/30 text-xs relative z-10">
              © {new Date().getFullYear()} Florieren Parklane IS
            </p>
          </div>

          {/* ── Right panel (3/5) ── */}
          <div className="lg:col-span-3 p-8 lg:p-12 flex flex-col justify-center">
            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-3 mb-8">
              <img src="https://florierenparklaneis.com.ng/assets/img/florieren/logo.png"
                alt="Logo" className="w-10 h-10 rounded-full" />
              <div>
                <p className="text-white font-bold text-sm">Florieren Parklane</p>
                <p className="text-blue-300 text-xs">International School</p>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-gray-900 text-3xl font-bold tracking-tight">Welcome back</h2>
              <p className="text-gray-400 text-sm mt-2">Sign in to access your portal</p>
            </div>

            {/* Role tabs */}
            <div className="flex gap-2 mb-8 p-1 rounded-2xl" style={{ background: 'rgba(241,245,249,0.9)' }}>
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => switchTab(id)}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
                    tab === id
                      ? 'text-white shadow-lg'
                      : 'text-gray-500 hover:text-gray-700',
                  )}
                  style={tab === id ? { background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', boxShadow: '0 4px 15px rgba(59,130,246,0.4)' } : {}}>
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider block mb-2">{idLabel}</label>
                <div className="relative" ref={sugRef}>
                  <input
                    type="text"
                    placeholder={idPlaceholder}
                    value={form.id}
                    onChange={(e) => handleIdChange(e.target.value)}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(59,130,246,0.7)';
                      e.target.style.background = 'rgba(219,234,254,0.9)';
                      if (suggestions.length > 0) setShowSug(true);
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(203,213,225,0.8)';
                      e.target.style.background = 'rgba(241,245,249,0.8)';
                    }}
                    required
                    autoComplete="off"
                    className="w-full rounded-xl px-4 py-3.5 text-gray-900 text-sm placeholder-gray-400 focus:outline-none transition-all"
                    style={{ background: 'rgba(241,245,249,0.8)', border: '1px solid rgba(203,213,225,0.8)' }}
                  />
                  {/* Suggestions dropdown */}
                  {showSug && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50 shadow-2xl"
                      style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                      {suggestions.map((s) => {
                        const fullName = `${s.firstname} ${s.lastname}`;
                        return (
                          <button key={s.student_id} type="button"
                            onMouseDown={() => {
                              setForm((p) => ({ ...p, id: fullName }));
                              setShowSug(false);
                            }}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 transition-colors text-left">
                            <div>
                              <p className="text-gray-900 text-sm font-medium">{fullName}</p>
                              {s.class && <p className="text-gray-400 text-xs">{s.class}</p>}
                            </div>
                            <span className="text-gray-400 text-xs font-mono">{s.student_id}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider block mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    required
                    className="w-full rounded-xl px-4 py-3.5 pr-12 text-gray-900 text-sm placeholder-gray-400 focus:outline-none transition-all"
                    style={{ background: 'rgba(241,245,249,0.8)', border: '1px solid rgba(203,213,225,0.8)' }}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(59,130,246,0.7)'; e.target.style.background = 'rgba(219,234,254,0.9)'; }}
                    onBlur={(e)  => { e.target.style.borderColor = 'rgba(203,213,225,0.8)'; e.target.style.background = 'rgba(241,245,249,0.8)'; }}
                  />
                  <button type="button" onClick={() => setShowPw((s) => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-50 mt-2"
                style={{ background: 'linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%)', boxShadow: loading ? 'none' : '0 4px 20px rgba(59,130,246,0.45)' }}>
                {loading
                  ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in…</span>
                  : `Sign in as ${tab.charAt(0).toUpperCase() + tab.slice(1)}`}
              </button>
            </form>

            <p className="text-white/20 text-xs text-center mt-8">
              Florieren Parklane International School Portal
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
