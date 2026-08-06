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
    <Reveal className={`mb-14 ${centered ? 'text-center' : 'text-left'}`}>
      {/* eyebrow */}
      <div className={`flex items-center gap-3 mb-4 ${centered ? 'justify-center' : 'justify-start'}`}>
        <span className="h-px w-6 bg-blue-400" />
        <span className={`text-sm font-bold uppercase tracking-[0.2em] ${dark ? 'text-blue-300' : 'text-blue-600'}`}>
          {eyebrow}
        </span>
        <span className="h-px w-6 bg-blue-400" />
      </div>

      {/* title */}
      <h2 className={`text-[clamp(2rem,4vw,3rem)] font-black tracking-tight mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>
        {title}
      </h2>

      {/* subtitle */}
      {subtitle && (
        <p className={`max-w-lg text-[16px] leading-7 ${dark ? 'text-white/60' : 'text-gray-500'} ${centered ? 'mx-auto' : ''}`}>
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}
