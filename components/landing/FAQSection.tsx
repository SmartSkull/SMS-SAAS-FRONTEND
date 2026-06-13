'use client';
import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { FAQS } from '@/types/landing';
import { Reveal } from './Reveal';

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="py-28 px-6 bg-gray-950 relative overflow-hidden">
      {/* background decoration */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-800/10 blur-3xl pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10">
        <Reveal className="mb-14 text-center">
          <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">FAQ</p>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tight text-white">Common questions</h2>
          <p className="text-blue-100/50 mt-3 text-[15px]">Everything you need to know about Smart Campus.</p>
        </Reveal>

        <div className="space-y-3">
          {FAQS.map(({ q, a }, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={q} delay={i * 0.05}>
                <div className={`rounded-2xl border transition-all duration-300 ${isOpen ? 'border-blue-500/50 bg-blue-600/10' : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'}`}>
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left gap-4"
                  >
                    <span className={`font-semibold text-[15px] transition-colors duration-200 ${isOpen ? 'text-white' : 'text-white/80'}`}>{q}</span>
                    <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-blue-500 text-white rotate-0' : 'bg-white/10 text-white/60'}`}>
                      {isOpen ? <Minus size={14} /> : <Plus size={14} />}
                    </div>
                  </button>

                  <div
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{ maxHeight: isOpen ? '200px' : '0px', opacity: isOpen ? 1 : 0 }}
                  >
                    <p className="text-blue-100/60 text-sm leading-7 px-6 pb-5">{a}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* CTA */}
        <Reveal delay={0.3} className="mt-14 text-center">
          <p className="text-white/40 text-sm mb-4">Still have questions?</p>
          <a href="/reach-us" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-[0_8px_24px_rgba(37,99,235,.35)]">
            Contact us
          </a>
        </Reveal>
      </div>
    </section>
  );
}
