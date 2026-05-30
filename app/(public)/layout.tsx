'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import clsx from 'clsx';
import { normalizeSchoolLogo, useSelectedSchool } from '@/hooks/useSelectedSchool';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/history', label: 'History' },
  { href: '/admissions', label: 'Admissions' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/our-staff', label: 'Our Staff' },
  { href: '/contact', label: 'Contact' },
];

function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { school } = useSelectedSchool();
  const logo = normalizeSchoolLogo(school?.logo);
  const primary = school?.primaryColor ?? '#1e3a8a';

  return (
    <header className="text-white sticky top-0 z-50 shadow-lg" style={{ background: `linear-gradient(90deg, ${primary}, #111827)` }}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          {logo ? (
            <img src={logo} alt={`${school?.name ?? 'School'} logo`} className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="flex w-9 h-9 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
              {school?.name?.charAt(0) ?? 'S'}
            </div>
          )}
          <span className="font-bold text-sm leading-tight hidden sm:block max-w-48 truncate">
            {school?.name ?? 'School Portal'}
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname === href ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10',
              )}
            >
              {label}
            </Link>
          ))}
          <Link href="/school" className="ml-3 px-4 py-2 bg-white/15 text-white rounded-lg text-sm font-bold hover:bg-white/25 transition-colors">
            {school ? 'Change School' : 'Find School'}
          </Link>
          <Link href="/login" className="px-4 py-2 bg-white text-slate-900 rounded-lg text-sm font-bold hover:bg-white/90 transition-colors">
            Login
          </Link>
        </nav>

        <button onClick={() => setOpen(!open)} className="lg:hidden p-2 rounded-lg hover:bg-white/10">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-white/10 px-4 py-3 space-y-1" style={{ background: primary }}>
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/10">
              {label}
            </Link>
          ))}
          <Link href="/school" onClick={() => setOpen(false)} className="block px-3 py-2 bg-white/15 text-white rounded-lg text-sm font-bold text-center mt-2">
            {school ? 'Change School' : 'Find School'}
          </Link>
          <Link href="/login" onClick={() => setOpen(false)} className="block px-3 py-2 bg-white text-slate-900 rounded-lg text-sm font-bold text-center">
            Login
          </Link>
        </div>
      )}
    </header>
  );
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { school } = useSelectedSchool();
  const primary = school?.primaryColor ?? '#1e3a8a';

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <footer className="text-white/70 text-center text-sm py-6" style={{ backgroundColor: primary }}>
        © {new Date().getFullYear()} {school?.name ?? 'School Portal'}. All rights reserved.
      </footer>
    </div>
  );
}
