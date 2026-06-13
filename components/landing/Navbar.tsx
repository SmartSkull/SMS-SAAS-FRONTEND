'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';

interface NavbarProps {
  scrolled: boolean;
  menu: boolean;
  setMenu: (v: boolean | ((p: boolean) => boolean)) => void;
}

export function Navbar({ scrolled, menu, setMenu }: NavbarProps) {
  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-blue-500/95 backdrop-blur-md shadow-[0_2px_20px_rgba(37,99,235,.12)] border-b border-blue-400' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 h-[68px] flex items-center justify-between">
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .5 }}
          className="select-none">
          <img src="/images/logo.png" alt="Smart Campus" className="h-20 w-auto" />
        </motion.div>

        <motion.nav initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .2, duration: .5 }}
          className="hidden md:flex items-center gap-8 text-[14px] text-white/80 font-medium">
          {['Features', 'How it works', 'Contact'].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`} className="hover:text-white transition-colors">{l}</a>
          ))}
        </motion.nav>

        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .3, duration: .5 }}
          className="hidden md:flex items-center gap-3">
          <Link href="/school" className="text-[14px] font-semibold text-white/80 hover:text-white px-4 py-2 transition-colors">Log in</Link>
          <a href="#contact" className="text-[14px] font-bold px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-[0_4px_14px_rgba(37,99,235,.35)]">
            Get a demo
          </a>
        </motion.div>

        <button className="md:hidden text-white" onClick={() => setMenu(v => !v)}>
          {menu ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {menu && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: .25 }}
            className="md:hidden overflow-hidden px-6 pb-6 pt-2 border-t border-blue-400 bg-blue-500 flex flex-col gap-5">
            {['Features', 'How it works', 'Contact'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`}
                onClick={() => setMenu(false)} className="font-semibold text-white">{l}</a>
            ))}
            <div className="flex gap-3">
              <Link href="/school" onClick={() => setMenu(false)} className="flex-1 text-center border border-white/40 py-3 rounded-xl font-semibold text-sm text-white">Log in</Link>
              <a href="#contact" onClick={() => setMenu(false)} className="flex-1 text-center bg-blue-600 text-white py-3 rounded-xl font-bold text-sm">Get a demo</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
