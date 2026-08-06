'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Reveal } from './Reveal';
import { FEATURES } from '@/types/landing';

export function FeaturesSection() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 3 slides per view on desktop, 1 on mobile — for auto-advance we cycle by 1
  const PER_VIEW = 3;
  const maxIndex = Math.max(0, FEATURES.length - PER_VIEW);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(() => {
      setIndex(i => (i >= maxIndex ? 0 : i + 1));
    }, 3500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, maxIndex]);

  const prev = () => setIndex(i => (i <= 0 ? maxIndex : i - 1));
  const next = () => setIndex(i => (i >= maxIndex ? 0 : i + 1));

  return (
    <section className="py-24 md:py-32 px-6 bg-[#f7f9fc] overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <Reveal className="text-center mb-16">
          <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-3">Everything included</p>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tight text-gray-900 mb-4">
            More than just results
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto text-[15px] leading-7">One platform for the whole school — staff, students, transport, fees and more.</p>
        </Reveal>

        <div
          className="relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Slider track */}
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
              style={{ transform: `translateX(-${index * (100 / PER_VIEW)}%)` }}
            >
              {FEATURES.map(({ label, desc, ic, bg, icon }) => (
                <div key={label} className="w-full sm:w-1/2 lg:w-1/3 shrink-0 px-2.5">
                  <div className="group bg-white border border-gray-100 hover:border-blue-200 rounded-3xl p-8 h-full flex flex-col hover:-translate-y-1.5 transition-all cursor-default shadow-sm hover:shadow-[0_24px_60px_rgba(37,99,235,.12)]">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 shrink-0" style={{ background: bg, color: ic }}>
                      {icon}
                    </div>
                    <p className="font-bold text-gray-900 text-[15px] mb-2">{label}</p>
                    <p className="text-sm text-gray-500 leading-6">{desc}</p>
                    <div className="mt-5 w-8 h-1 rounded-full group-hover:w-12 transition-all duration-300" style={{ background: ic, opacity: 0.7 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mt-10">
            <button
              onClick={prev}
              aria-label="Previous features"
              className="w-10 h-10 rounded-full bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-600 text-gray-600 flex items-center justify-center shadow-sm transition-all active:scale-95"
            >
              <ChevronLeft size={18} />
            </button>

            {/* dots */}
            <div className="flex items-center gap-2">
              {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${i === index ? 'w-7 bg-blue-600' : 'w-2 bg-gray-300 hover:bg-gray-400'}`}
                />
              ))}
            </div>

            <button
              onClick={next}
              aria-label="Next features"
              className="w-10 h-10 rounded-full bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-600 text-gray-600 flex items-center justify-center shadow-sm transition-all active:scale-95"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
