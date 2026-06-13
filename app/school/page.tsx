'use client';
import { normalizeSchoolLogo, saveSelectedSchool, searchSchools } from '@/hooks/useSelectedSchool';
import type { SchoolProfile } from '@/types';
import { Building2, MapPin, Phone, Search } from 'lucide-react';
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
    <div 
      className="portal-theme min-h-screen flex items-center justify-center p-4 relative w-full overflow-y-auto"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.8)), url('/images/studentgroup2.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#1f1f2e',
      }}
    >
      <div className="w-full max-w-4xl relative z-10 py-10">
        <div className="rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-10" style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)' }}>
          <div className="mb-6 sm:mb-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">School Portal</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Find your school</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Search and select your school before signing in. The portal will use the selected school information from the database.
            </p>
          </div>

          <div className="relative mb-5 sm:mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by school name, city, state, or address"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:h-14"
              autoFocus
            />
          </div>

          <div className="grid gap-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            {loading && <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Searching...</div>}

            {!loading && schools.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 sm:p-6">
                <p>No school found. Try a different name or location.</p>
                <Link href="/school/register" className="mt-4 inline-flex w-full justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 sm:w-auto">
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
                  className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md sm:flex-row sm:items-center"
                >
                  <div className="flex w-full items-start gap-3 sm:w-auto sm:items-center sm:gap-4">
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-white sm:h-16 sm:w-16"
                      style={{ backgroundColor: school.primaryColor }}
                    >
                      {logo ? <img src={logo} alt="" className="h-full w-full rounded-lg object-cover" /> : <Building2 size={26} />}
                    </div>
                    <div className="min-w-0 flex-1 sm:hidden">
                      <h2 className="break-words text-base font-bold leading-snug text-slate-950">{school.name}</h2>
                      {school.slogan && <p className="mt-1 text-sm leading-5 text-slate-500">{school.slogan}</p>}
                    </div>
                  </div>

                  <div className="hidden min-w-0 flex-1 sm:block">
                    <h2 className="truncate text-base font-bold text-slate-950">{school.name}</h2>
                    {school.slogan && <p className="mt-1 truncate text-sm text-slate-500">{school.slogan}</p>}
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                      {school.location && <span className="inline-flex min-w-0 items-center gap-1"><MapPin size={13} className="shrink-0" /><span className="truncate">{school.location}</span></span>}
                      {school.telephone && <span className="inline-flex items-center gap-1"><Phone size={13} />{school.telephone}</span>}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-slate-500 sm:hidden">
                    {school.location && <span className="inline-flex min-w-0 items-center gap-1"><MapPin size={13} className="shrink-0" /><span className="break-words">{school.location}</span></span>}
                    {school.telephone && <span className="inline-flex items-center gap-1"><Phone size={13} />{school.telephone}</span>}
                  </div>

                  <span className="inline-flex w-full justify-center rounded-lg px-3 py-2 text-xs font-bold text-white cursor-pointer sm:w-auto sm:shrink-0" style={{ backgroundColor: school.primaryColor }}>
                    Select
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
