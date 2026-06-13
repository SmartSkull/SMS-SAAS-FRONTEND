'use client';
import { ArrowRight, Bus, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Reveal } from './Reveal';

export function TransportSection() {
  return (
    <section className="py-28 px-6 bg-[#e8f0fe]">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-20">
        <Reveal variant="left" className="flex-1">
          <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-4">Live Transport Tracking</p>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-black leading-tight text-gray-900 mb-5">
            Parents always know<br /><span className="text-blue-600">where the bus is</span>
          </h2>
          <p className="text-gray-500 text-[15px] leading-8 mb-8">
            Real-time GPS from the driver's phone. Alerts when the bus is 500m away. Automatic pickup confirmation the moment your child boards.
          </p>
          <Link href="/school" className="inline-flex items-center gap-2 px-7 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-[15px] transition-all shadow-[0_8px_24px_rgba(37,99,235,.3)]">
            Access your portal <ArrowRight size={16} />
          </Link>
        </Reveal>

        <Reveal variant="right" delay={0.15} className="flex-1 flex justify-center">
          <div className="float relative">
            <div className="bg-white border border-blue-100 rounded-3xl p-6 w-72 shadow-[0_24px_60px_rgba(37,99,235,.15)]">

              {/* Bus header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center">
                  <Bus size={20} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Bus LG-123-AA</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Live · Route A
                  </p>
                </div>
              </div>

              {/* Map */}
              <div className="relative rounded-2xl overflow-hidden h-36 mb-4 border border-blue-100">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d15852.123!2d3.3792057!3d6.5243793!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sng!4v1718273900000!5m2!1sen!2sng"
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Live bus map"
                />

                {/* Animated bus marker */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  {/* Pulse ring */}
                  <span className="absolute w-10 h-10 rounded-full bg-blue-500/30 animate-ping" />
                  <span className="absolute w-6 h-6 rounded-full bg-blue-500/20 animate-ping" style={{ animationDelay: '0.3s' }} />
                  {/* Bus icon chip */}
                  <div className="relative flex items-center gap-1.5 bg-blue-600 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-full shadow-lg animate-[busMove_4s_ease-in-out_infinite_alternate]">
                    <Bus size={12} />
                    LG-123-AA
                  </div>
                </div>

                {/* Live badge */}
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm text-[10px] font-bold text-gray-800 px-2 py-1 rounded-full shadow">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />LIVE
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-2">
                {[['ETA to your stop', '2 min'], ['Students on board', '18 / 24']].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center bg-blue-50 rounded-xl px-4 py-2.5">
                    <span className="text-gray-400 text-xs">{k}</span>
                    <span className="text-gray-900 font-black text-sm">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pickup notification */}
            <div className="float2 absolute -bottom-5 -right-5 bg-white border border-blue-100 rounded-2xl shadow-lg px-4 py-3 flex items-center gap-2.5">
              <CheckCircle size={16} className="text-green-500" />
              <div>
                <p className="text-[11px] font-bold text-gray-900">John picked up ✓</p>
                <p className="text-[10px] text-gray-400">Just now</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
