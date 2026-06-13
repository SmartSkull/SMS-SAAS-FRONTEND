'use client';
import { motion } from 'framer-motion';
import { GraduationCap, Users, Zap } from 'lucide-react';
import { Reveal, stagger } from './Reveal';

const STEPS = [
  { n: '01', t: 'Register your school', d: 'Create your profile — name, logo, brand colors and contact details.', icon: GraduationCap },
  { n: '02', t: 'Add staff & students',  d: 'Import or manually add records. Assign roles — admin, staff, student.',  icon: Users },
  { n: '03', t: 'Go live',               d: 'Everyone logs in to their portal. Fees, transport and results — all running.', icon: Zap },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-28 px-6 bg-blue-700">
      <div className="max-w-5xl mx-auto">
        <Reveal className="text-center mb-16">
          <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-3">Simple setup</p>
          <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-black tracking-tight text-white">Up and running in minutes</h2>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-6 relative">
          <div className="hidden md:block absolute top-12 left-[calc(16.66%+2rem)] right-[calc(16.66%+2rem)] h-px bg-gradient-to-r from-transparent via-blue-300/50 to-transparent" />
          {STEPS.map(({ n, t, d, icon: Icon }, i) => (
            <Reveal key={n} delay={i * .12}>
              <motion.div whileHover={{ y: -5, boxShadow: '0 16px 48px rgba(0,0,0,.2)' }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="group bg-white/10 backdrop-blur-sm border border-white/15 hover:bg-white/20 rounded-2xl p-8 text-center flex flex-col items-center transition-all">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full bg-white/15 group-hover:bg-white/25 flex items-center justify-center transition-colors">
                    <Icon size={30} className="text-white" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-white text-blue-700 text-[11px] font-black flex items-center justify-center">
                    {n.slice(1)}
                  </span>
                </div>
                <h3 className="font-black text-white text-[16px] mb-3">{t}</h3>
                <p className="text-sm text-blue-100 leading-6">{d}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
