'use client';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Reveal } from './Reveal';

interface HeroSectionProps {
  heroRef: React.RefObject<HTMLDivElement | null>;
}

export function HeroSection({ heroRef }: HeroSectionProps) {
  return (
    <section ref={heroRef} className="relative pt-[68px] bg-white overflow-hidden">
      {/* soft gradient blobs */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-blue-100/60 blur-3xl pointer-events-none" />
      <div className="absolute top-40 -left-32 w-[400px] h-[400px] rounded-full bg-blue-50 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-28 flex flex-col lg:flex-row items-center gap-14 lg:gap-16">
        {/* Left — text */}
        <div className="flex-1 text-center lg:text-left flex flex-col items-center lg:items-start">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-700 mb-8">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Trusted by schools across Nigeria
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-black leading-[1.06] tracking-tight text-gray-900 max-w-2xl mb-6">
              The smartest way to run your school —{' '}
              <span className="text-blue-600">all in one place</span>
            </h1>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="text-[16px] md:text-lg text-gray-500 leading-8 max-w-xl mb-10">
              Smart Campus handles academics, transport, payments, staff, library and more — from one secure login for your entire school.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <Link href="/school/register" className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-[15px] transition-all shadow-[0_12px_30px_rgba(37,99,235,.3)]">
                Register your school <ArrowRight size={16} />
              </Link>
              <Link href="/school" className="flex items-center gap-2 px-8 py-4 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 font-semibold rounded-2xl text-[15px] transition-all">
                Log in to portal
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="flex flex-wrap justify-center lg:justify-start gap-12 mt-14">
              {[['1,200+', 'Students'], ['50+', 'Staff'], ['24/7', 'Support']].map(([n, l]) => (
                <div key={l} className="text-center lg:text-left">
                  <p className="text-3xl font-black text-gray-900">{n}</p>
                  <p className="text-sm text-gray-400 mt-0.5">{l}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Right — Google Map SVG */}
        <Reveal delay={0.25} className="flex-1 w-full flex justify-center">
          <div className="relative w-full max-w-md lg:max-w-lg">
            <div className="absolute -inset-8 bg-gradient-to-b from-blue-100/70 to-transparent rounded-[3rem] blur-2xl pointer-events-none" />
            <img
              src="/images/Google Map.svg"
              alt="Live bus tracking map"
              className="relative w-full h-auto drop-shadow-[0_30px_60px_rgba(37,99,235,.25)]"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
