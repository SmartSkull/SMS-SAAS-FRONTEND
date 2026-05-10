'use client';
import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Images } from 'lucide-react';

const BASE = 'https://florierenparklaneis.com.ng/assets/img/florieren';

const PHOTOS = [
  { src: `${BASE}/slide1.jpg`,   cat: 'Campus',    caption: 'School Entrance' },
  { src: `${BASE}/slide2.jpg`,   cat: 'Campus',    caption: 'School Building' },
  { src: `${BASE}/slide3.jpg`,   cat: 'Campus',    caption: 'School Grounds' },
  { src: `${BASE}/about1.jpg`,   cat: 'Students',  caption: 'Students in Class' },
  { src: `${BASE}/about2.jpg`,   cat: 'Students',  caption: 'Learning Together' },
  { src: `${BASE}/about3.jpg`,   cat: 'Students',  caption: 'Student Activities' },
  { src: `${BASE}/event1.jpg`,   cat: 'Events',    caption: 'School Event' },
  { src: `${BASE}/event2.jpg`,   cat: 'Events',    caption: 'Prize Giving Day' },
  { src: `${BASE}/event3.jpg`,   cat: 'Events',    caption: 'Graduation Ceremony' },
  { src: `${BASE}/sport1.jpg`,   cat: 'Sports',    caption: 'Sports Day' },
  { src: `${BASE}/sport2.jpg`,   cat: 'Sports',    caption: 'Football Match' },
  { src: `${BASE}/logo.png`,     cat: 'Campus',    caption: 'School Logo' },
];

const CATS = ['All', ...Array.from(new Set(PHOTOS.map((p) => p.cat)))];

export default function GalleryPage() {
  const [active, setActive] = useState('All');
  const [lightbox, setLightbox] = useState<number | null>(null);

  const filtered = active === 'All' ? PHOTOS : PHOTOS.filter((p) => p.cat === active);

  const prev = () => setLightbox((i) => (i! > 0 ? i! - 1 : filtered.length - 1));
  const next = () => setLightbox((i) => (i! < filtered.length - 1 ? i! + 1 : 0));

  return (
    <div className="bg-white">

      {/* Hero */}
      <section className="relative overflow-hidden py-24 px-4 text-center"
        style={{ background: 'linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 50%,#0ea5e9 100%)' }}>
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest">
            <Images size={13} /> Gallery
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4">
            Life at Florieren<br />Parklane IS
          </h1>
          <p className="text-white/70 text-lg">A glimpse into our vibrant school community.</p>
        </div>
      </section>

      {/* Filter tabs */}
      <section className="py-10 px-4">
        <div className="flex flex-wrap justify-center gap-2">
          {CATS.map((cat) => (
            <button key={cat} onClick={() => setActive(cat)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                active === cat
                  ? 'text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={active === cat ? { background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' } : {}}>
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section className="pb-20 px-4 max-w-6xl mx-auto">
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {filtered.map((photo, i) => (
            <div key={i} onClick={() => setLightbox(i)}
              className="break-inside-avoid rounded-2xl overflow-hidden cursor-pointer group relative shadow-sm hover:shadow-xl transition-all duration-300">
              <img src={photo.src} alt={photo.caption}
                className="w-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://placehold.co/400x300/dbeafe/1d4ed8?text=${encodeURIComponent(photo.caption)}`;
                }} />
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-blue-900/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                <div>
                  <p className="text-white text-xs font-semibold">{photo.caption}</p>
                  <span className="text-blue-200 text-[10px]">{photo.cat}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-20">No photos in this category yet.</p>
        )}
      </section>

      {/* Lightbox */}
      {lightbox !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <button onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <ChevronLeft size={22} />
          </button>

          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={filtered[lightbox].src} alt={filtered[lightbox].caption}
              className="w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://placehold.co/800x600/dbeafe/1d4ed8?text=${encodeURIComponent(filtered[lightbox].caption)}`;
              }} />
            <div className="text-center mt-4">
              <p className="text-white font-semibold">{filtered[lightbox].caption}</p>
              <p className="text-white/50 text-sm">{filtered[lightbox].cat} · {lightbox + 1} / {filtered.length}</p>
            </div>
          </div>

          <button onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <ChevronRight size={22} />
          </button>

          <button onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
