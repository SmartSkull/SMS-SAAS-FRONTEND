'use client';
import { useLogin } from '@/hooks/useLogin';
import { normalizeSchoolLogo, useSelectedSchool } from '@/hooks/useSelectedSchool';
import clsx from 'clsx';
import { Eye, EyeOff, GraduationCap, Search, ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Role } from '@/types';

const TABS: { id: Role; label: string; icon: React.ElementType }[] = [
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
  const idLabel = tab === 'student' ? 'Student Name or ID' : tab === 'staff' ? 'Staff Name or ID' : 'Admin ID';
  const idPlaceholder = tab === 'student' ? 'e.g. David Emmanuel' : tab === 'staff' ? 'e.g. John Smith or STF001' : 'e.g. ADM001';

  return (
    <div 
      className="portal-theme min-h-screen flex items-center justify-center p-4 relative w-full"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.8)), url('/images/studentgroup2.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#1f1f2e',
      }}
    >
      <div className="w-full max-w-2xl relative z-10">
        <div className="rounded-3xl overflow-hidden shadow-2xl" style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)' }}>
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              {logo ? (
                <img src={logo} alt={`${school.name} logo`} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="flex w-10 h-10 items-center justify-center rounded-full bg-gray-100 text-lg font-bold text-gray-900">
                  {school.name.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <p className="text-gray-900 font-bold text-sm">{school.name}</p>
                {school.slogan && <p className="text-gray-600 text-xs">{school.slogan}</p>}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-8">
            <h1 className="text-gray-900 text-3xl font-bold mb-2">
              Welcome back <span className="animate-wave">👋</span>
            </h1>
            <p className="text-gray-600 text-sm mb-8">Enter your details to login</p>

            {/* Role Tabs */}
            <div className="flex gap-3 mb-8">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => switchTab(id)}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all',
                    tab === id 
                      ? 'text-white' 
                      : 'text-gray-600 hover:text-gray-900',
                  )}
                  style={
                    tab === id 
                      ? { background: primary, boxShadow: `0 4px 15px ${primary}55` }
                      : {}
                  }
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* ID Input */}
              <div>
                <label className="text-gray-600 text-xs font-semibold uppercase tracking-wider block mb-2">{idLabel}</label>
                <div className="relative" ref={sugRef}>
                  <input
                    type="text"
                    placeholder={idPlaceholder}
                    value={form.id}
                    onChange={(event) => handleIdChange(event.target.value)}
                    onFocus={(event) => {
                      event.currentTarget.style.borderColor = primary;
                      event.currentTarget.style.background = 'rgba(241, 245, 249, 0.8)';
                      if (suggestions.length > 0) setShowSug(true);
                    }}
                    onBlur={(event) => {
                      event.currentTarget.style.borderColor = 'rgba(229, 231, 235, 0.8)';
                      event.currentTarget.style.background = 'rgba(249, 250, 251, 0.8)';
                    }}
                    required
                    autoComplete="off"
                    className="w-full rounded-lg px-4 py-3.5 text-gray-900 text-sm placeholder-gray-400 focus:outline-none transition-all"
                    style={{ 
                      background: 'rgba(249, 250, 251, 0.8)', 
                      border: '1px solid rgba(229, 231, 235, 0.8)',
                      color: '#111827'
                    }}
                  />
                  {showSug && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-y-auto z-50 shadow-2xl" style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', maxHeight: '220px' }}>
                      {suggestions.map((s) => {
                        const isStaff = tab === 'staff';
                        const fullName = [s.firstname, s.lastname].filter(Boolean).join(' ');
                        const id = isStaff ? s.staff_id : s.student_id;
                        const subtitle = isStaff ? s.role : s.class;
                        return (
                          <button
                            key={id}
                            type="button"
                            onMouseDown={() => {
                              // Staff login uses the ID; student login uses the full name
                              setForm((prev) => ({ ...prev, id: isStaff ? id : fullName }));
                              setShowSug(false);
                            }}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 transition-colors text-left"
                          >
                            <div>
                              <p className="text-gray-900 text-sm font-medium">{fullName}</p>
                              {subtitle && <p className="text-gray-400 text-xs">{subtitle}</p>}
                            </div>
                            <span className="text-gray-400 text-xs font-mono">{id}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="text-gray-600 text-xs font-semibold uppercase tracking-wider block mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                    required
                    className="w-full rounded-lg px-4 py-3.5 text-gray-900 text-sm placeholder-gray-400 focus:outline-none transition-all"
                    style={{ 
                      background: 'rgba(249, 250, 251, 0.8)', 
                      border: '1px solid rgba(229, 231, 235, 0.8)',
                      color: '#111827'
                    }}
                    onFocus={(event) => { 
                      event.currentTarget.style.borderColor = primary; 
                      event.currentTarget.style.background = 'rgba(241, 245, 249, 0.8)'; 
                    }}
                    onBlur={(event) => { 
                      event.currentTarget.style.borderColor = 'rgba(229, 231, 235, 0.8)'; 
                      event.currentTarget.style.background = 'rgba(249, 250, 251, 0.8)'; 
                    }}
                  />
                  <button type="button" onClick={() => setShowPw((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Keep logged in & Forgot Password */}
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border border-gray-300 bg-white cursor-pointer accent-current"
                    style={{ accentColor: primary }}
                  />
                  <span className="text-gray-600 text-sm">Keep me logged in</span>
                </label>
                <button 
                  type="button" 
                  onClick={() => window.location.href = '/forgot-password'} 
                  className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                  style={{ color: primary }}
                >
                  Forgot Password?
                </button>
              </div>

              {/* Login Button */}
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full py-3.5 rounded-lg text-white font-bold text-sm transition-all disabled:opacity-50 mt-4" 
                style={{ 
                  background: primary, 
                  boxShadow: loading ? 'none' : `0 4px 20px ${primary}66` 
                }}
              >
                {loading
                  ? <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 
                      Logging in...
                    </span>
                  : `Sign in as ${tab.charAt(0).toUpperCase() + tab.slice(1)}`}
              </button>

              {/* Change School Button */}
              <Link 
                href="/school"
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg font-bold text-sm transition-all border mt-2"
                style={{ 
                  borderColor: `${primary}33`,
                  color: primary,
                  backgroundColor: `${primary}05`
                }}
              >
                <Search size={16} />
                Change School
              </Link>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}
