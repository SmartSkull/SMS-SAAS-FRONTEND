'use client';
import { useSelectedSchool } from '@/hooks/useSelectedSchool';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { school, loading } = useSelectedSchool();
  const primary = school?.primaryColor || '#2563eb';
  const secondary = school?.secondaryColor || '#eff6ff';
  const accent = school?.accentColor || '#84cc16';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div
      className="portal-theme min-h-screen bg-gray-50 flex"
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
