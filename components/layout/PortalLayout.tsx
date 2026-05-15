'use client';
import { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useSelectedSchool } from '@/hooks/useSelectedSchool';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { school } = useSelectedSchool();
  const primary = school?.primaryColor || '#2563eb';
  const secondary = school?.secondaryColor || '#eff6ff';
  const accent = school?.accentColor || '#84cc16';

  return (
    <div
      className="min-h-screen bg-gray-50 flex"
      style={{
        '--brand': primary,
        '--brand-dark': primary,
        '--brand-light': secondary,
        '--brand-accent': accent,
        '--brand-border': `${primary}33`,
        '--brand-shadow': `${primary}40`,
      } as React.CSSProperties}
    >
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col lg:ml-64 min-w-0 overflow-x-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
