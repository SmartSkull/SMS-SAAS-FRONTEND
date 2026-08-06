import { LandingShell } from '@/components/landing/LandingShell';
import { Reveal } from '@/components/landing/Reveal';
import { CheckCircle, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FEATURES, FEATURE_DETAILS } from '@/types/landing';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const feature = FEATURES.find(f => f.slug === slug);
  return { title: feature ? `${feature.label} — Smart Campus` : 'Feature — Smart Campus' };
}

export async function generateStaticParams() {
  return FEATURES.map(f => ({ slug: f.slug }));
}

export default async function FeatureDetailPage({ params }: Props) {
  const { slug } = await params;
  const feature = FEATURES.find(f => f.slug === slug);
  const detail = FEATURE_DETAILS[slug];
  if (!feature || !detail) notFound();

  return (
    <LandingShell>
      {/* Hero */}
      <section className="relative pt-36 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <Reveal>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6" style={{ background: feature.bg, color: feature.ic }}>
              {feature.icon}
            </div>
            <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-4">Feature</p>
            <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-black text-gray-900 leading-tight mb-5">
              {feature.label}
            </h1>
            <p className="text-gray-500 text-[16px] max-w-2xl mx-auto leading-8">{feature.desc}</p>
          </Reveal>
        </div>
      </section>

      {/* Intro */}
      <section className="py-16 px-6 bg-[#eef2f7]">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <p className="text-gray-700 text-[17px] leading-9 text-center">{detail.intro}</p>
          </Reveal>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-16 px-6 bg-[#eef2f7]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
          {detail.highlights.map((h, i) => (
            <Reveal key={h.title} delay={i * 0.08}>
              <div className="bg-white border border-gray-100 rounded-3xl p-8 flex flex-col gap-5 shadow-sm h-full">
                <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center" style={{ background: feature.bg, color: feature.ic }}>
                  <CheckCircle size={20} />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-lg mb-2">{h.title}</h3>
                  <p className="text-gray-500 text-[15px] leading-7">{h.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Outcome */}
      <section className="py-16 px-6 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-4">The outcome</p>
            <p className="text-white text-[18px] leading-9 font-medium">{detail.outcome}</p>
          </Reveal>
        </div>
      </section>

      {/* More features */}
      <section className="py-16 px-6 bg-[#eef2f7]">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-10">
            <h2 className="text-2xl font-black text-gray-900">Explore other features</h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.filter(f => f.slug !== slug).map((f, i) => (
              <Reveal key={f.slug} delay={i * 0.05}>
                <Link href={`/features/${f.slug}`} className="group bg-white border border-gray-100 hover:border-blue-300 rounded-2xl p-6 flex items-center gap-4 transition-all hover:-translate-y-1 hover:shadow-lg">
                  <div className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center" style={{ background: f.bg, color: f.ic }}>
                    {f.icon}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{f.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 group-hover:text-blue-600 transition-colors flex items-center gap-1">
                      View details <ChevronLeft size={12} className="rotate-180" />
                    </p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </LandingShell>
  );
}
