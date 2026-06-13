'use client';
import { Reveal } from './Reveal';
import { STATS, TICKER } from '@/types/landing';

export function TickerBar() {
  return (
    <div className="bg-blue-800 py-3.5 overflow-hidden select-none">
      <div className="ticker-t">
        {[...TICKER, ...TICKER].map((t, i) => (
          <span key={i} className="flex items-center gap-4 px-6 text-blue-100 font-semibold text-sm whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />{t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function StatsSection() {
  return (
    <section className="bg-blue-600 py-14 px-6">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {STATS.map(({ n, l }, i) => (
          <Reveal key={l} delay={i * .08}>
            <div className="text-center">
              <p className="text-4xl font-black text-white mb-1">{n}</p>
              <p className="text-sm text-blue-100">{l}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
