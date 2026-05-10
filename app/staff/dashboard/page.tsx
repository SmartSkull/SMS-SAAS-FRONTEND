'use client';
import { useEffect, useState } from 'react';
import { Users, BookOpen, BarChart2, ClipboardList, TrendingUp, Calendar } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import type { ApiResponse } from '@/types';

interface DashboardData {
  total_students?: number;
  total_results?: number;
  total_assignments?: number;
  total_library?: number;
  pending_results?: number;
  current_session?: string;
  current_term?: string;
  recent_results?: { student_name: string; course: string; total: number; grade: string }[];
  [key: string]: unknown;
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-2xl card shadow-sm p-6 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

export default function StaffDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const { user } = useAuth();

  useEffect(() => {
    api.get<ApiResponse<DashboardData>>(endpoints.staff.dashboard)
      .then((r) => setData(r.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Welcome, {user?.firstname}!</h1>
        <p className="text-gray-500 text-sm mt-1">
          {data?.current_session} — {data?.current_term}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total Students" value={data?.total_students ?? 0} color="bg-blue-600" />
        <StatCard icon={BarChart2} label="Results Uploaded" value={data?.total_results ?? 0} color="bg-indigo-600" />
        <StatCard icon={ClipboardList} label="Pending Approval" value={data?.pending_results ?? 0} color="bg-amber-500" />
        <StatCard icon={BookOpen} label="Assignments" value={data?.total_assignments ?? 0} color="bg-blue-600" />
        <StatCard icon={TrendingUp} label="Library Docs" value={data?.total_library ?? 0} color="bg-purple-600" />
        <StatCard icon={Calendar} label="Current Term" value={data?.current_term ?? '—'} color="bg-rose-500" />
      </div>

      {data?.recent_results && data.recent_results.length > 0 && (
        <div className="bg-white rounded-2xl card shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Results</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-3 font-medium">Student</th>
                  <th className="pb-3 font-medium">Course</th>
                  <th className="pb-3 font-medium">Total</th>
                  <th className="pb-3 font-medium">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.recent_results.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-800">{r.student_name}</td>
                    <td className="py-3 text-gray-600">{r.course}</td>
                    <td className="py-3 text-gray-600">{r.total}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        r.grade === 'A' ? 'bg-blue-100 text-blue-700' :
                        r.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                        r.grade === 'C' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>{r.grade}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
