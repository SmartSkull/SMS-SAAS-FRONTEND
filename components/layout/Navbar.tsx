'use client';
import { Menu, Bell, Mail, LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface Props { onMenuClick: () => void; }

export default function Navbar({ onMenuClick }: Props) {
  const { user, role, logout } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const handleLogout = async () => {
    try { await api.post(endpoints.auth.logout); } catch { /* ignore */ }
    logout();
    router.push('/login');
    toast.success('Logged out successfully');
  };

  const messagesPath = role ? `/${role}/messages` : '/login';
  const hasProfile = role === 'student' || role === 'staff';

  return (
    <header className="bg-white/80 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-20 h-16 flex items-center px-4 lg:px-6 gap-4">
      <button onClick={onMenuClick} className="lg:hidden p-2 rounded-xl hover:bg-blue-50 transition-colors">
        <Menu size={20} className="text-gray-600" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <Link href={messagesPath} className="relative p-2.5 rounded-xl hover:bg-blue-50 transition-colors">
          <Mail size={20} className="text-gray-500" />
        </Link>

        <Link href={role ? `/${role}/notifications` : '/login'} className="relative p-2.5 rounded-xl hover:bg-blue-50 transition-colors">
          <Bell size={20} className="text-gray-500" />
        </Link>

        <div className="w-px h-8 bg-gray-200 mx-1" />

        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
            <User size={16} className="text-blue-700" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-gray-700 leading-tight">
              {user?.firstname} {user?.lastname}
            </p>
            <p className="text-xs text-blue-600 capitalize">{role}</p>
          </div>
        </div>

        <button onClick={handleLogout}
          className="p-2.5 rounded-xl hover:bg-red-50 transition-colors text-gray-500 hover:text-red-500">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
