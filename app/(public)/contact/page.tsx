'use client';
import { useState } from 'react';
import { CheckCircle2, Mail, MapPin, MessageSquare, Phone, Send, Globe } from 'lucide-react';
import { useSelectedSchool } from '@/hooks/useSelectedSchool';

export default function ContactPage() {
  const { school } = useSelectedSchool();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const primary = school?.primaryColor ?? '#1d4ed8';
  const contactInfo = [
    { icon: MapPin, label: 'Our Address', value: school?.location || school?.address || 'Not provided', sub: 'Come visit us on campus' },
    { icon: Phone, label: 'Phone Number', value: school?.telephone || 'Not provided', sub: school?.alternatePhone || 'School contact line' },
    { icon: Mail, label: 'Email Address', value: school?.contact?.email || school?.email || 'Not provided', sub: school?.contactName || 'School contact email' },
    { icon: Globe, label: 'Website', value: school?.website || 'Not provided', sub: 'Official online presence' },
  ];

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSent(true);
  };

  return (
    <div className="bg-white">
      <section className="relative overflow-hidden py-24 px-4 text-center" style={{ background: `linear-gradient(135deg,${primary},#111827)` }}>
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest">
            <MessageSquare size={13} /> Contact Us
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-5">
            We'd Love to Hear From You
          </h1>
          <p className="text-white/70 text-lg">
            Have a question, enquiry, or want to schedule a visit? Reach out to {school?.name ?? 'the school'}.
          </p>
        </div>
      </section>

      <section className="py-16 px-4 max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {contactInfo.map(({ icon: Icon, label, value, sub }) => (
            <div key={label} className="rounded-2xl border border-blue-100 bg-blue-50 p-5 hover:shadow-md hover:-translate-y-1 transition-all">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: primary }}>
                <Icon size={20} className="text-white" />
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
              <p className="font-semibold text-gray-900 text-sm leading-snug">{value}</p>
              <p className="text-gray-400 text-xs mt-1">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pb-20 px-4 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
            {sent ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center gap-4">
                <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
                  <CheckCircle2 size={40} className="text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Message Sent</h3>
                <p className="text-gray-500 text-sm max-w-xs">Thank you for reaching out. The school will get back to you soon.</p>
                <button onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }} className="mt-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: primary }}>
                  Send Another
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Send a Message</h2>
                  <p className="text-gray-400 text-sm mt-1">Fill in the form and the school can respond promptly.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {[
                    { key: 'name', label: 'Name', type: 'text', placeholder: 'Your full name' },
                    { key: 'email', label: 'Email', type: 'email', placeholder: 'your@email.com' },
                    { key: 'subject', label: 'Subject', type: 'text', placeholder: 'What is this about?' },
                  ].map(({ key, label, type, placeholder }) => (
                    <div key={key}>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">{label}</label>
                      <input
                        type={type}
                        required
                        value={form[key as keyof typeof form]}
                        onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                        placeholder={placeholder}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Message</label>
                    <textarea
                      rows={5}
                      required
                      value={form.message}
                      onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                      placeholder="Write your message here..."
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                    />
                  </div>
                  <button type="submit" className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm" style={{ backgroundColor: primary }}>
                    <Send size={15} /> Send Message
                  </button>
                </form>
              </>
            )}
          </div>

          <div className="rounded-3xl overflow-hidden border border-gray-100 shadow-sm min-h-[400px] bg-blue-50 flex flex-col">
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div>
                <MapPin className="mx-auto mb-4 text-blue-700" size={42} />
                <h3 className="font-bold text-gray-900">{school?.name ?? 'School Location'}</h3>
                <p className="mt-2 text-sm text-gray-500">{school?.location || school?.address || 'Location not provided'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
