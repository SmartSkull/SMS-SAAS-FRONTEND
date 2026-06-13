import { LandingShell } from '@/components/landing/LandingShell';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { Reveal } from '@/components/landing/Reveal';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'How It Works — Smart Campus', description: 'Get your school on Smart Campus in three simple steps.' };

const DETAILS = [
  {
    step: '01', title: 'Register your school',
    points: ['Fill in your school name, address, and contact details', 'Upload your school logo', 'Set your brand colours', 'Submit — activation within 24 hours'],
  },
  {
    step: '02', title: 'Add staff & students',
    points: ['Create admin, staff, and student accounts', 'Assign classes, subjects, and roles', 'Import records in bulk or add individually', 'Staff receive login credentials by email'],
  },
  {
    step: '03', title: 'Go live',
    points: ['Everyone logs in to their own portal', 'Collect fees, track buses, run CBT exams', 'Generate payslips, approve results, manage library', 'All from one platform — no extra apps'],
  },
];

export default function HowItWorksPage() {
  return (
    <LandingShell>
      <section className="pt-36 pb-20 px-6 bg-gray-950 text-center">
        <Reveal>
          <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-4">Simple setup</p>
          <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-black text-white leading-tight mb-5">
            Up and running <span className="text-blue-300">in minutes</span>
          </h1>
          <p className="text-blue-100/70 text-[15px] max-w-xl mx-auto leading-8">
            Three steps from sign-up to a fully operational school management platform.
          </p>
        </Reveal>
      </section>

      <HowItWorksSection />

      {/* Detailed steps */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto space-y-16">
          {DETAILS.map(({ step, title, points }, i) => (
            <Reveal key={step} delay={i * 0.1}>
              <div className="flex gap-8 items-start">
                <div className="shrink-0 w-14 h-14 rounded-full bg-blue-600 text-white font-black text-lg flex items-center justify-center shadow-lg">{+step}</div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 mb-4">{title}</h2>
                  <ul className="space-y-2">
                    {points.map(p => (
                      <li key={p} className="flex items-start gap-2.5 text-gray-500 text-sm leading-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-2" />{p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="py-20 px-6 bg-blue-600 text-center">
        <Reveal>
          <h2 className="text-3xl font-black text-white mb-6">Ready to get started?</h2>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/reach-us" className="px-8 py-4 bg-white text-blue-700 font-bold rounded-2xl text-[15px] hover:bg-blue-50 transition-all shadow-lg">Request a free demo</Link>
            <Link href="/school/register" className="px-8 py-4 bg-blue-700 text-white font-bold rounded-2xl text-[15px] hover:bg-blue-800 transition-all">Register your school</Link>
          </div>
        </Reveal>
      </section>
    </LandingShell>
  );
}
