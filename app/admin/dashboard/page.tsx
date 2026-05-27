'use client';
import { Users, UserCheck, Activity, User } from 'lucide-react';
import { useAdminDashboard } from '@/hooks/admin';
import { useAuth } from '@/hooks/useAuth';
import { getImageUrl } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function AdminDashboard() {
  const { data, loading } = useAdminDashboard();
  const { user } = useAuth();

  if (loading) return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse" />)}
    </div>
  );

  const stats = [
    { label: 'Total Students', value: data?.students.total ?? 0, sub: `${data?.students.pending ?? 0} pending`, icon: Users, color: 'bg-blue-100 text-blue-600' },
    { label: 'Verified Students', value: data?.students.verified ?? 0, sub: 'verified', icon: UserCheck, color: 'bg-blue-100 text-blue-600' },
    { label: 'Total Staff', value: data?.staff.total ?? 0, sub: 'staff members', icon: Users, color: 'bg-purple-100 text-purple-600' },
    { label: 'Verified Staff', value: data?.staff.verified ?? 0, sub: 'verified', icon: UserCheck, color: 'bg-indigo-100 text-indigo-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-blue-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
          {getImageUrl(user?.image)
            ? <img src={getImageUrl(user?.image)!} className="w-full h-full object-cover" />
            : <User size={24} className="text-blue-600" />}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.firstname ?? 'Admin'}! 🎓</h1>
          <p className="text-sm text-gray-500 mt-0.5 capitalize">{data?.current_term} Term · {data?.current_session} Session</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl card shadow-sm border border-gray-100 p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Students by class */}
        <div className="bg-white rounded-2xl card shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Students by Class</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={(data?.studentsByClass ?? []).map(({ class: cls, count }) => ({ name: cls, count }))}
              margin={{ top: 4, right: 8, left: -16, bottom: 50 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} angle={-45} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 13 }}
                cursor={{ fill: '#f3f4f6' }}
                formatter={(v: any) => [v, 'Students']}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {(data?.studentsByClass ?? []).map((_, i) => (
                  <Cell key={i} fill={`hsl(${220 + i * 18}, 70%, ${55 + (i % 3) * 8}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent students */}
        <div className="bg-white rounded-2xl card shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity size={18} className="text-purple-500" /> Recent Registrations
          </h2>
          <div className="space-y-3">
            {(data?.recentStudents ?? []).filter(s => s.firstname || s.lastname).map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">
                  {s.firstname?.[0]}{s.lastname?.[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.firstname} {s.lastname}</p>
                  <p className="text-xs text-gray-400">{new Date(s.date).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
