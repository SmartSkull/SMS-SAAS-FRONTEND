'use client';
import { useState, useEffect, useRef } from 'react';
import { useScroll, useTransform } from 'framer-motion';
import type { DemoForm } from '@/types/landing';

export function useLandingPage() {
  const [menu, setMenu]         = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [sent, setSent]         = useState(false);
  const [form, setForm]         = useState<DemoForm>({ name: '', school: '', email: '', phone: '' });
  const heroRef                 = useRef<HTMLDivElement>(null);
  const { scrollYProgress }     = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = encodeURIComponent(
      `*New Demo Request*\n\nName: ${form.name}\nSchool: ${form.school}\nEmail: ${form.email}\nPhone: ${form.phone}`
    );
    window.open(`https://wa.me/2347031882197?text=${msg}`, '_blank');
    setSent(true);
  };

  return { menu, setMenu, scrolled, sent, form, setForm, heroRef, heroY, submit };
}
