export default function ClassroomsPage() {
  return (
    <div>
      <section className="bg-green-900 text-white py-20 px-4 text-center">
        <h1 className="text-4xl font-extrabold mb-4">Our Classrooms</h1>
        <p className="text-white/70">Modern, well-equipped learning spaces designed for excellence.</p>
      </section>
      <section className="py-16 px-4 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          {['JSS 1–3', 'SSS 1–3', 'Science Lab', 'Computer Lab', 'Library', 'Art Studio'].map((room) => (
            <div key={room} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-3xl">🏫</div>
              <h3 className="font-bold text-gray-900">{room}</h3>
              <p className="text-gray-400 text-sm mt-1">Fully equipped</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
