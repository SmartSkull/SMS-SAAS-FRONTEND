'use client';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Reveal } from './Reveal';
import { SectionHeader } from './SectionHeader';

export function TransportSection() {
  return (
    <section className="py-28 px-6 bg-[#e8f0fe]">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-20">
        <Reveal variant="left" className="flex-1">
          <SectionHeader
            align="left"
            eyebrow="Live Transport Tracking"
            title={<>Parents always know <span className="text-blue-600">where the bus is</span></>}
            subtitle="Real-time GPS from the driver's phone. Alerts when the bus is 500m away. Automatic pickup confirmation the moment your child boards."
          />
          <Link href="/school" className="inline-flex items-center gap-2 px-7 py-4 btn-hero text-white font-bold rounded-2xl text-[15px]" style={{ color: '#fff' }}>
            Access your portal <ArrowRight size={16} />
          </Link>
        </Reveal>

        <Reveal variant="right" delay={0.15} className="flex-1 flex justify-center">
          <img
            src="/images/Google Map.svg"
            alt="Live bus tracking map"
            className="w-full max-w-sm h-auto"
          />
        </Reveal>
      </div>
    </section>
  );
}
