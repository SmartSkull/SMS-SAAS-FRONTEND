'use client';
import { ArrowRight } from 'lucide-react';
import { Reveal } from './Reveal';
import { SectionHeader } from './SectionHeader';

export function PaymentSection() {
  return (
    <section className="py-28 px-6 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row-reverse items-center gap-20">
        <Reveal variant="right" className="flex-1">
          <SectionHeader
            dark
            align="left"
            eyebrow="Online Payments"
            title={<>School fees paid <span className="text-blue-200">in seconds</span></>}
            subtitle="Students pay from their portal via Paystack. No queues. No manual records. QR-code receipts generated instantly."
          />
          <a href="#contact" className="inline-flex items-center gap-2 px-7 py-4 bg-white hover:bg-blue-50 text-blue-700 font-bold rounded-2xl text-[15px] transition-all shadow-[0_8px_24px_rgba(0,0,0,.15)]">
            See it in action <ArrowRight size={16} />
          </a>
        </Reveal>

        <Reveal variant="left" delay={0.15} className="flex-1 flex justify-center">
          <div className="relative w-full max-w-sm">
            <div className="absolute -inset-4 bg-blue-400/30 rounded-[2.5rem] blur-2xl pointer-events-none" />
            <img
              src="/images/qrcode.svg"
              alt="QR code payment"
              className="relative w-full h-auto rounded-3xl border border-white/30 shadow-[0_32px_80px_rgba(0,0,0,.3)]"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
