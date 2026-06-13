'use client';
import { motion } from 'framer-motion';
import { Reveal, stagger, fadeUp } from './Reveal';
import { FEATURES } from '@/types/landing';

export function FeaturesSection() {
  return (
    <section id="features" className="py-28 px-6 bg-[#e8f0fe]">
      <div className="max-w-7xl mx-auto">
        <Reveal className="text-center mb-16">
          <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-3">What's included</p>
          <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-black tracking-tight text-gray-900 mb-4">
            Everything in <span className="text-blue-600">one login</span>
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto text-[15px] leading-7">No spreadsheets. No app-switching. Smart Campus handles it all.</p>
        </Reveal>

        <motion.div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          variants={stagger(.06)} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
          {FEATURES.map(({ label, desc, ic, bg, icon }) => (
            <motion.div key={label} variants={fadeUp}
              className="group border border-blue-100 hover:border-blue-300 rounded-2xl p-7 flex flex-col bg-white hover:bg-blue-50/50 hover:-translate-y-1.5 transition-all cursor-default shadow-sm hover:shadow-[0_20px_60px_rgba(37,99,235,.15)]">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 shrink-0" style={{ background: bg, color: ic }}>
                {icon}
              </div>
              <p className="font-bold text-gray-900 text-[15px] mb-2">{label}</p>
              <p className="text-sm text-gray-500 leading-6">{desc}</p>
              <div className="mt-5 w-7 h-[3px] rounded-full group-hover:w-12 transition-all duration-300" style={{ background: ic }} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
