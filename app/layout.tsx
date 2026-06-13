import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import PageLoader from '@/components/ui/PageLoader';
import { ToastProvider } from '@/components/ui/Toast';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  title: 'Smart Campus',
  description: 'All-in-one school management platform — fees, transport, academics, staff, library, hostel and more.',
  icons: {
    icon: '/images/logo.png',
    apple: '/images/logo2.png',
  },
  openGraph: {
    title: 'Smart Campus',
    description: 'All-in-one school management platform — fees, transport, academics, staff, library, hostel and more.',
    images: [{ url: '/images/logo2.png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head />
      <body className={`${geist.variable} ${geistMono.variable} font-[family-name:var(--font-geist)] h-full antialiased`}>
        <Script id="brand-colors" strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=JSON.parse(localStorage.getItem('selected_school'));if(s){var p=s.primaryColor||'#2563eb',sec=s.secondaryColor||'#eff6ff',a=s.accentColor||'#84cc16';var r=document.documentElement.style;r.setProperty('--brand',p);r.setProperty('--brand-dark',p);r.setProperty('--brand-light',sec);r.setProperty('--brand-accent',a);r.setProperty('--brand-border',p+'33');r.setProperty('--brand-shadow',p+'40');}}catch(e){}})();`,
          }}
        />
        <ToastProvider>
          <PageLoader />
          {children}
        </ToastProvider>
        <OfflineIndicator />
      </body>
    </html>
  );
}
