'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard, User, BarChart2, BookOpen, Library, Calendar, Monitor,
  Gamepad2, Newspaper, Mail, Users, School, BookMarked, CreditCard,
  Settings, GraduationCap, X,
} from 'lucide-react';
import clsx from 'clsx';

const MENUS = {
  student: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/student/dashboard' },
    { icon: User, label: 'Profile', path: '/student/profile' },
    { icon: BarChart2, label: 'Results', path: '/student/results' },
    { icon: BookOpen, label: 'Assignments', path: '/student/assignments' },
    { icon: Library, label: 'Library', path: '/student/library' },
    { icon: Calendar, label: 'Timetable', path: '/student/timetable' },
    { icon: Monitor, label: 'CBT', path: '/student/cbt' },
    { icon: Gamepad2, label: 'Book Game', path: '/student/book-game' },
    { icon: Newspaper, label: 'Posts', path: '/student/posts' },
    { icon: Mail, label: 'Messages', path: '/student/messages' },
    { icon: CreditCard, label: 'Payments', path: '/student/payments' },
  ],
  staff: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/staff/dashboard' },
    { icon: User, label: 'Profile', path: '/staff/profile' },
    { icon: Users, label: 'Students', path: '/staff/students' },
    { icon: BarChart2, label: 'Results', path: '/staff/results' },
    { icon: BookOpen, label: 'Assignments', path: '/staff/assignments' },
    { icon: Library, label: 'Library', path: '/staff/library' },
    { icon: Monitor, label: 'CBT', path: '/staff/cbt' },
    { icon: Newspaper, label: 'Posts', path: '/staff/posts' },
    { icon: Mail, label: 'Messages', path: '/staff/messages' },
  ],
  admin: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: GraduationCap, label: 'Students', path: '/admin/students' },
    { icon: Users, label: 'Staff', path: '/admin/staff' },
    { icon: BarChart2, label: 'Results', path: '/admin/results' },
    { icon: School, label: 'Classes', path: '/admin/classes' },
    { icon: BookMarked, label: 'Courses', path: '/admin/courses' },
    { icon: Calendar, label: 'Sessions', path: '/admin/sessions' },
    { icon: CreditCard, label: 'Payments', path: '/admin/payments' },
    { icon: Library, label: 'Library', path: '/admin/library' },
    { icon: Newspaper, label: 'Posts', path: '/admin/posts' },
    { icon: Mail, label: 'Messages', path: '/admin/messages' },
    { icon: Settings, label: 'Settings', path: '/admin/settings' },
  ],
};

interface Props { open: boolean; onClose: () => void; }

export default function Sidebar({ open, onClose }: Props) {
  const { user, role } = useAuth();
  const pathname = usePathname();
  const items = MENUS[role as keyof typeof MENUS] ?? [];

  return (
    <>
      {/* Overlay */}
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />}

      <aside className={clsx(
        'fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-blue-800 to-blue-950 z-40 flex flex-col transition-transform duration-300',
        'lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}>
        {/* Logo */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <Link href={role ? `/${role}/dashboard` : '/'} className="flex items-center gap-3">
            <img src="https://florierenparklaneis.com.ng/assets/img/florieren/logo.png"
              alt="Logo" className="w-10 h-10 rounded-full" />
            <div>
              <p className="text-white font-bold text-sm leading-tight">Florieren Parklane</p>
              <p className="text-lime-300/80 text-xs">IS Portal</p>
            </div>
          </Link>
          <button onClick={onClose} className="lg:hidden text-white/60 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3 px-2">Menu</p>
          {items.map(({ icon: Icon, label, path }) => (
            <Link key={path} href={path} onClick={onClose}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                pathname === path
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
              )}>
              <Icon size={18} />
              {label}
              {pathname === path && <span className="ml-auto w-2 h-2 bg-blue-300 rounded-full" />}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
              <User size={16} className="text-lime-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {user?.firstname} {user?.lastname}
              </p>
              <p className="text-white/50 text-xs capitalize">{role}</p>
            </div>
            <span className="w-2 h-2 bg-lime-400 rounded-full" />
          </div>
        </div>
      </aside>
    </>
  );
}
