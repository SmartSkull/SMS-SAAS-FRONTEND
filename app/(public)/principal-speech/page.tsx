'use client';
import { useSelectedSchool } from '@/hooks/useSelectedSchool';

export default function PrincipalSpeechPage() {
  const { school } = useSelectedSchool();
  const primary = school?.primaryColor ?? '#14532d';

  return (
    <div>
      <section className="text-white py-20 px-4 text-center" style={{ backgroundColor: primary }}>
        <h1 className="text-4xl font-extrabold mb-4">Principal's Message</h1>
      </section>
      <section className="py-16 px-4 max-w-3xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-shrink-0 text-center">
            <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-5xl">👤</div>
            <p className="font-bold text-gray-900 mt-3">The Principal</p>
            <p className="text-blue-600 text-sm">{school?.name ?? 'School Portal'}</p>
          </div>
          <div className="flex-1">
            <blockquote className="text-gray-600 leading-relaxed space-y-4">
              <p>Dear Students, Parents, and Staff,</p>
              <p>Welcome to {school?.name ?? 'our school'}. It is my honour and privilege to lead an institution dedicated to the holistic development of every child entrusted to our care.</p>
              <p>Our commitment is to provide an environment where every student can thrive academically, socially, and morally.</p>
              <p>Together, we will continue to uphold the values that define our school community.</p>
              <p className="font-semibold text-gray-900">With warm regards,<br />The Principal</p>
            </blockquote>
          </div>
        </div>
      </section>
    </div>
  );
}
