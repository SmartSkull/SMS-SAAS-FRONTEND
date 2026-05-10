'use client';
import { useEffect, useState } from 'react';
import { User, Users, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, getImageUrl } from '@/lib/api';

interface StaffMember {
  id: string;
  name: string;
  image: string | null;
  role: string;
  subject: string | null;
  class: string | null;
  bio: string | null;
}

export default function OurStaffPage() {
  const [staff, setStaff]     = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [meta, setMeta]       = useState({ total: 0, pages: 1 });
  const PER_PAGE = 12;

  const load = (p: number) => {
    setLoading(true);
    api.get<any>('/public/staff', { page: p, limit: PER_PAGE })
      .then((r) => { setStaff(r.data ?? []); setMeta(r.meta ?? { total: 0, pages: 1 }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []);

  const goTo = (p: number) => { setPage(p); load(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const filtered = staff.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.subject ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white">

      {/* Hero */}
      <section className="relative overflow-hidden py-24 px-4 text-center"
        style={{ background: 'linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 50%,#0ea5e9 100%)' }}>
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest">
            <Users size={13} /> Our Team
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4">
            Meet the People<br />Behind Our Success
          </h1>
          <p className="text-white/70 text-lg">
            Dedicated educators committed to nurturing every student's potential.
          </p>
        </div>
      </section>

      {/* Search */}
      <section className="py-10 px-4 max-w-xl mx-auto">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or subject…"
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all"
          />
        </div>
      </section>

      {/* Grid */}
      <section className="pb-20 px-4 max-w-6xl mx-auto">
        {loading ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-gray-100 animate-pulse h-64" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p>{search ? 'No staff match your search.' : 'No staff profiles available yet.'}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map((s) => {
              const img = getImageUrl(s.image);
              return (
                <div key={s.id}
                  className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                  {/* Photo */}
                  <div className="relative h-48 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center overflow-hidden">
                    {img ? (
                      <img src={img} alt={s.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-blue-100 border-4 border-white shadow flex items-center justify-center">
                        <User size={32} className="text-blue-400" />
                      </div>
                    )}
                    {/* Role badge */}
                    <span className="absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full text-white"
                      style={{ background: s.role === 'Administrator' ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}>
                      {s.role}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 text-sm truncate">{s.name}</h3>
                    {s.subject && (
                      <p className="text-blue-600 text-xs font-medium mt-0.5">{s.subject}</p>
                    )}
                    {s.class && (
                      <p className="text-gray-400 text-xs mt-0.5">Class: {s.class}</p>
                    )}
                    {s.bio && (
                      <p className="text-gray-500 text-xs mt-2 line-clamp-2 leading-relaxed">{s.bio}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!search && meta.pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button onClick={() => goTo(page - 1)} disabled={page === 1}
              className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors">
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: meta.pages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => goTo(p)}
                className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all ${
                  p === page ? 'text-white shadow-md' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
                style={p === page ? { background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' } : {}}>
                {p}
              </button>
            ))}
            <button onClick={() => goTo(page + 1)} disabled={page === meta.pages}
              className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
        {!search && meta.total > 0 && (
          <p className="text-center text-gray-400 text-xs mt-3">
            Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, meta.total)} of {meta.total} staff
          </p>
        )}
      </section>

      {/* CTA */}
      <section className="py-16 px-4 text-center"
        style={{ background: 'linear-gradient(135deg,#eff6ff,#e0f2fe)' }}>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-3">Join Our Team</h2>
        <p className="text-gray-500 mb-6 max-w-md mx-auto text-sm">
          We're always looking for passionate educators to join our growing family.
        </p>
        <a href="/contact"
          className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-white text-sm font-semibold btn-brand">
          Get in Touch →
        </a>
      </section>

    </div>
  );
}
