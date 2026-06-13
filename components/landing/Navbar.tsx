'use client';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';

interface NavbarProps {
  scrolled: boolean;
  menu: boolean;
  setMenu: (v: boolean | ((p: boolean) => boolean)) => void;
}

const NAV = [['Features', '/features'], ['How it works', '/how-it-works'], ['Contact', '/reach-us']];

export function Navbar({ scrolled, menu, setMenu }: NavbarProps) {
  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-blue-500/95 backdrop-blur-md shadow-[0_2px_20px_rgba(37,99,235,.12)] border-b border-blue-400' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 h-[68px] flex items-center justify-between">
        <div className="select-none animate-[fadeSlideL_.5s_ease_both]">
          <img src="/images/logo.png" alt="Smart Campus" className="h-20 w-auto" />
        </div>

        <nav className="hidden md:flex items-center gap-8 text-[14px] text-white/80 font-medium animate-[fadeIn_.5s_.2s_ease_both] opacity-0" style={{ animationFillMode: 'forwards' }}>
          {NAV.map(([l, h]) => (
            <a key={l} href={h} className="hover:text-white transition-colors">{l}</a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3 animate-[fadeSlideR_.5s_.3s_ease_both] opacity-0" style={{ animationFillMode: 'forwards' }}>
          <Link href="/school" className="text-[14px] font-semibold text-white/80 hover:text-white px-4 py-2 transition-colors">Log in</Link>
          <a href="/get-a-demo" className="text-[14px] font-bold px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-[0_4px_14px_rgba(37,99,235,.35)]">
            Get a demo
          </a>
        </div>

        <button className="md:hidden text-white" onClick={() => setMenu(v => !v)}>
          {menu ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <div className="md:hidden overflow-hidden transition-all duration-250 ease-in-out" style={{ maxHeight: menu ? '300px' : '0px', opacity: menu ? 1 : 0 }}>
        <div className="px-6 pb-6 pt-2 border-t border-blue-400 bg-blue-500 flex flex-col gap-5">
          {NAV.map(([l, h]) => (
            <a key={l} href={h} onClick={() => setMenu(false)} className="font-semibold text-white">{l}</a>
          ))}
          <div className="flex gap-3">
            <Link href="/school" onClick={() => setMenu(false)} className="flex-1 text-center border border-white/40 py-3 rounded-xl font-semibold text-sm text-white">Log in</Link>
            <a href="/get-a-demo" onClick={() => setMenu(false)} className="flex-1 text-center bg-blue-600 text-white py-3 rounded-xl font-bold text-sm">Get a demo</a>
          </div>
        </div>
      </div>
    </header>
  );
}
