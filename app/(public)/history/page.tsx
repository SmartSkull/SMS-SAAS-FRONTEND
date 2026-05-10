import { BookOpen, Building2, GraduationCap, Globe, Trophy, Sparkles } from 'lucide-react';

const TIMELINE = [
  {
    year: '2008',
    icon: BookOpen,
    title: 'The Beginning',
    desc: 'Florieren Parklane International School was founded with a bold vision — to provide world-class education accessible to every child. We opened our doors with a small but passionate team of educators and a handful of students.',
    color: 'bg-blue-600',
    light: 'bg-blue-50 border-blue-100',
  },
  {
    year: '2012',
    icon: Building2,
    title: 'Expanding Our Campus',
    desc: 'Rapid growth in enrolment led to the construction of new classrooms, a science laboratory, and a library. The school officially introduced the Junior Secondary curriculum, welcoming students from JSS1 to JSS3.',
    color: 'bg-indigo-600',
    light: 'bg-indigo-50 border-indigo-100',
  },
  {
    year: '2015',
    icon: GraduationCap,
    title: 'Senior Secondary Launch',
    desc: 'We expanded to full secondary education, adding SS1–SS3. Our first set of WAEC candidates recorded an outstanding 96% pass rate, cementing our reputation for academic excellence across the region.',
    color: 'bg-violet-600',
    light: 'bg-violet-50 border-violet-100',
  },
  {
    year: '2018',
    icon: Trophy,
    title: 'Awards & Recognition',
    desc: 'Florieren Parklane IS received state recognition for outstanding academic performance and was awarded Best Private School in the region. Our students began winning national competitions in science, mathematics, and debate.',
    color: 'bg-amber-500',
    light: 'bg-amber-50 border-amber-100',
  },
  {
    year: '2021',
    icon: Globe,
    title: 'Going Digital',
    desc: 'We launched our computer-based testing (CBT) platform, digital library, and online student portal — bringing modern technology into every aspect of learning and school administration.',
    color: 'bg-cyan-600',
    light: 'bg-cyan-50 border-cyan-100',
  },
  {
    year: 'Today',
    icon: Sparkles,
    title: 'A Legacy Continues',
    desc: 'With over 500 students, 50+ qualified staff, and a thriving alumni network, Florieren Parklane IS stands as a beacon of excellence — producing graduates who go on to excel in universities and careers across Nigeria and beyond.',
    color: 'bg-blue-700',
    light: 'bg-blue-50 border-blue-100',
  },
];

export default function HistoryPage() {
  return (
    <div className="bg-white">

      {/* Hero */}
      <section className="relative overflow-hidden py-24 px-4 text-center"
        style={{ background: 'linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 50%,#2563eb 100%)' }}>
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest">
            <BookOpen size={13} /> Our History
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-5">
            A Legacy of Excellence<br />Spanning Decades
          </h1>
          <p className="text-white/70 text-lg">
            From humble beginnings to a leading institution — the story of Florieren Parklane International School.
          </p>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 px-4 max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-blue-600 text-sm font-bold uppercase tracking-widest mb-2">Our Journey</p>
          <h2 className="text-3xl font-extrabold text-gray-900">Milestones That Shaped Us</h2>
        </div>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-0.5 bg-blue-100 -translate-x-1/2" />

          <div className="space-y-10">
            {TIMELINE.map(({ year, icon: Icon, title, desc, color, light }, i) => (
              <div key={year} className={`relative flex gap-6 md:gap-0 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>

                {/* Content */}
                <div className={`flex-1 ${i % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'} pl-16 md:pl-0`}>
                  <div className={`inline-block rounded-2xl border p-5 ${light} shadow-sm hover:shadow-md transition-shadow`}>
                    <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full text-white mb-3 ${color}`}>{year}</span>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>

                {/* Icon node */}
                <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 top-5 flex items-center justify-center">
                  <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center shadow-lg ring-4 ring-white`}>
                    <Icon size={20} className="text-white" />
                  </div>
                </div>

                {/* Spacer for alternating side */}
                <div className="hidden md:block flex-1" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 text-center"
        style={{ background: 'linear-gradient(135deg,#eff6ff,#e0f2fe)' }}>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-3">Be Part of Our Story</h2>
        <p className="text-gray-500 mb-6 max-w-md mx-auto text-sm">Join a school with a proud history and an even brighter future.</p>
        <a href="/admissions"
          className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-white text-sm font-semibold btn-brand">
          Apply for Admission →
        </a>
      </section>

    </div>
  );
}
