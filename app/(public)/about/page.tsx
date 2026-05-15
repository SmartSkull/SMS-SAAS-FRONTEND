'use client';
import { Award, BookOpen, Eye, Heart, Lightbulb, Star, Target, Users } from 'lucide-react';
import Link from 'next/link';
import { normalizeSchoolLogo, useSelectedSchool } from '@/hooks/useSelectedSchool';

const VALUES = [
  { icon: Star, label: 'Excellence', desc: 'We pursue high standards in everything we do.' },
  { icon: Heart, label: 'Integrity', desc: 'Honesty and transparency guide every decision.' },
  { icon: Lightbulb, label: 'Innovation', desc: 'We embrace creativity and forward thinking.' },
  { icon: Users, label: 'Respect', desc: 'Every individual is valued and celebrated.' },
  { icon: Award, label: 'Teamwork', desc: 'Together we achieve more than we can alone.' },
];

export default function AboutPage() {
  const { school } = useSelectedSchool();
  const logo = normalizeSchoolLogo(school?.logo);
  const primary = school?.primaryColor ?? '#1d4ed8';

  return (
    <div className="bg-white">
      <section className="relative overflow-hidden py-24 px-4 text-center" style={{ background: `linear-gradient(135deg,${primary},#111827)` }}>
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest">
            <BookOpen size={13} /> About Us
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-5">{school?.name ?? 'School Portal'}</h1>
          <p className="text-white/75 text-lg leading-relaxed">
            {school?.description || school?.slogan || 'School information is managed from the database and displayed across the portal.'}
          </p>
        </div>
      </section>

      <section className="py-20 px-4 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="rounded-3xl p-8 border border-blue-100 bg-blue-50 relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center mb-5">
              <Target size={22} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Our Mission</h2>
            <p className="text-gray-600 leading-relaxed">{school?.motto || 'To provide quality education and prepare every learner for meaningful success.'}</p>
          </div>

          <div className="rounded-3xl p-8 border border-indigo-100 bg-indigo-50 relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mb-5">
              <Eye size={22} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Our Vision</h2>
            <p className="text-gray-600 leading-relaxed">{school?.slogan || 'To nurture confident learners and responsible future leaders.'}</p>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-blue-600 text-sm font-bold uppercase tracking-widest mb-2">What We Stand For</p>
            <h2 className="text-3xl font-extrabold text-gray-900">Core Values</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {VALUES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <Icon size={22} className="text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{label}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-blue-600 text-sm font-bold uppercase tracking-widest mb-3">Our Story</p>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-5 leading-tight">Learning and Leadership</h2>
            <p className="text-gray-600 leading-relaxed mb-4">{school?.description || 'Update the school description from the admin school information page to show a richer story here.'}</p>
            <Link href="/admissions" className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: primary }}>
              Apply for Admission
            </Link>
          </div>
          <div className="relative">
            <div className="rounded-3xl overflow-hidden shadow-2xl aspect-[4/3] bg-blue-100 flex items-center justify-center">
              {logo ? <img src={logo} alt={`${school?.name ?? 'School'} logo`} className="w-40 h-40 object-contain opacity-60" /> : <BookOpen size={72} className="text-blue-300" />}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
