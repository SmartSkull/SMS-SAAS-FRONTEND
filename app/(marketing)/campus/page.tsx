'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, MapPin, Search, LocateFixed, Compass, Clock, ChevronRight } from 'lucide-react';
import { LandingShell } from '@/components/landing/LandingShell';
import { searchSchools, normalizeSchoolLogo } from '@/hooks/useSelectedSchool';
import type { SchoolProfile } from '@/types';
import { CAMPUSES } from '@/data/campuses';

const DEMO_SCHOOL: SchoolProfile = {
  id: 'demo', name: 'Smart Campus Demo School', slug: 'florieren-demo',
  slogan: 'A fully interactive campus demo', primaryColor: '#2563eb',
  secondaryColor: '#ffffff', accentColor: '#84cc16', location: 'Akoka, Lagos, Nigeria',
  description: 'Explore a complete campus — buildings, facilities, directions and more.',
};

const UNILAG_SCHOOL: SchoolProfile = {
  id: 'unilag', name: 'University of Lagos', slug: 'unilag',
  slogan: 'Explore UNILAG campus in 3D', primaryColor: '#0d3b66',
  secondaryColor: '#ffffff', accentColor: '#84cc16', location: 'Akoka, Lagos, Nigeria',
  description: 'Nigeria\'s premier university — explore hostels, lecture theatres, the library and more on a real map.',
};

const POPULAR = [
  { icon: '📚', name: 'Central Library', building: 'central-library', school: 'unilag' },
  { icon: '🏛️', name: 'Administration Block', building: 'admin-block', school: 'demo' },
  { icon: '🏠', name: 'Moremi Hall', building: 'moremi-hall', school: 'unilag' },
  { icon: '⚽', name: 'Sports Centre', building: 'sports-centre', school: 'unilag' },
];

export default function CampusExplorerPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [schools, setSchools] = useState<SchoolProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem('campus_recent') || '[]'));
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchSchools(query);
        // always include UNILAG + demo school for a fully functional prototype
        setSchools(query ? [UNILAG_SCHOOL, DEMO_SCHOOL, ...results] : [UNILAG_SCHOOL, DEMO_SCHOOL, ...results]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const enterCampus = (slug: string) => {
    try {
      const next = [slug, ...recent.filter(s => s !== slug)].slice(0, 5);
      localStorage.setItem('campus_recent', JSON.stringify(next));
      setRecent(next);
    } catch { /* noop */ }
    router.push(`/campus/${slug}`);
  };

  const locateMe = () => {
    router.push('/campus/unilag?locate=1');
  };

  return (
    <LandingShell>
      {/* Hero */}
      <section className="relative pt-36 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-700 via-blue-800 to-indigo-900" />
        <div className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] rounded-full bg-indigo-400/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur px-4 py-1.5 text-xs font-bold text-blue-100 mb-6">
            <Compass size={14} /> Interactive Campus Explorer
          </div>
          <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-black text-white leading-tight mb-4">
            Explore your school <span className="text-blue-300">in 3D</span>
          </h1>
          <p className="text-blue-100/80 text-[16px] max-w-xl mx-auto leading-8 mb-8">
            Search for a school, walk its campus, discover buildings and get directions — an immersive virtual tour of any school.
          </p>

          {/* Search */}
          <div className="relative max-w-2xl mx-auto">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search for a school, campus or building..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white shadow-2xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-400/30"
            />
          </div>

          <div className="flex flex-wrap gap-3 justify-center mt-5">
            <button onClick={locateMe} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-bold transition-colors backdrop-blur">
              <LocateFixed size={16} /> Locate Me
            </button>
            <button onClick={() => enterCampus('unilag')} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-blue-700 text-sm font-bold transition-colors">
              Explore Campus <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* School cards */}
      <section className="py-14 px-6 bg-[#eef2f7]">
        <div className="max-w-5xl mx-auto">
          <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-6">Select a school</p>
          {loading ? (
            <p className="text-sm text-gray-500">Searching...</p>
          ) : schools.length === 0 ? (
            <p className="text-sm text-gray-500">No school found. Try another name.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-5">
              {schools.map(school => {
                const logo = normalizeSchoolLogo(school.logo);
                return (
                  <button
                    key={school.slug}
                    onClick={() => enterCampus(school.slug)}
                    className="group text-left bg-white rounded-2xl border border-gray-100 hover:border-blue-300 p-5 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 flex gap-4"
                  >
                    <div className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center overflow-hidden" style={{ backgroundColor: school.primaryColor || '#2563eb' }}>
                      {logo ? <img src={logo} alt="" className="w-full h-full object-cover" /> : <Building2 size={24} className="text-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-gray-900 truncate">{school.name}</h3>
                      {school.location && (
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><MapPin size={11} /> {school.location}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{school.description || school.slogan || 'Multiple campuses and facilities available.'}</p>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 mt-3 group-hover:gap-1.5 transition-all">
                        Explore Campus <ChevronRight size={13} />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Popular + Recent */}
          <div className="grid sm:grid-cols-2 gap-8 mt-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2"><Compass size={14} /> Popular locations</p>
              <div className="grid grid-cols-2 gap-3">
                {POPULAR.map(p => (
                  <button key={p.building} onClick={() => enterCampus(p.school)}
                    className="bg-white rounded-xl border border-gray-100 p-4 text-center hover:border-blue-300 hover:shadow-md transition-all">
                    <span className="text-2xl">{p.icon}</span>
                    <p className="text-xs font-bold text-gray-700 mt-2">{p.name}</p>
                  </button>
                ))}
              </div>
            </div>
            {recent.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2"><Clock size={14} /> Recently viewed</p>
                <div className="space-y-2">
                  {recent.map(slug => (
                    <button key={slug} onClick={() => enterCampus(slug)}
                      className="w-full flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3 hover:border-blue-300 hover:shadow-md transition-all text-sm">
                      <span className="font-semibold text-gray-700">{slug === 'unilag' ? 'University of Lagos' : slug === 'florieren-demo' ? 'Smart Campus Demo School' : slug}</span>
                      <ChevronRight size={14} className="text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </LandingShell>
  );
}
