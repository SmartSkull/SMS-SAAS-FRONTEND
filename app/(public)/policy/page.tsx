export default function PolicyPage() {
  const policies = [
    { title: 'Attendance Policy', content: 'Students are expected to maintain at least 75% attendance per term. Consistent absence without valid reason may result in disciplinary action.' },
    { title: 'Uniform Policy', content: 'All students must wear the prescribed school uniform on all school days. Neat appearance is mandatory.' },
    { title: 'Academic Integrity', content: 'Cheating, plagiarism, or any form of academic dishonesty is strictly prohibited and will result in disciplinary measures.' },
    { title: 'Behaviour & Conduct', content: 'Students are expected to show respect to all staff, fellow students, and school property at all times.' },
    { title: 'Mobile Devices', content: 'Mobile phones are not permitted during school hours unless authorized by a teacher for educational purposes.' },
  ];

  return (
    <div>
      <section className="bg-green-900 text-white py-20 px-4 text-center">
        <h1 className="text-4xl font-extrabold mb-4">School Policy</h1>
        <p className="text-white/70">Our policies ensure a safe and productive learning environment.</p>
      </section>
      <section className="py-16 px-4 max-w-3xl mx-auto space-y-6">
        {policies.map(({ title, content }) => (
          <div key={title} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 text-sm">{content}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
