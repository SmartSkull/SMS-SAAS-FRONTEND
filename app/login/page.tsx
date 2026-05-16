'use client';
import { useLogin } from '@/hooks/useLogin';
import { normalizeSchoolLogo, useSelectedSchool } from '@/hooks/useSelectedSchool';
import type { Role } from '@/types';
import clsx from 'clsx';
import { Eye, EyeOff, GraduationCap, Search, ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type Tab = Role;

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'student', label: 'Student', icon: GraduationCap },
  { id: 'staff', label: 'Staff', icon: Users },
  { id: 'admin', label: 'Admin', icon: ShieldCheck },
];

export default function LoginPage() {
  const { tab, switchTab, loading, form, setForm, suggestions, showSug, setShowSug, handleIdChange, handleSubmit } = useLogin();
  const { school } = useSelectedSchool();
  const [showPw, setShowPw] = useState(false);
  const sugRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (sugRef.current && !sugRef.current.contains(event.target as Node)) setShowSug(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [setShowSug]);

  if (!school) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Search size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-950">Choose your school first</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your portal branding and login access are loaded from the selected school profile.
          </p>
          <Link href="/school" className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800">
            Search for school
          </Link>
        </div>
      </main>
    );
  }

  const logo = normalizeSchoolLogo(school.logo);
  const primary = school.primaryColor || '#1d4ed8';
  const secondary = school.secondaryColor || '#eff6ff';
  const accent = school.accentColor || '#84cc16';
  const idLabel = tab === 'student' ? 'Student Name or ID' : tab === 'staff' ? 'Staff ID' : 'Admin ID';
  const idPlaceholder = tab === 'student' ? 'e.g. David Emmanuel' : tab === 'staff' ? 'e.g. STF001' : 'e.g. ADM001';
  const highlights = [
    { label: school.motto || 'School Portal', sub: school.slogan || '' },
    { label: school.location || 'Campus location', sub: school.website || '' },
    { label: school.contact?.email || school.email || 'Contact school', sub: school.telephone || 'School contact' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${secondary} 0%, #ffffff 50%, ${secondary} 100%)` }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-20 blur-[120px] animate-pulse" style={{ background: `radial-gradient(circle, ${primary}, transparent)` }} />
        <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-20 blur-[100px] animate-pulse" style={{ background: `radial-gradient(circle, ${accent}, transparent)`, animationDelay: '1.5s' }} />
      </div>

      <div className="w-full max-w-4xl relative z-10">
        <div className="grid lg:grid-cols-5 rounded-3xl overflow-hidden shadow-2xl" style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: `0 20px 60px ${primary}22` }}>
          <div className="hidden lg:flex lg:col-span-2 flex-col items-center justify-between p-10 relative overflow-hidden" style={{ background: `linear-gradient(160deg, ${primary} 0%, ${primary} 60%, #111827 100%)` }}>
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full border border-white/10" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full border border-white/10" />

            <div className="text-center relative z-10">
              <div className="relative inline-block mb-6">
                {logo ? (
                  <img src={logo} alt={`${school.name} logo`} className="relative w-24 h-24 rounded-full object-cover ring-4 ring-white/30 shadow-2xl" />
                ) : (
                  <div className="relative flex w-24 h-24 items-center justify-center rounded-full bg-white/15 text-3xl font-bold text-white ring-4 ring-white/30 shadow-2xl">
                    {school.name.charAt(0)}
                  </div>
                )}
              </div>
              <h1 className="text-white font-bold text-2xl leading-tight">{school.name}</h1>
              {school.slogan && <p className="text-white/70 text-sm mt-1 font-medium">{school.slogan}</p>}
            </div>

            <div className="space-y-4 relative z-10 w-full">
              {highlights.map(({ label, sub }) => (
                <div key={label} className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{label}</p>
                    <p className="text-white/60 text-xs truncate">{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-white/35 text-xs relative z-10">© {new Date().getFullYear()} {school.name}</p>
          </div>

          <div className="lg:col-span-3 p-8 lg:p-12 flex flex-col justify-center">
            <div className="flex lg:hidden items-center gap-3 mb-8">
              {logo ? <img src={logo} alt={`${school.name} logo`} className="w-10 h-10 rounded-full object-cover" /> : null}
              <div>
                <p className="text-gray-900 font-bold text-sm">{school.name}</p>
                {school.slogan && <p className="text-gray-500 text-xs">{school.slogan}</p>}
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-gray-900 text-3xl font-bold tracking-tight">Welcome back</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-400">
                <span>Sign in to access your portal</span>
                <Link href="/school" className="font-semibold" style={{ color: primary }}>Change school</Link>
              </div>
            </div>

            <div className="flex gap-2 mb-8 p-1 rounded-2xl" style={{ background: 'rgba(241,245,249,0.9)' }}>
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => switchTab(id)}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer',
                    tab === id ? 'text-white shadow-lg' : 'text-gray-500 hover:text-gray-700',
                  )}
                  style={tab === id ? { background: primary, boxShadow: `0 4px 15px ${primary}55` } : {}}
                >
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
                    onChange={(event) => handleIdChange(event.target.value)}
                    onFocus={(event) => {
                      event.target.style.borderColor = primary;
                      event.target.style.background = secondary;
                      if (suggestions.length > 0) setShowSug(true);
                    }}
                    onBlur={(event) => {
                      event.target.style.borderColor = 'rgba(203,213,225,0.8)';
                      event.target.style.background = 'rgba(241,245,249,0.8)';
                    }}
                    required
                    autoComplete="off"
                    className="w-full rounded-xl px-4 py-3.5 text-gray-900 text-sm placeholder-gray-400 focus:outline-none transition-all"
                    style={{ background: 'rgba(241,245,249,0.8)', border: '1px solid rgba(203,213,225,0.8)' }}
                  />
                  {showSug && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50 shadow-2xl" style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                      {suggestions.map((s) => {
                        const fullName = `${s.firstname} ${s.lastname}`;
                        return (
                          <button
                            key={s.student_id}
                            type="button"
                            onMouseDown={() => {
                              setForm((prev) => ({ ...prev, id: fullName }));
                              setShowSug(false);
                            }}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 transition-colors text-left"
                          >
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
                    onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                    required
                    className="w-full rounded-xl px-4 py-3.5 pr-12 text-gray-900 text-sm placeholder-gray-400 focus:outline-none transition-all"
                    style={{ background: 'rgba(241,245,249,0.8)', border: '1px solid rgba(203,213,225,0.8)' }}
                    onFocus={(event) => { event.target.style.borderColor = primary; event.target.style.background = secondary; }}
                    onBlur={(event) => { event.target.style.borderColor = 'rgba(203,213,225,0.8)'; event.target.style.background = 'rgba(241,245,249,0.8)'; }}
                  />
                  <button type="button" onClick={() => setShowPw((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-50 mt-2" style={{ background: primary, boxShadow: loading ? 'none' : `0 4px 20px ${primary}66` }}>
                {loading
                  ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</span>
                  : `Sign in as ${tab.charAt(0).toUpperCase() + tab.slice(1)}`}
              </button>
            </form>

            <p className="text-gray-300 text-xs text-center mt-8">{school.name} Portal</p>
          </div>
        </div>
      </div>
    </div>
  );
}
