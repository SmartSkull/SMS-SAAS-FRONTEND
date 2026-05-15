'use client';
import { BookOpen, Building2, GraduationCap, Globe, Sparkles, Trophy } from 'lucide-react';
import { useSelectedSchool } from '@/hooks/useSelectedSchool';

const TIMELINE = [
  { year: 'Start', icon: BookOpen, title: 'The Beginning', desc: 'A school community begins with a clear vision for learning and growth.' },
  { year: 'Growth', icon: Building2, title: 'Expanding Our Campus', desc: 'Facilities, classrooms, and learning resources grow with the needs of students.' },
  { year: 'Learning', icon: GraduationCap, title: 'Academic Development', desc: 'Curriculum and teaching practices are strengthened for better student outcomes.' },
  { year: 'Awards', icon: Trophy, title: 'Recognition', desc: 'Student achievement and staff dedication shape the school reputation.' },
  { year: 'Digital', icon: Globe, title: 'Going Digital', desc: 'Technology supports learning, assessment, communication, and school administration.' },
  { year: 'Today', icon: Sparkles, title: 'A Legacy Continues', desc: 'The school continues to prepare students for future success.' },
];

export default function HistoryPage() {
  const { school } = useSelectedSchool();
  const primary = school?.primaryColor ?? '#1d4ed8';

  return (
    <div className="bg-white">
      <section className="relative overflow-hidden py-24 px-4 text-center" style={{ background: `linear-gradient(135deg,${primary},#111827)` }}>
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest">
            <BookOpen size={13} /> Our History
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-5">{school?.name ?? 'School'} History</h1>
          <p className="text-white/70 text-lg">{school?.description || 'Milestones and school history can be expanded from database-managed information.'}</p>
        </div>
      </section>

      <section className="py-20 px-4 max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-blue-600 text-sm font-bold uppercase tracking-widest mb-2">Our Journey</p>
          <h2 className="text-3xl font-extrabold text-gray-900">Milestones That Shaped Us</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {TIMELINE.map(({ year, icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
              <span className="inline-block text-xs font-bold px-3 py-1 rounded-full text-white mb-3" style={{ backgroundColor: primary }}>{year}</span>
              <Icon size={22} className="mb-3 text-blue-700" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
