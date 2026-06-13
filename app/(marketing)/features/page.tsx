import { LandingShell } from '@/components/landing/LandingShell';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { Reveal } from '@/components/landing/Reveal';
import { FEATURES } from '@/types/landing';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Features — Smart Campus', description: 'Everything included in Smart Campus: academics, transport, payments, HR, library, hostel and more.' };

export default function FeaturesPage() {
  return (
    <LandingShell>
      {/* Hero */}
      <section className="relative pt-36 pb-20 px-6 text-center overflow-hidden">
        <img src="/images/studentgroup1.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 animate-[kenBurns_12s_ease-in-out_infinite_alternate]" />
        <div className="absolute inset-0 bg-gray-950/80" />
        <div className="relative z-10">
        <Reveal>
          <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-4">What's included</p>
          <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-black text-white leading-tight mb-5">
            Everything in <span className="text-blue-300">one login</span>
          </h1>
          <p className="text-blue-100/70 text-[15px] max-w-xl mx-auto leading-8">
            No spreadsheets. No app-switching. Smart Campus handles every part of running your school.
          </p>
        </Reveal>
        </div>
      </section>

      <FeaturesSection />

      {/* Detail grid */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10">
          {[
            { title: 'CBT Exams', body: 'Staff create multiple-choice tests per subject. Students take them online and get instant scores. All results are stored and exportable.' },
            { title: 'Live GPS Transport', body: "Bus location is broadcast from the driver's phone in real time. Parents get alerts when the bus is 500m away and a confirmation on pickup." },
            { title: 'Paystack Payments', body: 'Students pay school fees directly from their portal. Payments are verified instantly and a QR receipt is generated — no manual collection needed.' },
            { title: 'Payroll & Leave', body: 'Configure salary structures, run monthly payroll, and let staff request leave — all from one HR dashboard.' },
            { title: 'Library & Barcodes', body: 'Manage your library with barcode scanning, borrowing records, return deadlines, and automatic fine tracking.' },
            { title: 'Finance Reports', body: 'Get a real-time view of income, expenses, outstanding debts, and payment summaries — broken down by term or session.' },
          ].map(({ title, body }, i) => (
            <Reveal key={title} delay={i * 0.07}>
              <div className="border border-blue-100 rounded-2xl p-8 hover:border-blue-300 hover:shadow-lg transition-all">
                <h3 className="font-black text-gray-900 text-lg mb-3">{title}</h3>
                <p className="text-gray-500 text-sm leading-7">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </LandingShell>
  );
}
