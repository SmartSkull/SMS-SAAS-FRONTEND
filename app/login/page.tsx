'use client';
import { useLogin } from '@/hooks/useLogin';
import { normalizeSchoolLogo, useSelectedSchool } from '@/hooks/useSelectedSchool';
import { getImageUrl } from '@/lib/api';
import type { Role } from '@/types';
import clsx from 'clsx';
import { BookOpen, Eye, EyeOff, GraduationCap, MessageSquare, Search, Shield, ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const TABS: { id: Role; label: string; icon: React.ComponentType<{ size?: number | string }> }[] = [
  { id: 'student', label: 'Student', icon: GraduationCap },
  { id: 'staff', label: 'Staff', icon: Users },
  { id: 'admin', label: 'Admin', icon: ShieldCheck },
];

/* ──────────────────────────────────────────────────────────────
   KNOWLEDGE BUBBLES
   Float from the bottom to the top of the right panel carrying
   educational facts across different school subjects.
────────────────────────────────────────────────────────────── */
const FACTS = [
  '1 + 1 = 2',
  'A noun is a name of a person, place or thing',
  'CO₂ is Carbon Dioxide',
  'Water boils at 100°C',
  'The Earth orbits the Sun',
  'Photosynthesis makes food for plants',
  'H₂O is the formula for water',
  'Africa has 54 countries',
  'The speed of light is 3×10⁸ m/s',
  'Shakespeare wrote Hamlet',
  'Gravity pulls objects downward',
  'DNA carries genetic information',
  'Nigeria gained independence in 1960',
  'The heart pumps blood around the body',
  '2 × 2 = 4',
  'An adjective describes a noun',
  'The Amazon is the world\'s largest rainforest',
  'Sound travels at 343 m/s in air',
  'Chlorophyll gives leaves their green colour',
  'A verb is an action word',
  '3² = 9',
  'Mammals are warm-blooded',
  'The Sahara is the largest hot desert',
  'Osmosis is movement of water across a membrane',
  'A triangle has 3 sides',
  'NaCl is table salt',
  'Romeo and Juliet is a tragedy',
  'Mitosis produces identical cells',
  'The Pacific Ocean is the largest ocean',
  'π ≈ 3.14159',
  'Light travels faster than sound',
  'A polygon has straight sides',
  'Prokaryotes have no nucleus',
  'An ecosystem includes living and non-living things',
  'Alliteration repeats initial consonant sounds',
];

interface Bubble {
  id: number;
  text: string;
  left: number;       // % from left
  size: number;       // px diameter
  duration: number;   // animation seconds
  delay: number;      // animation delay seconds
  opacity: number;
}

function BubbleField() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  useEffect(() => {
    // Start with just 5 bubbles, staggered so they're already mid-flight
    const initial: Bubble[] = Array.from({ length: 5 }, (_, i) => ({
      id: i,
      text: FACTS[(i * 6) % FACTS.length],
      left: 8 + i * 17,          // evenly spread: 8, 25, 42, 59, 76
      size: 80 + (i % 3) * 25,   // 80, 105, 130, 80, 105
      duration: 16 + i * 3,
      delay: -(4 + i * 3),       // already in progress
      opacity: 0.20 + (i % 3) * 0.06,
    }));
    setBubbles(initial);

    // Add one new bubble every 7 seconds
    let counter = 5;
    const interval = setInterval(() => {
      setBubbles(prev => {
        const fact = FACTS[counter % FACTS.length];
        counter++;
        const size = 80 + Math.floor(Math.random() * 60); // 80–140px
        // Keep bubble fully inside: max left = 100 - size/containerWidth*100
        // Approximate container as 50vw → size/(.5vw). Simpler: clamp to 75%
        const maxLeft = Math.max(5, 78 - Math.round((size / 600) * 100));
        const left = 5 + Math.floor(Math.random() * maxLeft);
        const next = [
          ...prev,
          {
            id: counter,
            text: fact,
            left,
            size,
            duration: 15 + Math.floor(Math.random() * 10),
            delay: 0,
            opacity: 0.20 + Math.random() * 0.22,
          },
        ];
        return next.slice(-8); // never more than 8 at once
      });
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <style>{`
        @keyframes bubbleRise {
          0%   { transform: translateY(0) scale(1);    opacity: var(--op); }
          12%  { opacity: calc(var(--op) * 1.3); }
          80%  { opacity: var(--op); }
          100% { transform: translateY(-105vh) scale(0.8); opacity: 0; }
        }
      `}</style>
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
        {bubbles.map(b => (
          <div
            key={b.id}
            className="absolute bottom-0 rounded-full flex items-center justify-center text-center"
            style={{
              left: `${b.left}%`,
              width:  b.size,
              height: b.size,
              '--op': b.opacity,
              background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.20), rgba(255,255,255,0.05))`,
              border: '1px solid rgba(255,255,255,0.18)',
              backdropFilter: 'blur(2px)',
              animation: `bubbleRise ${b.duration}s linear ${b.delay}s both`,
              padding: '8px',
            } as React.CSSProperties}
          >
            <span
              className="font-semibold leading-tight select-none"
              style={{
                fontSize: b.size < 90 ? '9px' : b.size < 120 ? '10px' : '11px',
                color: 'rgba(255,255,255,0.82)',
                textShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }}
            >
              {b.text}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

export default function LoginPage() {
  const { tab, switchTab, loading, form, setForm, loginId, setLoginId, suggestions, showSug, setShowSug, handleIdChange, handleSubmit } = useLogin();
  const { school } = useSelectedSchool();
  const [showPw, setShowPw] = useState(false);
  const sugRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/null/dashboard') {
      document.cookie = 'gka_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      document.cookie = 'gka_refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      document.cookie = 'gka_user=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      document.cookie = 'gka_role=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      window.location.replace('/login');
    }
  }, [pathname]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (sugRef.current && !sugRef.current.contains(event.target as Node)) setShowSug(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [setShowSug]);

  if (!school) {
    return (
      <div className="portal-theme min-h-screen w-full flex">
        {/* Left side - School selection message (50% width on desktop) */}
        <div className="w-full lg:w-1/2 min-h-screen bg-white flex flex-col p-4 lg:p-8 lg:overflow-y-auto">
          <div className="w-full max-w-md mx-auto my-auto py-6 lg:py-10">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Search size={24} />
            </div>
            <h1 className="text-2xl font-bold text-slate-950 text-center">Choose your school first</h1>
            <p className="mt-2 text-sm text-slate-500 text-center">
              Your portal branding and login access are loaded from the selected school profile.
            </p>
            <Link href="/school" className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800">
              Search for school
            </Link>
          </div>
        </div>

        {/* Right side - Background image (50% width on desktop, hidden on mobile) */}
        <div className="hidden lg:block lg:w-1/2 min-h-screen relative">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('/images/studentgroup2.jpg')`,
            }}
          />
          <div className="absolute inset-0 bg-black/80" />
          <BubbleField />
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

  const logo = normalizeSchoolLogo(school.logo);
  const primary = school.primaryColor || '#1d4ed8';
  const secondary = school.secondaryColor || '#eff6ff';
  const accent = school.accentColor || '#84cc16';
  const idLabel = tab === 'student' ? 'Student Name or ID' : tab === 'staff' ? 'Staff Name or ID' : 'Admin ID';
  const idPlaceholder = tab === 'student' ? 'e.g. David Emmanuel' : tab === 'staff' ? 'e.g. John Smith or STF001' : 'e.g. ADM001';

  return (
    <div className="portal-theme min-h-screen w-full flex">
      {/* Left side - Login form (50% width on desktop) */}
      <div className="w-full lg:w-1/2 min-h-screen bg-white flex flex-col p-4 lg:p-8 lg:overflow-y-auto">
        <div className="w-full max-w-md mx-auto my-auto py-6 lg:py-10">
          {/* School Header */}
          <div className="mb-8">
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
                      const imgUrl = getImageUrl(s.image);
                      return (
                        <button
                          key={id}
                          type="button"
                          onMouseDown={() => {
                            // preserve the entered name for display, but store the selected unique ID for login
                            setForm((prev) => ({ ...prev, id: fullName }));
                            setLoginId(id);
                            setShowSug(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden bg-gray-100 border border-gray-200">
                            {imgUrl ? (
                              <img src={imgUrl} alt={fullName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs font-bold">
                                {fullName.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-900 text-sm font-medium truncate">{fullName}</p>
                            {subtitle && <p className="text-gray-400 text-xs truncate">{subtitle}</p>}
                            <p className="text-gray-400 text-[11px] font-mono truncate">ID: {id}</p>
                          </div>
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

      {/* Right side - Background image (50% width on desktop, hidden on mobile) */}
      <div className="hidden lg:block lg:w-1/2 min-h-screen relative">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/images/studentgroup2.jpg')`,
          }}
        />
        <div className="absolute inset-0 bg-black/80" />
        <BubbleField />
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
