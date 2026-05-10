'use client';
import { useEffect, useState } from 'react';
import { Users, UserCheck, Activity } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import type { ApiResponse } from '@/types';

interface DashboardData {
  students: { total: number; verified: number; pending: number };
  staff: { total: number; verified: number };
  studentsByClass: { class: string; count: number }[];
  recentStudents: { firstname: string; lastname: string; date: string }[];
  recentPayments: unknown[];
  current_session: string;
  current_term: string;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    api.get<ApiResponse<DashboardData>>(endpoints.admin.dashboard)
      .then((r) => setData(r.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard 🎓</h1>
        <p className="text-sm text-gray-500 mt-1 capitalize">{data?.current_term} Term · {data?.current_session} Session</p>
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
          <div className="space-y-2">
            {(data?.studentsByClass ?? []).map(({ class: cls, count }) => {
              const pct = Math.round((count / (data!.students.total || 1)) * 100);
              return (
                <div key={cls}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{cls}</span>
                    <span className="font-medium text-gray-900">{count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
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
