import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Download App — Florieren School',
  description: 'Download the Florieren School Android app. Access results, attendance, transport, fees and more from your phone.',
  openGraph: {
    title: 'Download Florieren School App',
    description: 'The all-in-one school companion for students, parents and staff — results, attendance, transport and more.',
    images: [{ url: '/images/logo2.png', width: 512, height: 512, alt: 'Florieren School App' }],
  },
};

export default function DownloadLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
