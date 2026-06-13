'use client';
import { motion, MotionValue } from 'framer-motion';
import { ArrowRight, CheckCircle, MapPin } from 'lucide-react';
import Link from 'next/link';
import { fadeUp, stagger } from './Reveal';

interface HeroSectionProps {
  heroRef: React.RefObject<HTMLDivElement | null>;
  heroY: MotionValue<string>;
}

export function HeroSection({ heroRef, heroY }: HeroSectionProps) {
  return (
    <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden bg-gray-950">
      <motion.div style={{ y: heroY }} className="absolute inset-0 scale-110">
        <img src="/images/studentgroup1.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950/80 via-gray-900/60 to-gray-950/70" />
      <div className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-[68px] w-full grid md:grid-cols-2 gap-16 items-center py-24">
        <div>
          <motion.div variants={stagger(.1)} initial="hidden" animate="show">

            <motion.h1 variants={fadeUp} className="text-[clamp(3rem,6vw,5rem)] font-black leading-[1.04] tracking-tight text-white mb-6">
              The <span className="text-blue-200">smartest</span> way to run your school.
            </motion.h1>

            <motion.p variants={fadeUp} className="text-[17px] text-blue-100 leading-8 mb-10 max-w-lg">
              Smart Campus handles academics, transport, payments, HR, library and more — all from one login.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
              <a href="#contact" className="flex items-center gap-2 px-7 py-4 bg-white hover:bg-blue-50 text-blue-700 font-bold rounded-2xl text-[15px] transition-all shadow-[0_8px_24px_rgba(0,0,0,.2)]">
                Register your school <ArrowRight size={16} />
              </a>
              <Link href="/school" className="flex items-center gap-2 px-7 py-4 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white font-semibold rounded-2xl text-[15px] transition-all">
                Log in to portal
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} className="flex gap-10 mt-12 pt-10 border-t border-white/20">
              {[['1,200+', 'Students'], ['50+', 'Staff'], ['24/7', 'Support']].map(([n, l]) => (
                <div key={l}>
                  <p className="text-2xl font-black text-white">{n}</p>
                  <p className="text-xs text-blue-200 mt-0.5">{l}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* floating UI cards */}
        <div className="hidden md:flex items-center justify-center relative h-[540px]">
          <motion.div initial={{ opacity: 0, y: 40, scale: .93 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: .4, duration: .8, ease: 'easeOut' }}
            className="float relative w-72 rounded-3xl overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,.35)]">
            <img src="/images/studentgroup2.jpg" alt="" className="w-full h-64 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/70 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="flex items-center gap-2.5 bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-3">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-bold text-gray-900">All systems live</span>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .65, duration: .5 }}
            className="absolute top-8 -right-4 bg-white/95 backdrop-blur-sm rounded-2xl p-3 flex flex-col gap-2 shadow-xl">
            {['/images/student1.jpg', '/images/student2.jpg', '/images/student3.jpg'].map((src, i) => (
              <motion.div key={i} whileHover={{ scale: 1.1 }} className="w-11 h-11 rounded-xl overflow-hidden ring-2 ring-blue-100">
                <img src={src} alt="" className="w-full h-full object-cover" />
              </motion.div>
            ))}
            <div className="text-center mt-1">
              <p className="text-[11px] font-black text-blue-600">1,240+</p>
              <p className="text-[9px] text-gray-400">Students</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: .8, duration: .45 }}
            className="float2 absolute bottom-24 -left-8 bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <MapPin size={15} className="text-blue-600" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-900">Bus is 2 min away</p>
              <p className="text-[10px] text-gray-400">Live GPS · Route A</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: .95, duration: .45 }}
            className="float absolute bottom-6 right-0 bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle size={15} className="text-green-600" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-900">Fees paid ✓</p>
              <p className="text-[10px] text-gray-400">₦45,000 · Just now</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
