'use client';
import { Shield, Smartphone, Star, Zap } from 'lucide-react';
import Link from 'next/link';
import { Reveal } from './Reveal';

export function TrustSection() {
  return (
    <section className="py-20 px-6 bg-blue-800">
      <div className="max-w-4xl mx-auto text-center">
        <Reveal>
          <h2 className="text-3xl md:text-4xl font-black text-white leading-snug max-w-2xl mx-auto">
            All data and payments are{' '}
            <span className="text-blue-300">fully encrypted and secure.</span>
          </h2>
        </Reveal>
        <Reveal delay={.1} className="flex flex-wrap justify-center gap-10 mt-12">
          {[{ icon: Shield, l: 'End-to-end encryption' }, { icon: Zap, l: 'Real-time updates' }, { icon: Star, l: '99.9% uptime' }, { icon: Smartphone, l: 'Mobile-ready' }].map(({ icon: Icon, l }) => (
            <div key={l} className="flex items-center gap-2.5 text-blue-200">
              <Icon size={17} className="text-blue-300 shrink-0" />
              <span className="text-sm font-medium">{l}</span>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

export function PhotoBreak() {
  return (
    <section className="relative h-[50vh] overflow-hidden">
      <img src="/images/studentgroup2.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gray-950/65" />
      <div className="relative z-10 h-full flex items-center justify-center text-center px-6">
        <Reveal>
          <p className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-4">Trusted by schools across Nigeria</p>
          <h2 className="text-4xl md:text-6xl font-black text-white leading-tight">
            Built for students<br />
            <span className="text-blue-300">who deserve the best.</span>
          </h2>
        </Reveal>
      </div>
    </section>
  );
}

export function FinalCTA() {
  return (
    <section className="relative py-28 px-6 overflow-hidden">
      <img src="/images/studentgroup1.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gray-950/80" />
      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <Reveal>
          <p className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-4">Get started today</p>
          <h2 className="text-[clamp(2.5rem,5vw,4rem)] font-black text-white leading-tight mb-5">Join Smart Campus today</h2>
          <p className="text-blue-100/70 text-[15px] mb-10 max-w-lg mx-auto">
            Your school must be registered before staff and students can log in.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/school/register" className="px-8 py-4 bg-white hover:bg-blue-50 text-blue-700 font-bold rounded-2xl text-[15px] transition-all shadow-lg">
              Register Your School
            </Link>
            <Link href="/school" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl text-[15px] transition-all">
              Access Existing Portal
            </Link>
            <a
              href="https://drive.google.com/uc?export=download&id=17d-QLydS0545Pu6cg0WpSgfjmyVTsAQU"
              target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-8 py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl text-[15px] transition-all shadow-lg"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download Android App
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="bg-blue-900 px-6 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-10 mb-10">
          <div>
            <img src="/images/logo.png" alt="Smart Campus" className="h-16 w-auto" />
            <p className="text-blue-200/60 text-sm max-w-xs leading-7">Complete school management platform for Nigerian schools.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-10 text-sm text-blue-200/50">
            <div>
              <p className="text-white font-bold mb-4">Platform</p>
              {[['Features', '/features'], ['How it works', '/how-it-works'], ['Register', '/school/register']].map(([l, h]) => (
                <Link key={l} href={h} className="block py-1.5 hover:text-white transition-colors">{l}</Link>
              ))}
            </div>
            <div>
              <p className="text-white font-bold mb-4">Portal</p>
              {[['Log in', '/school'], ['Student portal', '/login'], ['Staff portal', '/login']].map(([l, h]) => (
                <Link key={l} href={h} className="block py-1.5 hover:text-white transition-colors">{l}</Link>
              ))}
            </div>
            <div>
              <p className="text-white font-bold mb-4">Contact</p>
              <a href="mailto:admin@florierenparklaneis.com.ng" className="block py-1.5 hover:text-white transition-colors">Email us</a>
              <a href="https://wa.me/2347031882197" className="block py-1.5 hover:text-white transition-colors">WhatsApp</a>
              <a href="tel:+2348000000000" className="block py-1.5 hover:text-white transition-colors">Call us</a>
              <a href="https://drive.google.com/uc?export=download&id=17d-QLydS0545Pu6cg0WpSgfjmyVTsAQU" target="_blank" rel="noreferrer" className="block py-1.5 hover:text-white transition-colors text-green-400">⬇ Download App</a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-blue-200/30">
          <p>© {new Date().getFullYear()} Smart Campus.</p>
          <p>All rights reserved</p>
        </div>
      </div>
    </footer>
  );
}
