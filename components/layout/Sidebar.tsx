'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { normalizeSchoolLogo, useSelectedSchool } from '@/hooks/useSelectedSchool';
import {
  LayoutDashboard, User, BarChart2, BookOpen, Library, Calendar, Monitor,
  Gamepad2, Newspaper, Mail, Users, School, BookMarked, CreditCard,
  Settings, GraduationCap, X, Bell, ClipboardCheck, CalendarOff,
  Wallet, CalendarDays, BookCopy, UserCheck, ArrowUpCircle, Video,
  BarChart3, Mic, Zap,
} from 'lucide-react';
import clsx from 'clsx';

const MENUS = {
  student: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/student/dashboard' },
    { icon: User, label: 'Profile', path: '/student/profile' },
    { icon: BarChart2, label: 'Results', path: '/student/results' },
    { icon: BookOpen, label: 'Assignments', path: '/student/assignments' },
    { icon: UserCheck, label: 'Attendance', path: '/student/attendance' },
    { icon: Library, label: 'Library', path: '/student/library' },
    { icon: Calendar, label: 'Timetable', path: '/student/timetable' },
    { icon: Monitor, label: 'CBT', path: '/student/cbt' },
    { icon: Video, label: 'Online Classes', path: '/student/online-classes' },
    { icon: Gamepad2, label: 'Games', path: '/student/games' },
    { icon: Newspaper, label: 'Posts', path: '/student/posts' },
    { icon: Mail, label: 'Messages', path: '/student/messages' },
    { icon: Bell, label: 'Notifications', path: '/student/notifications' },
    { icon: CreditCard, label: 'Payments', path: '/student/payments' },
  ],
  staff: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/staff/dashboard' },
    { icon: User, label: 'Profile', path: '/staff/profile' },
    { icon: Users, label: 'Students', path: '/staff/students' },
    { icon: BarChart2, label: 'Results', path: '/staff/results' },
    { icon: ClipboardCheck, label: 'Attendance', path: '/staff/attendance' },
    { icon: CalendarOff, label: 'Leave', path: '/staff/leave' },
    { icon: Wallet, label: 'Payroll', path: '/staff/payroll' },
    { icon: BookOpen, label: 'Assignments', path: '/staff/assignments' },
    { icon: CalendarDays, label: 'Timetable', path: '/staff/timetable' },
    { icon: BookCopy, label: 'Curriculum', path: '/staff/curriculum' },
    { icon: Library, label: 'Library', path: '/staff/library' },
    { icon: Monitor, label: 'CBT', path: '/staff/cbt' },
    { icon: Video, label: 'Online Classes', path: '/staff/online-classes' },
    { icon: Newspaper, label: 'Posts', path: '/staff/posts' },
    { icon: Mail, label: 'Messages', path: '/staff/messages' },
    { icon: Bell, label: 'Notifications', path: '/staff/notifications' },
  ],
  admin: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: GraduationCap, label: 'Students', path: '/admin/students' },
    { icon: ArrowUpCircle, label: 'Promotions', path: '/admin/promotions' },
    { icon: Users, label: 'Staff', path: '/admin/staff' },
    { icon: BarChart2, label: 'Results', path: '/admin/results' },
    { icon: ClipboardCheck, label: 'Attendance', path: '/admin/attendance' },
    { icon: CalendarOff, label: 'Leave', path: '/admin/leave' },
    { icon: Wallet, label: 'Payroll', path: '/admin/payroll' },
    { icon: School, label: 'Classes', path: '/admin/classes' },
    { icon: BookMarked, label: 'Courses', path: '/admin/courses' },
    { icon: Calendar, label: 'Sessions', path: '/admin/sessions' },
    { icon: CreditCard, label: 'Payments', path: '/admin/payments' },
    { icon: BarChart3, label: 'Financial Reports', path: '/admin/financial-reports' },
    { icon: Library, label: 'Library', path: '/admin/library' },
    { icon: Newspaper, label: 'Posts', path: '/admin/posts' },
    { icon: Mail, label: 'Messages', path: '/admin/messages' },
    { icon: Bell, label: 'Notifications', path: '/admin/notifications' },
    { icon: School, label: 'School Info', path: '/admin/school' },
    { icon: Settings, label: 'Settings', path: '/admin/settings' },
  ],
};

interface Props { open: boolean; onClose: () => void; }

export default function Sidebar({ open, onClose }: Props) {
  const { user, role } = useAuth();
  const { school } = useSelectedSchool();
  const pathname = usePathname();
  const items = MENUS[role as keyof typeof MENUS] ?? [];
  const logo = normalizeSchoolLogo(school?.logo);
  const primary = school?.primaryColor ?? '#1e40af';
  const accent = school?.accentColor ?? '#84cc16';

  return (
    <>
      {/* Overlay */}
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />}

      <aside className={clsx(
        'fixed top-0 left-0 h-full w-64 z-40 flex flex-col transition-transform duration-300',
        'lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
        style={{ backgroundColor: primary }}>
        {/* Logo */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <Link href={role ? `/${role}/dashboard` : '/'} className="flex items-center gap-3">
            {logo ? (
              <img src={logo} alt={`${school?.name ?? 'School'} logo`} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="flex w-10 h-10 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">
                {school?.name?.charAt(0) ?? 'S'}
              </div>
            )}
            <div>
              <p className="text-white font-bold text-sm leading-tight truncate max-w-36">{school?.name ?? 'School Portal'}</p>
              <p className="text-xs" style={{ color: accent }}>Portal</p>
            </div>
          </Link>
          <button onClick={onClose} className="lg:hidden text-white/60 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3 px-2">Menu</p>
          {items.map(({ icon: Icon, label, path }) => {
            const GAME_PATHS = ['/student/book-game', '/student/pronunciation-game', '/student/quiz-game', '/student/nursery-game'];
            const isActive = pathname === path || (path === '/student/games' && GAME_PATHS.includes(pathname));
            return (
            <Link key={path} href={path} onClick={onClose}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
              )}>
              <Icon size={18} />
              {label}
              {isActive && <span className="ml-auto w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />}
            </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
              <User size={16} style={{ color: accent }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {user?.firstname} {user?.lastname}
              </p>
              <p className="text-white/50 text-xs capitalize">{role}</p>
            </div>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
          </div>
        </div>
      </aside>
    </>
  );
}
