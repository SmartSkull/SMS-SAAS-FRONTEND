'use client';
import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { Reveal } from './Reveal';
import type { DemoForm } from '@/types/landing';

interface ContactSectionProps {
  sent: boolean;
  form: DemoForm;
  setForm: React.Dispatch<React.SetStateAction<DemoForm>>;
  submit: (e: React.FormEvent) => void;
}

export function ContactSection({ sent, form, setForm, submit }: ContactSectionProps) {
  return (
    <section id="contact" className="py-28 px-6 bg-blue-700">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-20 items-start">
        <Reveal variant="left" className="flex-1">
          <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-4">Free Demo</p>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-black leading-tight text-white mb-5">
            See Smart Campus<br />in action
          </h2>
          <p className="text-blue-100 text-[15px] leading-8 mb-10">
            We'll set up a live walkthrough tailored to your school — free, no commitment.
          </p>
          <div className="flex flex-col gap-3 max-w-xs">
            <div className="relative w-full h-44 rounded-2xl overflow-hidden shadow-lg">
              <img src="/images/studentgroup2.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gray-950/30" />
            </div>
            <div className="flex gap-3">
              {['/images/student2.jpg', '/images/student3.jpg'].map((src, i) => (
                <div key={i} className="relative flex-1 h-28 rounded-xl overflow-hidden shadow-md">
                  <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal variant="right" delay={0.1} className="flex-1 w-full">
          {sent ? (
            <div className="bg-white rounded-3xl p-12 text-center flex flex-col items-center gap-4 shadow-lg animate-[fadeScale_.35s_ease_both]">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckCircle size={32} className="text-blue-600" />
              </div>
              <p className="font-black text-xl text-gray-900">Request sent!</p>
              <p className="text-gray-400 text-sm">We'll be in touch within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="bg-white rounded-3xl p-8 shadow-lg space-y-4">
              <h3 className="font-black text-xl text-gray-900 mb-1">Request a free demo</h3>
              <p className="text-sm text-gray-400 mb-4">Fill in your details and we'll reach out.</p>
              {([
                { k: 'name',   p: 'Your name',      r: true,  t: 'text' },
                { k: 'school', p: 'School name',    r: true,  t: 'text' },
                { k: 'email',  p: 'Email address',  r: true,  t: 'email' },
                { k: 'phone',  p: 'Phone number',   r: false, t: 'tel' },
              ] as const).map(({ k, p, r, t }) => (
                <input key={k} type={t} required={r}
                  placeholder={`${p}${r ? ' *' : ''}`}
                  value={form[k]}
                  onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                  className="w-full bg-blue-50 border border-blue-100 focus:border-blue-400 rounded-xl px-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all" />
              ))}
              <button type="submit"
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[15px] transition-all shadow-[0_4px_16px_rgba(37,99,235,.3)]">
                Request Free Demo
              </button>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}
