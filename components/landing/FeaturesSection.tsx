'use client';
import { Reveal } from './Reveal';
import { FEATURES } from '@/types/landing';

export function FeaturesSection() {
  return (
    <section className="py-24 md:py-32 px-6 bg-[#f7f9fc]">
      <div className="max-w-7xl mx-auto">
        <Reveal className="text-center mb-16">
          <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-3">Everything included</p>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tight text-gray-900 mb-4">
            More than just results
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto text-[15px] leading-7">One platform for the whole school — staff, students, transport, fees and more.</p>
        </Reveal>

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
