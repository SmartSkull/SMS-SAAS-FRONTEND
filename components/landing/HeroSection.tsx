'use client';
import { ArrowRight, CheckCircle, MapPin } from 'lucide-react';
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

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32 flex flex-col items-center text-center">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-700 mb-8">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Trusted by schools across Nigeria
          </div>
        </Reveal>

        <Reveal delay={0.05}>
          <h1 className="text-[clamp(2.75rem,6vw,4.75rem)] font-black leading-[1.05] tracking-tight text-gray-900 max-w-4xl mx-auto mb-6">
            The smartest way to run your school —{' '}
            <span className="text-blue-600">all in one place</span>
          </h1>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="text-[17px] md:text-lg text-gray-500 leading-8 max-w-2xl mx-auto mb-10">
            Smart Campus handles academics, transport, payments, staff, library and more — from one secure login for your entire school.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/school/register" className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-[15px] transition-all shadow-[0_12px_30px_rgba(37,99,235,.3)]">
              Register your school <ArrowRight size={16} />
            </Link>
            <Link href="/school" className="flex items-center gap-2 px-8 py-4 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 font-semibold rounded-2xl text-[15px] transition-all">
              Log in to portal
            </Link>
          </div>
        </Reveal>

        <Reveal delay={0.25} className="w-full mt-16">
          <div className="relative mx-auto max-w-5xl">
            <div className="absolute -inset-6 bg-gradient-to-b from-blue-100/80 to-transparent rounded-[3rem] blur-2xl pointer-events-none" />
            <div className="relative bg-white rounded-[2rem] border border-gray-200 shadow-[0_40px_100px_rgba(37,99,235,.15)] overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50/80">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-yellow-400" />
                <span className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-3 text-xs text-gray-400 font-medium">smartcampus.com.ng — dashboard</span>
              </div>
              <img src="/images/studentgroup2.jpg" alt="Smart Campus dashboard" className="w-full h-64 md:h-[420px] object-cover" />
            </div>

            {/* floating cards */}
            <div className="float absolute -left-4 top-24 hidden md:flex bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                <MapPin size={15} className="text-blue-600" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-900">Bus is 2 min away</p>
                <p className="text-[10px] text-gray-400">Live GPS · Route A</p>
              </div>
            </div>

            <div className="float2 absolute -right-4 bottom-24 hidden md:flex bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle size={15} className="text-green-600" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-900">Fees paid ✓</p>
                <p className="text-[10px] text-gray-400">₦45,000 · Just now</p>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.35}>
          <div className="flex flex-wrap justify-center gap-12 mt-16">
            {[['1,200+', 'Students'], ['50+', 'Staff'], ['24/7', 'Support']].map(([n, l]) => (
              <div key={l} className="text-center">
                <p className="text-3xl font-black text-gray-900">{n}</p>
                <p className="text-sm text-gray-400 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
