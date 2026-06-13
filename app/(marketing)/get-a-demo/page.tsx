'use client';
import { useState } from 'react';
import { LandingShell } from '@/components/landing/LandingShell';
import { Reveal } from '@/components/landing/Reveal';
import { CheckCircle } from 'lucide-react';
import { FEATURES } from '@/types/landing';

export default function GetADemoPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', school: '', email: '', phone: '' });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const msg = encodeURIComponent(
      `*New Demo Request*\n\nName: ${form.name}\nSchool: ${form.school}\nEmail: ${form.email}\nPhone: ${form.phone}`
    );
    window.open(`https://wa.me/2347031882197?text=${msg}`, '_blank');
    setSent(true);
  }

  return (
    <LandingShell>
      <section className="pt-36 pb-20 px-6 bg-gray-950 text-center">
        <Reveal>
          <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-4">Free Demo</p>
          <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-black text-white leading-tight mb-5">
            See Smart Campus <span className="text-blue-300">in action</span>
          </h1>
          <p className="text-blue-100/70 text-[15px] max-w-xl mx-auto leading-8">
            We'll walk you through the full platform live — tailored to your school. Free, no commitment.
          </p>
        </Reveal>
      </section>

      <section className="py-24 px-6 bg-[#e8f0fe]">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-start">

          {/* What you'll see */}
          <Reveal variant="left">
            <h2 className="text-2xl font-black text-gray-900 mb-6">What's in the demo</h2>
            <ul className="space-y-4">
              {FEATURES.map(({ label, desc, bg, ic, icon }) => (
                <li key={label} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg, color: ic }}>
                    {icon}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{label}</p>
                    <p className="text-gray-500 text-xs leading-5">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* Form */}
          <Reveal variant="right" delay={0.1}>
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
                <h3 className="font-black text-xl text-gray-900 mb-1">Request your free demo</h3>
                <p className="text-sm text-gray-400 mb-2">Fill in your details and we'll reach out to schedule a walkthrough.</p>
                {([
                  { k: 'name',   p: 'Your name *',     r: true,  t: 'text' },
                  { k: 'school', p: 'School name *',   r: true,  t: 'text' },
                  { k: 'email',  p: 'Email address *', r: true,  t: 'email' },
                  { k: 'phone',  p: 'Phone number',    r: false, t: 'tel' },
                ] as const).map(({ k, p, r, t }) => (
                  <input key={k} type={t} required={r} placeholder={p}
                    value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                    className="w-full bg-blue-50 border border-blue-100 focus:border-blue-400 rounded-xl px-4 py-3.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all" />
                ))}
                <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[15px] transition-all shadow-[0_4px_16px_rgba(37,99,235,.3)]">
                  Request Free Demo
                </button>
              </form>
            )}
          </Reveal>
        </div>
      </section>
    </LandingShell>
  );
}
