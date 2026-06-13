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
            <img src="/images/logo.png" alt="Smart Campus" className="h-8 w-auto" />
            <p className="text-blue-200/60 text-sm max-w-xs leading-7">Complete school management platform for Nigerian schools.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-10 text-sm text-blue-200/50">
            <div>
              <p className="text-white font-bold mb-4">Platform</p>
              {[['Features', '#features'], ['How it works', '#how-it-works'], ['Register', '/school/register']].map(([l, h]) => (
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
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-blue-200/30">
          <p>© {new Date().getFullYear()} Smart Campus · Powered by Florieren Parklane IS</p>
          <p>All rights reserved</p>
        </div>
      </div>
    </footer>
  );
}
