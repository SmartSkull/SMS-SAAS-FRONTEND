'use client';
import { BookOpen, Bus, ClipboardCheck, CreditCard, GraduationCap, Hotel, Landmark, MonitorPlay, Wallet } from 'lucide-react';
import { TICKER } from '@/types/landing';

const ICONS = [GraduationCap, Bus, CreditCard, Wallet, BookOpen, Hotel, MonitorPlay, Landmark, ClipboardCheck];

export function TickerBar() {
  return (
    <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 py-4 overflow-hidden select-none">
      {/* edge fades */}
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-blue-600 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-indigo-700 to-transparent z-10 pointer-events-none" />

      <div className="ticker-t items-center">
        {[...TICKER, ...TICKER].map((t, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <span key={i} className="flex items-center gap-3 px-8 text-blue-50 font-semibold text-sm whitespace-nowrap">
              <span className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Icon size={15} className="text-white" />
              </span>
              {t}
              <span className="w-1.5 h-1.5 rounded-full bg-blue-300/80 shrink-0" />
            </span>
          );
        })}
      </div>
    </div>
  );
}
