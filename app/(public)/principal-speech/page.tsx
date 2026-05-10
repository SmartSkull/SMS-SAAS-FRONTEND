export default function PrincipalSpeechPage() {
  return (
    <div>
      <section className="bg-green-900 text-white py-20 px-4 text-center">
        <h1 className="text-4xl font-extrabold mb-4">Principal's Message</h1>
      </section>
      <section className="py-16 px-4 max-w-3xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-shrink-0 text-center">
            <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-5xl">👤</div>
            <p className="font-bold text-gray-900 mt-3">The Principal</p>
            <p className="text-blue-600 text-sm">Florieren Parklane IS</p>
          </div>
          <div className="flex-1">
            <blockquote className="text-gray-600 leading-relaxed space-y-4">
              <p>Dear Students, Parents, and Staff,</p>
              <p>Welcome to Florieren Parklane International School. It is my honour and privilege to lead this great institution dedicated to the holistic development of every child entrusted to our care.</p>
              <p>Our commitment is to provide an environment where every student can thrive academically, socially, and morally. We believe that education is not just about passing examinations, but about building character, developing critical thinking, and preparing our students for the challenges of tomorrow.</p>
              <p>Together, we will continue to uphold the values of excellence, integrity, and service that define our school community.</p>
              <p className="font-semibold text-gray-900">With warm regards,<br />The Principal</p>
            </blockquote>
          </div>
        </div>
      </section>
    </div>
  );
}
