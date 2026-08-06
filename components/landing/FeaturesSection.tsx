'use client';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
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
          {FEATURES.map(({ slug, label, desc, ic, bg, icon }, i) => (
            <Reveal key={label} delay={i * 0.06}>
              <div className="group bg-white border border-gray-100 hover:border-blue-200 rounded-3xl p-8 flex flex-col hover:-translate-y-1.5 transition-all cursor-default shadow-sm hover:shadow-[0_24px_60px_rgba(37,99,235,.12)]">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 shrink-0" style={{ background: bg, color: ic }}>
                  {icon}
                </div>
                <p className="font-bold text-gray-900 text-[15px] mb-2">{label}</p>
                <p className="text-sm text-gray-500 leading-6 mb-6">{desc}</p>
                <div className="mt-auto">
                  <Link href={`/features/${slug}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors group/btn">
                    View feature
                    <ArrowRight size={15} className="transition-transform group-hover/btn:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
