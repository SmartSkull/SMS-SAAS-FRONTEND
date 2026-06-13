'use client';
import { useRef, useEffect, useState } from 'react';

export function Reveal({ children, delay = 0, className = '', variant = 'up' }:
  { children: React.ReactNode; delay?: number; className?: string; variant?: 'up' | 'left' | 'right' | 'fade' }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { rootMargin: '-60px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const transforms: Record<string, string> = {
    up:    'translateY(32px)',
    left:  'translateX(-40px)',
    right: 'translateX(40px)',
    fade:  'none',
  };

  return (
    <div ref={ref} className={className} style={{
      opacity:    visible ? 1 : 0,
      transform:  visible ? 'none' : transforms[variant],
      transition: `opacity 0.6s ease ${delay}s, transform 0.65s ease ${delay}s`,
      willChange: 'transform, opacity',
    }}>
      {children}
    </div>
  );
}

// Keep named variant exports so existing imports don't break
export const slideL = 'left';
export const slideR = 'right';
export const fadeUp = 'up';
export const fadeIn = 'fade';
export const stagger = () => {};
