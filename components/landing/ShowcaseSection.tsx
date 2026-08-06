'use client';
import { ArrowRight, Bus, CheckCircle, GraduationCap, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { Reveal } from './Reveal';

const SHOWCASES = [
  {
    icon: GraduationCap,
    label: 'Academic Management',
    title: 'Results, exams and assignments — all digital',
    desc: 'Publish results, run CBT exams, distribute assignments and keep timetables in sync. Students see everything from their own portal.',
    points: ['Automated result sheets', 'Online CBT exams', 'Homework & grading'],
    color: 'blue',
    image: '/images/chat system.svg',
    bg: 'white',
  },
  {
    icon: Bus,
    label: 'Smart Transport',
    title: 'Parents always know where the bus is',
    desc: 'Real-time GPS from the driver\'s phone. Alerts when the bus is 500m away. Automatic pickup confirmation the moment your child boards.',
    points: ['Live GPS tracking', 'Driver mobile app', 'Pickup confirmations'],
    color: 'indigo',
    image: '/images/phone slide.svg',
    bg: 'white',
  },
  {
    icon: CreditCard,
    label: 'Online Payments',
    title: 'School fees paid in seconds',
    desc: 'Students pay from their portal via Paystack. No queues, no manual records — QR-code receipts generated instantly.',
    points: ['Paystack checkout', 'Instant QR receipts', 'Payment history'],
    color: 'green',
    image: '/images/animated chair.svg',
    bg: 'white',
  },
];

export function ShowcaseSection() {
  return (
    <section id="features" className="py-24 md:py-32 px-6 bg-white">
      <div className="max-w-6xl mx-auto space-y-24 md:space-y-32">
        {SHOWCASES.map(({ icon: Icon, label, title, desc, points, color, image }, i) => {
          const reversed = i % 2 === 1;
          const textColor = color === 'green' ? 'text-green-600' : color === 'indigo' ? 'text-indigo-600' : 'text-blue-600';
          const iconBg = color === 'green' ? 'bg-green-100' : color === 'indigo' ? 'bg-indigo-100' : 'bg-blue-100';
          return (
            <div key={label} className={`grid md:grid-cols-2 gap-12 md:gap-16 items-center`}>
              <Reveal variant={reversed ? 'right' : 'left'} className={reversed ? 'md:order-2' : ''}>
                <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-gray-500 mb-6">
                  <Icon size={14} className={textColor} />
                  {label}
                </div>
                <h2 className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-black leading-tight tracking-tight text-gray-900 mb-5">
                  {title}
                </h2>
                <p className="text-gray-500 text-[15px] leading-8 mb-8">{desc}</p>
                <ul className="space-y-3 mb-10">
                  {points.map(p => (
                    <li key={p} className="flex items-center gap-3 text-gray-700 text-sm font-medium">
                      <CheckCircle size={17} className={`${textColor} shrink-0`} />
                      {p}
                    </li>
                  ))}
                </ul>
                <Link href="/school" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold text-[15px] transition-colors">
                  Learn more <ArrowRight size={16} />
                </Link>
              </Reveal>

              <Reveal variant={reversed ? 'left' : 'right'} delay={0.1} className={reversed ? 'md:order-1' : ''}>
                <div className="relative">
                  <div className={`absolute -inset-4 ${iconBg} opacity-60 rounded-[2.5rem] blur-xl pointer-events-none`} />
                  <div className="relative bg-white rounded-[2rem] border border-gray-100 shadow-[0_40px_100px_rgba(37,99,235,.15)] overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100">
                      <span className="w-3 h-3 rounded-full bg-red-400" />
                      <span className="w-3 h-3 rounded-full bg-yellow-400" />
                      <span className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="p-6 flex items-center justify-center">
                      <img
                        src={image}
                        alt={label}
                        className="w-full max-h-[420px] h-auto object-contain"
                      />
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          );
        })}
      </div>
    </section>
  );
}
