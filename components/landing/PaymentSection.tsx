'use client';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { Reveal } from './Reveal';

export function PaymentSection() {
  return (
    <section className="py-28 px-6 bg-blue-600">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row-reverse items-center gap-20">
        <Reveal variant="right" className="flex-1">
          <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-4">Online Payments</p>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-black leading-tight text-white mb-5">
            School fees paid<br /><span className="text-blue-200">in seconds</span>
          </h2>
          <p className="text-blue-100 text-[15px] leading-8 mb-8">
            Students pay from their portal via Paystack. No queues. No manual records. QR-code receipts generated instantly.
          </p>
          <a href="#contact" className="inline-flex items-center gap-2 px-7 py-4 bg-white hover:bg-blue-50 text-blue-700 font-bold rounded-2xl text-[15px] transition-all shadow-[0_8px_24px_rgba(0,0,0,.15)]">
            See it in action <ArrowRight size={16} />
          </a>
        </Reveal>

        <Reveal variant="left" delay={0.15} className="flex-1 flex justify-center">
          <div className="float bg-white rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,.25)] w-72 overflow-hidden hover:-translate-y-1.5 transition-transform duration-300">
            {/* Receipt header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 pt-6 pb-8 relative">
              <div className="flex items-center justify-between mb-4">
                <span className="text-blue-200 text-xs font-bold uppercase tracking-widest">Receipt</span>
                <span className="flex items-center gap-1.5 bg-green-400/20 text-green-300 text-[11px] font-bold px-2.5 py-1 rounded-full border border-green-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />PAID
                </span>
              </div>
              <p className="text-white/70 text-xs mb-1">Amount</p>
              <p className="text-4xl font-black text-white tracking-tight">₦45,000</p>
              <svg className="absolute -bottom-px left-0 w-full" viewBox="0 0 288 20" preserveAspectRatio="none">
                <path d="M0 20 C72 0 216 0 288 20 L288 20 L0 20 Z" fill="white"/>
              </svg>
            </div>

            {/* Receipt body */}
            <div className="px-6 pt-5 pb-6">
              <div className="space-y-3 mb-5">
                {[['Student','John Adeyemi'],['Term','First Term · 2025/26'],['Description','School Fees'],['Date','13 Jun 2026']].map(([k,v]) => (
                  <div key={k} className="flex justify-between items-center">
                    <span className="text-gray-400 text-xs">{k}</span>
                    <span className="font-semibold text-gray-800 text-xs">{v}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-gray-200 my-4" />
              <div className="flex flex-col items-center gap-2">
                <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                  <Image src="/images/qrcode.avif" alt="QR Code" width={84} height={84} className="rounded" />
                </div>
                <p className="text-[10px] text-gray-400 font-medium tracking-wide">SCAN TO VERIFY PAYMENT</p>
                <p className="text-[9px] text-gray-300 font-mono">REF: SC-2026-045000</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
