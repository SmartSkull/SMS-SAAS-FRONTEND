'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { GraduationCap, Bell, BookOpen, Calendar, BarChart2, ClipboardList, Monitor, Library, Mail, ArrowRight, User } from 'lucide-react';
import { useDashboard } from '@/hooks/student';
import { getImageUrl } from '@/lib/api';

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const h = now.getHours() % 12, m = now.getMinutes(), s = now.getSeconds();
  const hDeg = h * 30 + m * 0.5;
  const mDeg = m * 6;
  const sDeg = s * 6;
  const date = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 rounded-xl border border-blue-100 self-start">
      {/* Analog clock */}
      <svg width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="17" fill="white" stroke="#bfdbfe" strokeWidth="1.5" />
        {/* Hour ticks */}
        {[...Array(12)].map((_, i) => {
          const a = (i * 30 - 90) * (Math.PI / 180);
          return <line key={i} x1={18 + 13 * Math.cos(a)} y1={18 + 13 * Math.sin(a)} x2={18 + 15 * Math.cos(a)} y2={18 + 15 * Math.sin(a)} stroke="#93c5fd" strokeWidth="1.2" />;
        })}
        {/* Hour hand */}
        <line x1="18" y1="18" x2={18 + 8 * Math.cos((hDeg - 90) * Math.PI / 180)} y2={18 + 8 * Math.sin((hDeg - 90) * Math.PI / 180)} stroke="#1d4ed8" strokeWidth="2.2" strokeLinecap="round" />
        {/* Minute hand */}
        <line x1="18" y1="18" x2={18 + 11 * Math.cos((mDeg - 90) * Math.PI / 180)} y2={18 + 11 * Math.sin((mDeg - 90) * Math.PI / 180)} stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" />
        {/* Second hand */}
        <line x1="18" y1="18" x2={18 + 12 * Math.cos((sDeg - 90) * Math.PI / 180)} y2={18 + 12 * Math.sin((sDeg - 90) * Math.PI / 180)} stroke="#ef4444" strokeWidth="1" strokeLinecap="round" />
        <circle cx="18" cy="18" r="1.5" fill="#1d4ed8" />
      </svg>
      <div>
        <p className="text-xs font-semibold text-blue-700 leading-none">{time}</p>
        <p className="text-xs text-blue-500 mt-0.5">{date}</p>
      </div>
    </div>
  );
}

const QUICK_ACTIONS = [
  { icon: BarChart2,    label: 'View Results',  path: '/student/results',     bg: 'bg-blue-50',   icon_color: 'text-blue-600',   hover: 'hover:bg-blue-100' },
  { icon: BookOpen,     label: 'Assignments',   path: '/student/assignments', bg: 'bg-blue-50',  icon_color: 'text-blue-600',  hover: 'hover:bg-blue-100' },
  { icon: Calendar,     label: 'Timetable',     path: '/student/timetable',   bg: 'bg-purple-50', icon_color: 'text-purple-600', hover: 'hover:bg-purple-100' },
  { icon: Monitor,      label: 'Take CBT',      path: '/student/cbt',         bg: 'bg-orange-50', icon_color: 'text-orange-600', hover: 'hover:bg-orange-100' },
  { icon: Library,      label: 'Library',       path: '/student/library',     bg: 'bg-pink-50',   icon_color: 'text-pink-600',   hover: 'hover:bg-pink-100' },
  { icon: Mail,         label: 'Messages',      path: '/student/messages',    bg: 'bg-indigo-50', icon_color: 'text-indigo-600', hover: 'hover:bg-indigo-100' },
];

export default function StudentDashboard() {
  const { data, loading } = useDashboard();

  if (loading) return (
    <div className="space-y-6 skeleton-stagger">
      {/* Welcome banner */}
      <div className="bg-white rounded-2xl card border border-gray-100 shadow-sm p-6 flex items-center justify-between">
        <div className="space-y-2">
          <div className="shimmer h-6 w-56" />
          <div className="shimmer h-4 w-36" />
        </div>
        <div className="shimmer h-9 w-32 hidden md:block" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl card border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="shimmer w-10 h-10 rounded-xl" />
            <div className="shimmer h-7 w-12" />
            <div className="shimmer h-3.5 w-20" />
          </div>
        ))}
      </div>

      {/* Bottom panels */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl card border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="shimmer w-7 h-7 rounded-lg" />
            <div className="shimmer h-4 w-28" />
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => <div key={i} className="shimmer h-20 rounded-xl" />)}
          </div>
        </div>
        <div className="lg:col-span-2 bg-white rounded-2xl card border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="shimmer w-7 h-7 rounded-lg" />
            <div className="shimmer h-4 w-36" />
          </div>
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="shimmer w-10 h-10 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="shimmer h-3.5 rounded-full w-3/4" />
                  <div className="shimmer h-3 rounded-full w-1/2" />
                </div>
                <div className="shimmer w-8 h-8 rounded-xl flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const stats = [
    { icon: GraduationCap, label: 'Current Class',  value: data?.user.class ?? 'N/A',                    color: 'bg-blue-100 text-blue-600' },
    { icon: Bell,          label: 'Notifications',  value: data?.unread_notifications ?? 0,               color: 'bg-amber-100 text-amber-600' },
    { icon: ClipboardList, label: 'Assignments',    value: data?.recent_assignments?.length ?? 0,         color: 'bg-blue-100 text-blue-600' },
    { icon: Calendar,      label: 'Current Term',   value: data?.current_term ?? 'N/A',                   color: 'bg-purple-100 text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
            {getImageUrl(data?.user?.image)
              ? <img src={getImageUrl(data?.user?.image)!} className="w-full h-full object-cover" />
              : <User size={24} className="text-blue-600" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, <span className="text-blue-600">{data?.user.firstname}!</span> 👋
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">{data?.current_term} Term · {data?.current_session} Session</p>
          </div>
        </div>
        <LiveClock />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="relative bg-white rounded-2xl card shadow-sm border border-gray-100 p-5 overflow-hidden">
            {/* Faint background icon */}
            <div className="absolute right-0 top-0 bottom-0 flex items-center justify-end opacity-[0.08] animate-pulse pointer-events-none translate-x-4">
              <Icon size={120} />
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-gray-500 text-sm">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions + Recent Assignments */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl card shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
              <Monitor size={14} className="text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">Quick Actions</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map(({ icon: Icon, label, path, bg, icon_color, hover }) => (
              <Link key={path} href={path}
                className={`flex flex-col items-center p-3 rounded-xl ${bg} ${hover} transition-colors group`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${icon_color}`}>
                  <Icon size={20} />
                </div>
                <span className="text-xs font-semibold text-gray-700 text-center">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Assignments */}
        <div className="lg:col-span-2 bg-white rounded-2xl card shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
              <ClipboardList size={14} className="text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">Recent Assignments</h3>
          </div>
          <div className="p-4">
            {!data?.recent_assignments?.length ? (
              <div className="text-center py-10 text-gray-400">
                <ClipboardList size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">No pending assignments</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recent_assignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <BookOpen size={16} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{a.title}</p>
                        <p className="text-xs text-gray-500">
                          {a.dueAt ? `Due ${new Date(a.dueAt).toLocaleDateString()}` : 'No due date'}
                        </p>
                      </div>
                    </div>
                    <Link href="/student/assignments"
                      className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 hover:bg-blue-500 hover:text-white transition-colors">
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
