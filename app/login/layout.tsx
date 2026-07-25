import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login — Smart Campus',
  description: 'Sign in to Smart Campus — the all-in-one school management platform for students, staff and administrators.',
  icons: {
    icon: [
      { url: '/images/logo.png', type: 'image/png' },
    ],
    apple: '/images/logo2.png',
    shortcut: '/images/logo.png',
  },
  openGraph: {
    title: 'Login — Smart Campus',
    description: 'Sign in to Smart Campus — the all-in-one school management platform.',
    images: [{ url: '/images/logo2.png', width: 512, height: 512, alt: 'Smart Campus' }],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Login — Smart Campus',
    description: 'Sign in to Smart Campus — the all-in-one school management platform.',
    images: ['/images/logo2.png'],
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
