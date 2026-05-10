'use client';
import { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2, MessageSquare } from 'lucide-react';

const CONTACT_INFO = [
  {
    icon: MapPin,
    label: 'Our Address',
    value: 'Parklane, Enugu State, Nigeria',
    sub: 'Come visit us on campus',
    color: 'bg-blue-600',
    light: 'bg-blue-50 border-blue-100',
  },
  {
    icon: Phone,
    label: 'Phone Number',
    value: '+234 000 000 0000',
    sub: 'Mon – Fri, 8am – 4pm',
    color: 'bg-indigo-600',
    light: 'bg-indigo-50 border-indigo-100',
  },
  {
    icon: Mail,
    label: 'Email Address',
    value: 'info@florierenparklaneis.com.ng',
    sub: 'We reply within 24 hours',
    color: 'bg-violet-600',
    light: 'bg-violet-50 border-violet-100',
  },
  {
    icon: Clock,
    label: 'Office Hours',
    value: 'Mon – Fri: 8:00am – 4:00pm',
    sub: 'Closed on public holidays',
    color: 'bg-cyan-600',
    light: 'bg-cyan-50 border-cyan-100',
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="bg-white">

      {/* Hero */}
      <section className="relative overflow-hidden py-24 px-4 text-center"
        style={{ background: 'linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 50%,#0ea5e9 100%)' }}>
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest">
            <MessageSquare size={13} /> Contact Us
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-5">
            We'd Love to<br />Hear From You
          </h1>
          <p className="text-white/70 text-lg">
            Have a question, enquiry, or want to schedule a visit? Reach out — we're here to help.
          </p>
        </div>
      </section>

      {/* Contact info cards */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CONTACT_INFO.map(({ icon: Icon, label, value, sub, color, light }) => (
            <div key={label} className={`rounded-2xl border p-5 hover:shadow-md hover:-translate-y-1 transition-all ${light}`}>
              <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center mb-4`}>
                <Icon size={20} className="text-white" />
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
              <p className="font-semibold text-gray-900 text-sm leading-snug">{value}</p>
              <p className="text-gray-400 text-xs mt-1">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Form + Map */}
      <section className="pb-20 px-4 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8">

          {/* Form */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
            {sent ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center gap-4">
                <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
                  <CheckCircle2 size={40} className="text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Message Sent!</h3>
                <p className="text-gray-500 text-sm max-w-xs">Thank you for reaching out. We'll get back to you within 24 hours.</p>
                <button onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
                  className="mt-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white btn-brand">
                  Send Another
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Send a Message</h2>
                  <p className="text-gray-400 text-sm mt-1">Fill in the form and we'll respond promptly.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Name</label>
                      <input type="text" required value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Your full name"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Email</label>
                      <input type="email" required value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        placeholder="your@email.com"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Subject</label>
                    <input type="text" required value={form.subject}
                      onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                      placeholder="What is this about?"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Message</label>
                    <textarea rows={5} required value={form.message}
                      onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                      placeholder="Write your message here…"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none" />
                  </div>
                  <button type="submit"
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm btn-brand">
                    <Send size={15} /> Send Message
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Map embed */}
          <div className="rounded-3xl overflow-hidden border border-gray-100 shadow-sm min-h-[400px] bg-blue-50 flex flex-col">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3964.0!2d7.49!3d6.44!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNsKwMjYnMjQuMCJOIDfCsDI5JzI0LjAiRQ!5e0!3m2!1sen!2sng!4v1"
              className="flex-1 w-full min-h-[340px] grayscale"
              style={{ border: 0, filter: 'hue-rotate(200deg) saturate(0.6)' }}
              allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            <div className="p-5 bg-white border-t border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                  <MapPin size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Florieren Parklane IS</p>
                  <p className="text-xs text-gray-400">Parklane, Enugu State, Nigeria</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
