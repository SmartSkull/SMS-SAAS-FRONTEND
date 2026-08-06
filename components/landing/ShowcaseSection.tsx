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
    grad: 'from-blue-500 to-indigo-600',
    glow: 'rgba(59,130,246,0.25)',
  },
  {
    icon: Bus,
    label: 'Smart Transport',
    title: 'Parents always know where the bus is',
    desc: 'Real-time GPS from the driver\'s phone. Alerts when the bus is 500m away. Automatic pickup confirmation the moment your child boards.',
    points: ['Live GPS tracking', 'Driver mobile app', 'Pickup confirmations'],
    color: 'indigo',
    image: '/images/phone slide.svg',
    grad: 'from-indigo-500 to-purple-600',
    glow: 'rgba(99,102,241,0.25)',
  },
  {
    icon: CreditCard,
    label: 'Online Payments',
    title: 'School fees paid in seconds',
    desc: 'Students pay from their portal via Paystack. No queues, no manual records — QR-code receipts generated instantly.',
    points: ['Paystack checkout', 'Instant QR receipts', 'Payment history'],
    color: 'green',
    image: '/images/animated chair.svg',
    grad: 'from-emerald-500 to-teal-600',
    glow: 'rgba(16,185,129,0.25)',
  },
];

export function ShowcaseSection() {
  return (
    <section id="features" className="py-24 md:py-32 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center mb-16 md:mb-24">
          <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-3">Platform features</p>
          <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-black tracking-tight text-gray-900 mb-4">
            Everything your school needs
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto text-[15px] leading-7">
            Three core pillars that power your whole school — from the classroom to the bus stop.
          </p>
        </Reveal>

        <div className="space-y-16 md:space-y-24">
          {SHOWCASES.map(({ icon: Icon, label, title, desc, points, color, image, grad, glow }, i) => {
            const reversed = i % 2 === 1;
            const textColor = color === 'green' ? 'text-emerald-600' : color === 'indigo' ? 'text-indigo-600' : 'text-blue-600';
            const iconBg = color === 'green' ? 'bg-emerald-100' : color === 'indigo' ? 'bg-indigo-100' : 'bg-blue-100';
            return (
              <div key={label} className={`grid md:grid-cols-2 gap-12 md:gap-20 items-center`}>
                <Reveal variant={reversed ? 'right' : 'left'} className={reversed ? 'md:order-2' : ''}>
                  <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-gray-500 mb-6">
                    <span className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center`}>
                      <Icon size={14} className={textColor} />
                    </span>
                    {label}
                  </div>
                  <h2 className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-black leading-tight tracking-tight text-gray-900 mb-5">
                    {title}
                  </h2>
                  <p className="text-gray-500 text-[15px] leading-8 mb-8">{desc}</p>
                  <ul className="space-y-3 mb-10">
                    {points.map(p => (
                      <li key={p} className="flex items-center gap-3 text-gray-700 text-sm font-medium">
                        <span className={`w-5 h-5 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
                          <CheckCircle size={13} className={textColor} />
                        </span>
                        {p}
                      </li>
                    ))}
                  </ul>
                  <Link href="/school" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold text-[15px] transition-colors group">
                    Learn more <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </Reveal>

                <Reveal variant={reversed ? 'left' : 'right'} delay={0.1} className={reversed ? 'md:order-1' : ''}>
                  <div className="group relative">
                    {/* animated glow behind */}
                    <div
                      className="absolute -inset-6 rounded-[3rem] blur-2xl opacity-60 transition-opacity duration-500 group-hover:opacity-90 pointer-events-none"
                      style={{ background: glow }}
                    />
                    {/* gradient card */}
                    <div className={`relative rounded-[2rem] overflow-hidden bg-gradient-to-br ${grad}`}>
                      {/* browser chrome */}
                      <div className="flex items-center justify-between px-5 py-3 bg-black/20 backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-white/30" />
                          <span className="w-3 h-3 rounded-full bg-white/30" />
                          <span className="w-3 h-3 rounded-full bg-white/30" />
                        </div>
                        <span className="text-white/70 text-[10px] font-semibold tracking-wide uppercase">{label}</span>
                      </div>
                      {/* svg */}
                      <div className="p-8 md:p-10 flex items-center justify-center min-h-[340px] md:min-h-[420px]">
                        <img
                          src={image}
                          alt={label}
                          className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      </div>
                    </div>
                  </div>
                </Reveal>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
