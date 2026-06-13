'use client';
import { useState } from 'react';
import { LandingShell } from '@/components/landing/LandingShell';
import { Reveal } from '@/components/landing/Reveal';
import { CheckCircle, Mail, MessageCircle, Phone } from 'lucide-react';

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', school: '', email: '', phone: '', message: '' });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = encodeURIComponent(
      `*Smart Campus Enquiry*\n\nName: ${form.name}\nSchool: ${form.school}\nEmail: ${form.email}\nPhone: ${form.phone}\n\n${form.message}`
    );
    window.open(`https://wa.me/2347031882197?text=${text}`, '_blank');
    setSent(true);
  }

  return (
    <LandingShell>
      <section className="pt-36 pb-20 px-6 bg-gray-950 text-center">
        <Reveal>
          <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-4">Get in touch</p>
          <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-black text-white leading-tight mb-5">
            We'd love to <span className="text-blue-300">hear from you</span>
          </h1>
          <p className="text-blue-100/70 text-[15px] max-w-xl mx-auto leading-8">
            Questions, feedback, or just want to learn more — reach out and we'll get back to you within 24 hours.
          </p>
        </Reveal>
      </section>

      <section className="py-24 px-6 bg-[#e8f0fe]">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-start">

          {/* Contact info */}
          <Reveal variant="left">
            <h2 className="text-2xl font-black text-gray-900 mb-8">Contact details</h2>
            <div className="space-y-6">
              {[
                { icon: Mail, label: 'Email', value: 'admin@florierenparklaneis.com.ng', href: 'mailto:admin@florierenparklaneis.com.ng' },
                { icon: MessageCircle, label: 'WhatsApp', value: '+234 703 188 2197', href: 'https://wa.me/2347031882197' },
                { icon: Phone, label: 'Phone', value: '+234 703 188 2197', href: 'tel:+2347031882197' },
              ].map(({ icon: Icon, label, value, href }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer"
                  className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-blue-100 hover:border-blue-300 hover:shadow-md transition-all">
                  <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                    <p className="font-semibold text-gray-900 text-sm">{value}</p>
                  </div>
                </a>
              ))}
            </div>
          </Reveal>

          {/* Form */}
          <Reveal variant="right" delay={0.1}>
            {sent ? (
              <div className="bg-white rounded-3xl p-12 text-center flex flex-col items-center gap-4 shadow-lg animate-[fadeScale_.35s_ease_both]">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <CheckCircle size={32} className="text-blue-600" />
                </div>
                <p className="font-black text-xl text-gray-900">Message sent!</p>
                <p className="text-gray-400 text-sm">We'll be in touch within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="bg-white rounded-3xl p-8 shadow-lg space-y-4">
                <h3 className="font-black text-xl text-gray-900 mb-1">Send us a message</h3>
                {([
                  { k: 'name',    p: 'Your name *',     r: true,  t: 'text' },
                  { k: 'school',  p: 'School name',      r: false, t: 'text' },
                  { k: 'email',   p: 'Email address *',  r: true,  t: 'email' },
                  { k: 'phone',   p: 'Phone number',     r: false, t: 'tel' },
                ] as const).map(({ k, p, r, t }) => (
                  <input key={k} type={t} required={r} placeholder={p}
                    value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                    className="w-full bg-blue-50 border border-blue-100 focus:border-blue-400 rounded-xl px-4 py-3.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all" />
                ))}
                <textarea required rows={4} placeholder="Your message *"
                  value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  className="w-full bg-blue-50 border border-blue-100 focus:border-blue-400 rounded-xl px-4 py-3.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all resize-none" />
                <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[15px] transition-all shadow-[0_4px_16px_rgba(37,99,235,.3)]">
                  Send Message
                </button>
              </form>
            )}
          </Reveal>
        </div>
      </section>
    </LandingShell>
  );
}
