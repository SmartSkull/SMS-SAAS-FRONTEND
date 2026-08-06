import { LandingShell } from '@/components/landing/LandingShell';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { Reveal } from '@/components/landing/Reveal';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Features — Smart Campus', description: 'Everything included in Smart Campus: academics, transport, payments, HR, library, hostel and more.' };

export default function FeaturesPage() {
  return (
    <LandingShell>
      {/* Hero */}
      <section className="relative pt-36 pb-20 px-6 text-center overflow-hidden">
        <img src="/images/studentgroup1.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 animate-[kenBurns_12s_ease-in-out_infinite_alternate]" />
        <div className="absolute inset-0 bg-gray-950/80" />
        <div className="relative z-10">
        <Reveal>
          <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-4">What's included</p>
          <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-black text-white leading-tight mb-5">
            Everything in <span className="text-blue-300">one login</span>
          </h1>
          <p className="text-blue-100/70 text-[15px] max-w-xl mx-auto leading-8">
            No spreadsheets. No app-switching. Smart Campus handles every part of running your school.
          </p>
        </Reveal>
        </div>
      </section>

      <FeaturesSection />
    </LandingShell>
  );
}
