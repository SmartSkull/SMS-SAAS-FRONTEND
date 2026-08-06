'use client';
import { BookOpen, Bus, ClipboardCheck, CreditCard, GraduationCap, Hotel, Landmark, MonitorPlay, Wallet, Sparkles } from 'lucide-react';
import { TICKER } from '@/types/landing';

const ICONS = [GraduationCap, Bus, CreditCard, Wallet, BookOpen, Hotel, MonitorPlay, Landmark, ClipboardCheck];
const CHIP_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1', '#f97316', '#14b8a6'];

export function TickerBar() {
  return (
    <div className="relative py-6 overflow-hidden select-none">
      {/* animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 animate-gradient-x" />
      {/* floating orbs */}
      <div className="absolute top-0 left-[15%] w-40 h-40 rounded-full bg-blue-400/30 blur-3xl animate-float-slow pointer-events-none" />
      <div className="absolute bottom-0 right-[20%] w-52 h-52 rounded-full bg-purple-400/20 blur-3xl animate-float-slower pointer-events-none" />

      {/* edge fades */}
      <div className="absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-blue-600 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-blue-700 to-transparent z-10 pointer-events-none" />

      <div className="ticker-t items-center">
        {[...TICKER, ...TICKER].map((t, i) => {
          const Icon = ICONS[i % ICONS.length];
          const chip = CHIP_COLORS[i % CHIP_COLORS.length];
          return (
            <span key={i} className="flex items-center gap-3 px-5">
              <span
                className="flex items-center gap-2.5 rounded-full border border-white/25 bg-white/10 backdrop-blur-md px-4 py-2.5 whitespace-nowrap shadow-lg"
                style={{ boxShadow: `0 4px 20px ${chip}33` }}
              >
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 animate-bounce-soft"
                  style={{ background: `${chip}2e`, color: '#fff', animationDelay: `${i * 0.12}s` }}
                >
                  <Icon size={15} />
                </span>
                <span className="text-white font-bold text-sm tracking-wide">{t}</span>
                <Sparkles size={14} className="text-white/60 animate-pulse" />
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
