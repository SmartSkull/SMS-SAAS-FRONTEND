'use client';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

export const fadeUp  = { hidden:{opacity:0,y:32}, show:{opacity:1,y:0,transition:{duration:.6,ease:'easeOut' as const}} };
export const fadeIn  = { hidden:{opacity:0},      show:{opacity:1,transition:{duration:.5}} };
export const stagger = (d=.08) => ({ hidden:{}, show:{transition:{staggerChildren:d}} });
export const slideL  = { hidden:{opacity:0,x:-40}, show:{opacity:1,x:0,transition:{duration:.65,ease:'easeOut' as const}} };
export const slideR  = { hidden:{opacity:0,x:40},  show:{opacity:1,x:0,transition:{duration:.65,ease:'easeOut' as const}} };

export function Reveal({ children, variants = fadeUp, delay = 0, className = '' }:
  { children: React.ReactNode; variants?: any; delay?: number; className?: string }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} variants={variants} initial="hidden"
      animate={inView ? 'show' : 'hidden'} transition={{ delay }}
      className={className} style={{ willChange: 'transform, opacity' }}>
      {children}
    </motion.div>
  );
}
