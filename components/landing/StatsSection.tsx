'use client';
import { BookOpen, Bus, ClipboardCheck, CreditCard, GraduationCap, Hotel, Landmark, MonitorPlay, Wallet, Sparkles } from 'lucide-react';
import { TICKER } from '@/types/landing';

const ICONS = [GraduationCap, Bus, CreditCard, Wallet, BookOpen, Hotel, MonitorPlay, Landmark, ClipboardCheck];

export function TickerBar() {
  return (
    <div className="relative py-5 bg-blue-600 overflow-hidden select-none">
      <div className="ticker-t items-center">
        {[...TICKER, ...TICKER].map((t, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <span key={i} className="flex items-center gap-3 px-5">
              <span className="flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 whitespace-nowrap">
                <span
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 animate-bounce-soft"
                  style={{ animationDelay: `${i * 0.12}s` }}
                >
                  <Icon size={15} className="text-white" />
                </span>
                <span className="text-white font-semibold text-sm tracking-wide">{t}</span>
                <Sparkles size={14} className="text-white/70 animate-pulse" />
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
