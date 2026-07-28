import {
  Download,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Zap,
  BookOpen,
  Bus,
  CreditCard,
  BarChart2,
  Users,
  TrendingUp,
} from 'lucide-react';

const DRIVE_URL = 'https://drive.google.com/uc?export=download&id=1UVJwIdUYA0kF7QUAsRqCfab3383-FZIm';

export default function DownloadPage() {

  const features = [
    { icon: BookOpen,  label: 'Academic Results',  desc: 'View term results, grade reports and performance trends' },
    { icon: Bus,       label: 'Live Transport',     desc: 'Real-time GPS bus tracking with arrival alerts' },
    { icon: CreditCard,label: 'School Fees',        desc: 'Pay fees online with instant QR receipt' },
    { icon: BarChart2, label: 'Attendance',         desc: 'Daily attendance tracking and term summaries' },
    { icon: Users,     label: 'Staff Portal',       desc: 'Result entry, CBT, payroll and leave management' },
    { icon: TrendingUp,label: 'Admin Dashboard',    desc: 'School-wide analytics, approvals and settings' },
  ];

  const requirements = [
    'Android 6.0 (Marshmallow) or higher',
    'At least 100 MB free storage',
    'Internet connection required',
    '"Install unknown apps" permission',
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ── Hero ── */}
      <section className="relative pt-24 pb-20 px-6 overflow-hidden">
        {/* gradient blobs */}
        <div className="pointer-events-none absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-violet-700/20 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 w-[400px] h-[400px] rounded-full bg-indigo-600/20 blur-[100px]" />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          {/* App icon */}
          <div className="mx-auto mb-8 w-28 h-28 rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-violet-900/60 ring-1 ring-white/10 animate-[pulse_3s_ease-in-out_infinite]">
            <Smartphone size={52} className="text-white" strokeWidth={1.5} />
          </div>

          <p className="text-violet-400 text-xs font-bold uppercase tracking-widest mb-3">Mobile App · Android</p>
          <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
            Florieren School App
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            The all-in-one school companion for students, parents and staff — results, attendance, transport and more in your pocket.
          </p>

          {/* Meta pills */}
          <div className="flex flex-wrap gap-3 justify-center mb-10">
            {[
              { icon: Smartphone,  label: 'Android APK' },
              { icon: ShieldCheck, label: 'Verified & Safe' },
              { icon: Zap,         label: 'Version 1.0.0' },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 font-medium">
                <Icon size={14} className="text-violet-400" />
                {label}
              </span>
            ))}
          </div>

          {/* ── Download card ── */}
          <div className="max-w-md mx-auto bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
            <a
              href={DRIVE_URL}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-lg transition-all duration-200 shadow-lg shadow-violet-900/50 hover:shadow-violet-900/70 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Download size={22} />
              Download APK
            </a>
            <p className="mt-5 text-xs text-gray-600 text-center leading-5">
              Enable <span className="text-gray-400 font-semibold">Install from unknown sources</span> in Android Settings before installing.
            </p>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 px-6 bg-gray-900/60">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-black text-center mb-2">Everything in one app</h2>
          <p className="text-gray-500 text-center text-sm mb-12">All the tools students, staff and administrators need — on Android.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-violet-500/30 hover:bg-violet-500/5 transition-all duration-200 group">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                  <Icon size={18} className="text-violet-400" />
                </div>
                <div>
                  <p className="font-bold text-sm text-white mb-1">{label}</p>
                  <p className="text-xs text-gray-500 leading-5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Requirements ── */}
      <section className="py-20 px-6">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-black text-center mb-8">System Requirements</h2>
          <div className="space-y-3">
            {requirements.map((req) => (
              <div key={req} className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <CheckCircle2 size={16} className="text-violet-400 flex-shrink-0" />
                <span className="text-sm text-gray-400">{req}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Install guide ── */}
      <section className="py-20 px-6 bg-gray-900/60">
        <div className="max-w-lg mx-auto">
          <h2 className="text-xl font-black text-center mb-8">How to Install</h2>
          <div className="space-y-4">
            {[
              { step: '01', title: 'Download the APK',       desc: 'Tap the download button above and wait for the file to save to your device.' },
              { step: '02', title: 'Allow unknown sources',  desc: 'Go to Settings → Apps → Special app access → Install unknown apps and enable it for your browser.' },
              { step: '03', title: 'Open the APK file',      desc: 'Find the file in your Downloads folder and tap it to begin installation.' },
              { step: '04', title: 'Launch and log in',      desc: 'Open the app, select your school, and sign in with your portal credentials.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-5 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <span className="flex-shrink-0 text-3xl font-black text-violet-800/60">{step}</span>
                <div>
                  <p className="font-bold text-sm text-white mb-1">{title}</p>
                  <p className="text-xs text-gray-500 leading-5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="py-16 px-6 text-center border-t border-white/5">
        <p className="text-gray-600 text-sm mb-4">Already have an account? Access via browser instead.</p>
        <a href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-sm font-semibold text-gray-400 hover:border-violet-500/40 hover:text-white transition-colors">
          Open Web Portal →
        </a>
      </section>

    </div>
  );
}
