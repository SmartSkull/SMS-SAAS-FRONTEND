'use client';
import { useState, useEffect } from 'react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/FooterSection';

export function LandingShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);
  return (
    <div className="bg-[#e8f0fe] text-gray-900 overflow-x-hidden">
      <Navbar scrolled={scrolled} menu={menu} setMenu={setMenu} />
      {children}
      <Footer />
    </div>
  );
}
