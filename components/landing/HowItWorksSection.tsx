'use client';
import { GraduationCap, Users, Zap } from 'lucide-react';
import { Reveal } from './Reveal';
import { SectionHeader } from './SectionHeader';

const STEPS = [
  { n: '01', t: 'Register your school', d: 'Create your profile — name, logo, brand colors and contact details.', icon: GraduationCap },
  { n: '02', t: 'Add staff & students',  d: 'Import or manually add records. Assign roles — admin, staff, student.',  icon: Users },
  { n: '03', t: 'Go live',               d: 'Everyone logs in to their portal. Fees, transport and results — all running.', icon: Zap },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 md:py-32 px-6 bg-[#eef2f7]">
      <div className="max-w-5xl mx-auto">
        <SectionHeader
          eyebrow="Simple setup"
          title={<>Up and running <span className="text-blue-600">in minutes</span></>}
          subtitle="Three simple steps to bring your whole school online."
        />
        <div className="grid md:grid-cols-3 gap-6 relative">
          <div className="hidden md:block absolute top-12 left-[calc(16.66%+2rem)] right-[calc(16.66%+2rem)] h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
          {STEPS.map(({ n, t, d, icon: Icon }, i) => (
            <Reveal key={n} delay={i * 0.12}>
              <div className="group bg-white border border-gray-100 hover:border-blue-200 rounded-3xl p-8 text-center flex flex-col items-center transition-all hover:-translate-y-1.5 hover:shadow-[0_16px_48px_rgba(37,99,235,.1)]">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                    <Icon size={30} className="text-blue-600" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-blue-600 text-white text-[11px] font-black flex items-center justify-center">
                    {n.slice(1)}
                  </span>
                </div>
                <h3 className="font-black text-gray-900 text-[16px] mb-3">{t}</h3>
                <p className="text-sm text-gray-500 leading-6">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
