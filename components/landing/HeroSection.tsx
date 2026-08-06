'use client';
import { ArrowRight, Bus, CheckCircle, MapPin, Play, Star } from 'lucide-react';
import Link from 'next/link';
import { Reveal } from './Reveal';

interface HeroSectionProps {
  heroRef: React.RefObject<HTMLDivElement | null>;
}

export function HeroSection({ heroRef }: HeroSectionProps) {
  return (
    <section ref={heroRef} className="relative pt-[68px] bg-[#fcf5eb] overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 md:py-24 grid lg:grid-cols-2 gap-16 lg:gap-12 items-center">
        {/* Left — text */}
        <div className="text-center lg:text-left flex flex-col items-center lg:items-start">
          <Reveal delay={0.05}>
            <h1 className="text-[clamp(2.5rem,5vw,4.25rem)] font-black leading-[1.04] tracking-tight text-gray-900 max-w-2xl mb-6">
              Run your school{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                the smart way
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="text-[16px] md:text-lg text-gray-500 leading-8 max-w-xl mb-9">
              Smart Campus handles academics, transport, payments, staff, library and more — from one secure login for your entire school.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <Link href="/school/register" className="group btn-hero flex items-center gap-2 px-8 py-4 font-bold rounded-2xl text-[15px]" style={{ color: '#fff' }}>
                Register your school
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link href="/school" className="flex items-center gap-2 px-8 py-4 bg-gray-900 hover:bg-gray-800 rounded-2xl text-[15px] font-semibold transition-all hover:-translate-y-0.5" style={{ color: '#fff' }}>
                Log in to portal
              </Link>
            </div>
          </Reveal>

          {/* trust row */}
          <Reveal delay={0.2}>
            <div className="flex flex-col sm:flex-row items-center gap-6 mt-12">
              {/* avatar stack */}
              <div className="flex items-center">
                <div className="flex -space-x-3">
                  {['/images/student1.jpg', '/images/student2.jpg', '/images/student3.jpg'].map((src, i) => (
                    <div key={i} className="w-10 h-10 rounded-full ring-2 ring-white overflow-hidden bg-blue-100">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  <div className="w-10 h-10 rounded-full ring-2 ring-white bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
                    1.2k+
                  </div>
                </div>
                <div className="ml-4 text-left">
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {[...Array(5)].map((_, i) => <Star key={i} size={16} className="fill-current" />)}
                  </div>
                  <p className="text-xs text-gray-500 font-medium">Loved by schools nationwide</p>
                </div>
              </div>

              <div className="hidden sm:block h-10 w-px bg-gray-200" />

              <div className="flex gap-8">
                {[['50+', 'Staff'], ['24/7', 'Support']].map(([n, l]) => (
                  <div key={l} className="text-center sm:text-left">
                    <p className="text-2xl font-black text-gray-900">{n}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        {/* Right — phone-framed map visual */}
        <Reveal delay={0.25} className="relative flex justify-center lg:justify-end">
          <div className="relative">
            {/* phone frame */}
            <div className="relative w-[330px] sm:w-[380px] rounded-[2.5rem] bg-gray-900 p-3">
              <div className="rounded-[2rem] overflow-hidden bg-white">
                {/* status bar */}
                <div className="bg-blue-600 px-5 pt-4 pb-3">
                  <div className="flex items-center justify-between text-white">
                    <p className="text-[13px] font-bold">Smart Campus</p>
                    <span className="text-[10px] font-semibold bg-white/20 rounded-full px-2 py-0.5">LIVE</span>
                  </div>
                </div>

                {/* map area */}
                <div className="relative">
                  <img src="/images/Google Map.svg?v=2" alt="Live bus tracking map" className="w-full h-auto max-h-[640px]" />
                  {/* overlay cards */}
                  <div className="absolute top-3 left-3 right-3">
                    <div className="bg-white/95 backdrop-blur rounded-xl shadow-lg px-3 py-2.5 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                        <Bus size={15} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-gray-900">Bus LG-123-AA</p>
                        <p className="text-[10px] text-gray-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> En route · Route A
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 space-y-2">
                    <div className="bg-white/95 backdrop-blur rounded-xl shadow-lg px-3 py-2.5 flex items-center justify-between">
                      <span className="text-[11px] text-gray-500">ETA to stop</span>
                      <span className="text-[12px] font-black text-gray-900">2 min</span>
                    </div>
                    <div className="bg-white/95 backdrop-blur rounded-xl shadow-lg px-3 py-2.5 flex items-center justify-between">
                      <span className="text-[11px] text-gray-500">Fees this term</span>
                      <span className="text-[12px] font-black text-emerald-600 flex items-center gap-1">
                        <CheckCircle size={13} /> Paid
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* floating chips outside frame */}
            <div className="float absolute -left-16 top-16 hidden md:flex bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <MapPin size={16} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-900">Pickup confirmed</p>
                <p className="text-[10px] text-gray-400">Just now</p>
              </div>
            </div>

            <div className="float2 absolute -right-8 bottom-20 hidden md:flex bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                <Play size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-900">Results published</p>
                <p className="text-[10px] text-gray-400">Term 3 · 2025/26</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
