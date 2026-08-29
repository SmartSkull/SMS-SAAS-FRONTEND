'use client';
import { normalizeSchoolLogo, saveSelectedSchool, searchSchools } from '@/hooks/useSelectedSchool';
import type { SchoolProfile } from '@/types';
import { Building2, MapPin, Phone, Search, BookOpen, Shield, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function SchoolSearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [schools, setSchools] = useState<SchoolProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        setSchools(await searchSchools(query));
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const selectSchool = (school: SchoolProfile) => {
    saveSelectedSchool(school);
    router.push('/login');
  };

  return (
    <div className="portal-theme min-h-screen w-full flex">
      {/* Left side - Authentication form (50% width on desktop) */}
      <div className="w-full lg:w-1/2 min-h-screen bg-white flex flex-col p-4 lg:p-8 lg:overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto py-6 lg:py-10">
          <div className="mb-6 lg:mb-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">School Portal</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 lg:text-3xl">Find your school</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Search and select your school before signing in. The portal will use the selected school information from the database.
            </p>
          </div>

          <div className="relative mb-5 lg:mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by school name, city, state, or address"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 lg:h-14"
              autoFocus
            />
          </div>

          <div className="grid gap-3 max-h-[60vh] lg:max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {loading && <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Searching...</div>}

            {!loading && schools.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 lg:p-6">
                <p>No school found. Try a different name or location.</p>
                <Link href="/school/register" className="mt-4 inline-flex w-full justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 lg:w-auto">
                  Register your school
                </Link>
              </div>
            )}

            {schools.map((school) => {
              const logo = normalizeSchoolLogo(school.logo);
              return (
                <button
                  key={school.slug}
                  type="button"
                  onClick={() => selectSchool(school)}
                  className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md lg:flex-row lg:items-center"
                >
                  <div className="flex w-full items-start gap-3 lg:w-auto lg:items-center lg:gap-4">
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-white lg:h-16 lg:w-16"
                      style={{ backgroundColor: school.primaryColor }}
                    >
                      {logo ? <img src={logo} alt="" className="h-full w-full rounded-lg object-cover" /> : <Building2 size={26} />}
                    </div>
                    <div className="min-w-0 flex-1 lg:hidden">
                      <h2 className="break-words text-base font-bold leading-snug text-slate-950">{school.name}</h2>
                      {school.slogan && <p className="mt-1 text-sm leading-5 text-slate-500">{school.slogan}</p>}
                    </div>
                  </div>

                  <div className="hidden min-w-0 flex-1 lg:block">
                    <h2 className="truncate text-base font-bold text-slate-950">{school.name}</h2>
                    {school.slogan && <p className="mt-1 truncate text-sm text-slate-500">{school.slogan}</p>}
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                      {school.location && <span className="inline-flex min-w-0 items-center gap-1"><MapPin size={13} className="shrink-0" /><span className="truncate">{school.location}</span></span>}
                      {school.telephone && <span className="inline-flex items-center gap-1"><Phone size={13} />{school.telephone}</span>}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-slate-500 lg:hidden">
                    {school.location && <span className="inline-flex min-w-0 items-center gap-1"><MapPin size={13} className="shrink-0" /><span className="break-words">{school.location}</span></span>}
                    {school.telephone && <span className="inline-flex items-center gap-1"><Phone size={13} />{school.telephone}</span>}
                  </div>

                  <span className="inline-flex w-full justify-center rounded-lg px-3 py-2 text-xs font-bold text-white cursor-pointer lg:w-auto lg:shrink-0" style={{ backgroundColor: school.primaryColor }}>
                    Select
                  </span>
                </button>
              );
            })}
          </div>
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
