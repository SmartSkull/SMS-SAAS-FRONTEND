import Link from 'next/link';

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative bg-green-900 text-white py-28 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://florierenparklaneis.com.ng/assets/img/florieren/logo.png')] bg-center bg-no-repeat opacity-5" />
        <div className="absolute -top-32 -left-20 w-96 h-96 bg-lime-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 btn-brand/20 rounded-full blur-3xl" />
        <div className="relative max-w-4xl mx-auto text-center">
          <img src="https://florierenparklaneis.com.ng/assets/img/florieren/logo.png"
            alt="Logo" className="w-24 h-24 rounded-full mx-auto mb-6 ring-4 ring-white/20" />
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight">
            Florieren Parklane<br />
            <span className="text-lime-300">International School</span>
          </h1>
          <p className="text-white/70 text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            Excellence in Education. Nurturing Future Leaders. Building Character.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/admissions"
              className="px-8 py-3 bg-lime-400 text-green-900 font-bold rounded-xl hover:bg-lime-300 transition-colors">
              Apply Now
            </Link>
            <Link href="/about"
              className="px-8 py-3 border border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '500+', label: 'Students' },
            { value: '50+', label: 'Staff Members' },
            { value: '20+', label: 'Years of Excellence' },
            { value: '100%', label: 'Pass Rate' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-4xl font-extrabold text-blue-700">{value}</p>
              <p className="text-gray-500 mt-1 text-sm">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Why Choose Us?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'Academic Excellence', desc: 'Rigorous curriculum designed to challenge and inspire students to reach their full potential.' },
              { title: 'Modern Facilities', desc: 'State-of-the-art classrooms, library, and computer labs equipped for 21st century learning.' },
              { title: 'Holistic Development', desc: 'Sports, arts, and extracurricular activities to develop well-rounded individuals.' },
            ].map(({ title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-blue-700 text-xl">✦</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-green-800 text-white py-16 px-4 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Join Our School?</h2>
        <p className="text-white/70 mb-8">Applications are open for the new academic session.</p>
        <Link href="/admissions"
          className="inline-block px-8 py-3 bg-lime-400 text-green-900 font-bold rounded-xl hover:bg-lime-300 transition-colors">
          Start Your Application
        </Link>
      </section>
    </div>
  );
}
