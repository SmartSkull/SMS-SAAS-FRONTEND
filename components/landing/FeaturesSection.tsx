'use client';
import { Reveal } from './Reveal';
import { SectionHeader } from './SectionHeader';
import { FEATURES } from '@/types/landing';

export function FeaturesSection() {
  return (
    <section className="py-24 md:py-32 px-6 bg-[#eef2f7]">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          eyebrow="Everything included"
          title={<>More than <span className="text-blue-600">just results</span></>}
          subtitle="One platform for the whole school — staff, students, transport, fees and more."
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ label, desc, ic, bg, icon }, i) => (
            <Reveal key={label} delay={i * 0.06}>
              <div className="group bg-white border border-gray-100 hover:border-blue-200 rounded-3xl p-8 flex flex-col hover:-translate-y-1.5 transition-all cursor-default shadow-sm hover:shadow-[0_24px_60px_rgba(37,99,235,.12)]">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 shrink-0" style={{ background: bg, color: ic }}>
                  {icon}
                </div>
                <p className="font-bold text-gray-900 text-[15px] mb-2">{label}</p>
                <p className="text-sm text-gray-500 leading-6">{desc}</p>
                <div className="mt-5 w-8 h-1 rounded-full group-hover:w-12 transition-all duration-300" style={{ background: ic, opacity: 0.7 }} />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
