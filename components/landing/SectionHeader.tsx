'use client';
import { Reveal } from './Reveal';

interface SectionHeaderProps {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
  /** Light sections (white/gray bg) vs dark sections (colored bg) */
  dark?: boolean;
  /** Left-aligned (for side-by-side layouts) or centered (default) */
  align?: 'center' | 'left';
}

export function SectionHeader({ eyebrow, title, subtitle, dark, align = 'center' }: SectionHeaderProps) {
  const centered = align === 'center';
  return (
    <Reveal className={`mb-16 ${centered ? 'text-center' : 'text-left'}`}>
      {/* eyebrow pill */}
      <div className={`inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-4 py-1.5 mb-5 shadow-sm`}>
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        <span className={`text-xs font-bold uppercase tracking-[0.15em] ${dark ? 'text-blue-300' : 'text-blue-700'}`}>
          {eyebrow}
        </span>
      </div>

      {/* title */}
      <h2 className={`text-[clamp(2rem,4vw,3rem)] font-black tracking-tight mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>
        {title}
      </h2>

      {/* decorative divider */}
      <div className={`flex items-center gap-1.5 mb-5 ${centered ? 'justify-center' : 'justify-start'}`}>
        <span className="h-1 w-8 rounded-full bg-blue-500" />
        <span className="h-1 w-2 rounded-full bg-blue-300" />
        <span className="h-1 w-8 rounded-full bg-indigo-500" />
      </div>

      {/* subtitle */}
      {subtitle && (
        <p className={`max-w-lg text-[15px] leading-7 ${dark ? 'text-white/60' : 'text-gray-500'} ${centered ? 'mx-auto' : ''}`}>
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}
