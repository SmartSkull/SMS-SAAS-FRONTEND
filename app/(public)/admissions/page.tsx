import Link from 'next/link';
import { FileText, ClipboardList, PenLine, MailCheck, CheckCircle2, GraduationCap, Users, BookOpen, Baby } from 'lucide-react';

const REQUIREMENTS = [
  'Birth certificate (original + photocopy)',
  'Previous school report card / transfer certificate',
  '4 recent passport photographs',
  'Parent or Guardian valid ID',
  'Completed application form',
];

const STEPS = [
  { icon: FileText,     title: 'Collect Form',       desc: 'Visit our school office or download the application form online.' },
  { icon: PenLine,      title: 'Fill & Submit',       desc: 'Complete the form and submit with all required documents.' },
  { icon: ClipboardList,title: 'Entrance Exam',       desc: 'Sit for our entrance examination at the scheduled date.' },
  { icon: MailCheck,    title: 'Admission Letter',    desc: 'Successful candidates receive an official admission letter.' },
];

const LEVELS = [
  { icon: Baby,          label: 'Pre-School',        range: 'Ages 2 – 4',   color: 'bg-pink-50 border-pink-100',   icon_bg: 'bg-pink-500' },
  { icon: BookOpen,      label: 'Primary School',    range: 'Ages 5 – 11',  color: 'bg-blue-50 border-blue-100',   icon_bg: 'bg-blue-500' },
  { icon: Users,         label: 'Junior Secondary',  range: 'Ages 11 – 14', color: 'bg-indigo-50 border-indigo-100', icon_bg: 'bg-indigo-600' },
  { icon: GraduationCap, label: 'Senior Secondary',  range: 'Ages 14 – 18', color: 'bg-violet-50 border-violet-100', icon_bg: 'bg-violet-600' },
];

export default function AdmissionsPage() {
  return (
    <div className="bg-white">

      {/* Hero */}
      <section className="relative overflow-hidden py-24 px-4 text-center"
        style={{ background: 'linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 50%,#0ea5e9 100%)' }}>
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest">
            <GraduationCap size={13} /> Admissions
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-5">
            Begin Your Journey<br />With Us
          </h1>
          <p className="text-white/70 text-lg max-w-xl mx-auto">
            Applications are open for the new academic session. Join our community of learners and unlock your child's full potential.
          </p>
          <Link href="/contact"
            className="inline-flex items-center gap-2 mt-8 px-7 py-3.5 bg-white text-blue-700 font-bold rounded-xl text-sm hover:bg-blue-50 transition-colors shadow-lg">
            Apply Now →
          </Link>
        </div>
      </section>

      {/* Levels */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-blue-600 text-sm font-bold uppercase tracking-widest mb-2">Who Can Apply</p>
          <h2 className="text-3xl font-extrabold text-gray-900">Levels We Offer</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {LEVELS.map(({ icon: Icon, label, range, color, icon_bg }) => (
            <div key={label} className={`rounded-2xl border p-6 text-center hover:shadow-md hover:-translate-y-1 transition-all ${color}`}>
              <div className={`w-12 h-12 rounded-2xl ${icon_bg} flex items-center justify-center mx-auto mb-4`}>
                <Icon size={22} className="text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{label}</h3>
              <p className="text-gray-500 text-sm">{range}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Requirements + Steps */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10">

          {/* Requirements */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center mb-5">
              <FileText size={22} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Requirements</h2>
            <ul className="space-y-4">
              {REQUIREMENTS.map((r) => (
                <li key={r} className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-blue-500 shrink-0 mt-0.5" />
                  <span className="text-gray-600 text-sm">{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Steps */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mb-5">
              <ClipboardList size={22} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">How to Apply</h2>
            <div className="space-y-5">
              {STEPS.map(({ icon: Icon, title, desc }, i) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                      <Icon size={17} className="text-blue-600" />
                    </div>
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{i + 1}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{title}</p>
                    <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 text-center"
        style={{ background: 'linear-gradient(135deg,#eff6ff,#e0f2fe)' }}>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-3">Ready to Enrol?</h2>
        <p className="text-gray-500 mb-6 max-w-md mx-auto text-sm">
          Contact our admissions office today. Our team is happy to guide you through the process.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/contact"
            className="px-7 py-3 rounded-xl text-white text-sm font-semibold btn-brand">
            Contact Admissions
          </Link>
          <Link href="/about"
            className="px-7 py-3 rounded-xl text-sm font-semibold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 transition-colors">
            Learn About Us
          </Link>
        </div>
      </section>

    </div>
  );
}
