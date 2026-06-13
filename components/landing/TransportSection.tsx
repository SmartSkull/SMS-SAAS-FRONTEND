'use client';
import { ArrowRight, Bus, CheckCircle, MapPin } from 'lucide-react';
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
              <div className="flex items-center gap-3 mb-5">
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
              <div className="bg-blue-50 border border-blue-100 rounded-2xl h-28 mb-4 flex items-center justify-center">
                <div className="text-center">
                  <MapPin size={26} className="text-blue-600 mx-auto mb-1" />
                  <p className="text-blue-500 text-xs font-medium">Live map</p>
                </div>
              </div>
              <div className="space-y-2">
                {[['ETA to your stop', '2 min'], ['Students on board', '18 / 24']].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center bg-blue-50 rounded-xl px-4 py-2.5">
                    <span className="text-gray-400 text-xs">{k}</span>
                    <span className="text-gray-900 font-black text-sm">{v}</span>
                  </div>
                ))}
              </div>
            </div>
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
