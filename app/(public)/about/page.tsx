import { BookOpen, Target, Eye, Star, Users, Award, Heart, Lightbulb } from 'lucide-react';

const VALUES = [
  { icon: Star,       label: 'Excellence',  desc: 'We pursue the highest standards in everything we do.' },
  { icon: Heart,      label: 'Integrity',   desc: 'Honesty and transparency guide every decision.' },
  { icon: Lightbulb, label: 'Innovation',   desc: 'We embrace creativity and forward thinking.' },
  { icon: Users,      label: 'Respect',     desc: 'Every individual is valued and celebrated.' },
  { icon: Award,      label: 'Teamwork',    desc: 'Together we achieve more than we can alone.' },
];

const STATS = [
  { value: '500+', label: 'Students Enrolled' },
  { value: '50+',  label: 'Qualified Staff' },
  { value: '15+',  label: 'Years of Excellence' },
  { value: '98%',  label: 'Pass Rate' },
];

export default function AboutPage() {
  return (
    <div className="bg-white">

      {/* Hero */}
      <section className="relative overflow-hidden py-24 px-4 text-center"
        style={{ background: 'linear-gradient(135deg,#1d4ed8 0%,#3b82f6 60%,#0ea5e9 100%)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%,#fff 1px,transparent 1px),radial-gradient(circle at 80% 20%,#fff 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest">
            <BookOpen size={13} /> About Us
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-5">
            Shaping Tomorrow's<br />Leaders Today
          </h1>
          <p className="text-white/75 text-lg leading-relaxed">
            Florieren Parklane International School is committed to providing world-class education
            in a nurturing, inclusive environment where every child thrives.
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-blue-900 py-8 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl font-extrabold text-white">{value}</p>
              <p className="text-blue-300 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="rounded-3xl p-8 border border-blue-100 bg-blue-50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-blue-100 -translate-y-1/2 translate-x-1/2" />
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center mb-5">
              <Target size={22} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Our Mission</h2>
            <p className="text-gray-600 leading-relaxed">
              To provide quality education that develops the intellectual, moral, social, and physical
              capabilities of every student — preparing them for success in a rapidly changing world.
            </p>
          </div>

          <div className="rounded-3xl p-8 border border-indigo-100 bg-indigo-50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-indigo-100 -translate-y-1/2 translate-x-1/2" />
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mb-5">
              <Eye size={22} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Our Vision</h2>
            <p className="text-gray-600 leading-relaxed">
              To be the leading educational institution in Nigeria, recognized for academic excellence,
              character development, and the production of future leaders.
            </p>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-blue-600 text-sm font-bold uppercase tracking-widest mb-2">What We Stand For</p>
            <h2 className="text-3xl font-extrabold text-gray-900">Our Core Values</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {VALUES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <Icon size={22} className="text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{label}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* School image + story */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-blue-600 text-sm font-bold uppercase tracking-widest mb-3">Our Story</p>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-5 leading-tight">
              A Legacy of Learning<br />and Leadership
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Founded with a vision to transform education in Nigeria, Florieren Parklane International
              School has grown into a beacon of academic excellence. Our campus provides a safe,
              stimulating environment where curiosity is encouraged and potential is unlocked.
            </p>
            <p className="text-gray-600 leading-relaxed">
              From nursery through senior secondary, we offer a comprehensive curriculum that blends
              rigorous academics with co-curricular activities, technology, and values-based education.
            </p>
            <a href="/admissions"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl text-white text-sm font-semibold btn-brand">
              Apply for Admission →
            </a>
          </div>
          <div className="relative">
            <div className="rounded-3xl overflow-hidden shadow-2xl aspect-[4/3] bg-blue-100 flex items-center justify-center">
              <img src="https://florierenparklaneis.com.ng/assets/img/florieren/logo.png"
                alt="School" className="w-40 h-40 object-contain opacity-30" />
            </div>
            <div className="absolute -bottom-4 -left-4 bg-blue-600 text-white rounded-2xl px-5 py-3 shadow-lg">
              <p className="text-2xl font-extrabold">15+</p>
              <p className="text-blue-200 text-xs">Years of Excellence</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
