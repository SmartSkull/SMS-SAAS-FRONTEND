import { ToastProvider } from '@/components/ui/Toast';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'School Portal',
  description: 'School management portal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const school = JSON.parse(localStorage.getItem('selected_school'));
                  if (school) {
                    const primary = school.primaryColor || '#2563eb';
                    const secondary = school.secondaryColor || '#eff6ff';
                    const accent = school.accentColor || '#84cc16';
                    document.documentElement.style.setProperty('--brand', primary);
                    document.documentElement.style.setProperty('--brand-dark', primary);
                    document.documentElement.style.setProperty('--brand-light', secondary);
                    document.documentElement.style.setProperty('--brand-accent', accent);
                    document.documentElement.style.setProperty('--brand-border', primary + '33');
                    document.documentElement.style.setProperty('--brand-shadow', primary + '40');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} h-full antialiased`}>
        <ToastProvider>
          {children}
        </ToastProvider>
        <OfflineIndicator />
      </body>
    </html>
  );
}
