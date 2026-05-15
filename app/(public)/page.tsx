'use client';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { normalizeSchoolLogo, useSelectedSchool } from '@/hooks/useSelectedSchool';

export default function HomePage() {
  const { school } = useSelectedSchool();
  const logo = normalizeSchoolLogo(school?.logo);
  const primary = school?.primaryColor ?? '#14532d';
  const accent = school?.accentColor ?? '#bef264';

  if (!school) {
    return (
      <main className="bg-white">
        <section className="px-4 py-24 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <Building2 size={34} />
          </div>
          <h1 className="mx-auto max-w-2xl text-4xl font-extrabold text-slate-950">Select your school to open its portal</h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-500">
            School name, logo, colors, contact details, and public information are loaded from the database after selection.
          </p>
          <Link href="/school" className="mt-8 inline-flex rounded-xl bg-blue-700 px-8 py-3 text-sm font-bold text-white hover:bg-blue-800">
            Find your school
          </Link>
        </section>
      </main>
    );
  }

  return (
    <div>
      <section className="relative text-white py-24 px-4 overflow-hidden" style={{ background: `linear-gradient(135deg, ${primary}, #111827)` }}>
        <div className="absolute inset-0 opacity-5">
          {logo ? <img src={logo} alt="" className="h-full w-full object-contain" /> : null}
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          {logo ? (
            <img src={logo} alt={`${school.name} logo`} className="w-24 h-24 rounded-full object-cover mx-auto mb-6 ring-4 ring-white/20" />
          ) : (
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white/10 text-4xl font-bold ring-4 ring-white/20">
              {school.name.charAt(0)}
            </div>
          )}
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight">{school.name}</h1>
          <p className="text-white/75 text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            {school.slogan || school.motto || 'Welcome to the school portal.'}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/admissions" className="px-8 py-3 font-bold rounded-xl transition-colors" style={{ backgroundColor: accent, color: primary }}>
              Apply Now
            </Link>
            <Link href="/login" className="px-8 py-3 border border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors">
              Login
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 px-4">
        <div className="max-w-5xl mx-auto grid gap-6 md:grid-cols-3">
          {[
            { label: 'Location', value: school.location || [school.city, school.state, school.country].filter(Boolean).join(', ') },
            { label: 'Contact', value: school.telephone || school.contact?.phone },
            { label: 'Email', value: school.contact?.email || school.email },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{value || 'Not provided'}</p>
            </div>
          ))}
        </div>
      </section>

      {school.description && (
        <section className="bg-gray-50 py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">About Our School</h2>
            <p className="text-gray-500 leading-7">{school.description}</p>
          </div>
        </section>
      )}
    </div>
  );
}
