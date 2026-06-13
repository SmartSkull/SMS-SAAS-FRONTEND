'use client';
import { Reveal } from './Reveal';
import { FAQ } from './FAQ';
import { FAQS } from '@/types/landing';

export function FAQSection() {
  return (
    <section className="py-28 px-6 bg-[#e8f0fe]">
      <div className="max-w-2xl mx-auto">
        <Reveal className="mb-14">
          <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-3">FAQ</p>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tight text-gray-900">Common questions</h2>
        </Reveal>
        {FAQS.map(f => <FAQ key={f.q} {...f} />)}
      </div>
    </section>
  );
}
