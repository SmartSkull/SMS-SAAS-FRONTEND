'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import clsx from 'clsx';
import PageLoader from '@/components/ui/PageLoader';

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

  return (
    <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <img src="https://florierenparklaneis.com.ng/assets/img/florieren/logo.png"
            alt="Logo" className="w-9 h-9 rounded-full" />
          <span className="font-bold text-sm leading-tight hidden sm:block">
            Florieren Parklane IS
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href}
              className={clsx(
                'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname === href ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10',
              )}>
              {label}
            </Link>
          ))}
          <Link href="/login"
            className="ml-3 px-4 py-2 bg-blue-400 text-white rounded-lg text-sm font-bold hover:bg-blue-300 transition-colors">
            Login
          </Link>
        </nav>

        <button onClick={() => setOpen(!open)} className="lg:hidden p-2 rounded-lg hover:bg-white/10">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden bg-blue-800 border-t border-white/10 px-4 py-3 space-y-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/10">
              {label}
            </Link>
          ))}
          <Link href="/login" onClick={() => setOpen(false)}
            className="block px-3 py-2 bg-blue-400 text-white rounded-lg text-sm font-bold text-center mt-2">
            Login
          </Link>
        </div>
      )}
    </header>
  );
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <PageLoader />
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <footer className="bg-blue-900 text-white/60 text-center text-sm py-6">
        © {new Date().getFullYear()} Florieren Parklane International School. All rights reserved.
      </footer>
    </div>
  );
}
