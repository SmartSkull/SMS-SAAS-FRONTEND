'use client';
import { Images } from 'lucide-react';
import { normalizeSchoolLogo, useSelectedSchool } from '@/hooks/useSelectedSchool';

export default function GalleryPage() {
  const { school } = useSelectedSchool();
  const logo = normalizeSchoolLogo(school?.logo);
  const primary = school?.primaryColor ?? '#1d4ed8';

  return (
    <div className="bg-white">
      <section className="relative overflow-hidden py-24 px-4 text-center" style={{ background: `linear-gradient(135deg,${primary},#111827)` }}>
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest">
            <Images size={13} /> Gallery
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4">
            Life at {school?.name ?? 'Our School'}
          </h1>
          <p className="text-white/70 text-lg">A glimpse into the school community.</p>
        </div>
      </section>

      <section className="py-20 px-4 max-w-4xl mx-auto">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center">
          {logo ? <img src={logo} alt={`${school?.name ?? 'School'} logo`} className="mx-auto mb-6 h-28 w-28 rounded-full object-cover" /> : <Images className="mx-auto mb-6 text-slate-300" size={64} />}
          <h2 className="text-2xl font-bold text-slate-950">Gallery content is school-managed</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
            Add database-backed gallery records later to show photos per selected school without hardcoded external asset paths.
          </p>
        </div>
      </section>
    </div>
  );
}
