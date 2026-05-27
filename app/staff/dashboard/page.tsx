'use client';
import { useStaffDashboard } from '@/hooks/staff';
import { useAuth } from '@/hooks/useAuth';
import { getImageUrl } from '@/lib/api';
import { BarChart3, BookOpen, Calendar, Clock, FileText, TrendingUp, User, Users, Zap } from 'lucide-react';
import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

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
  const { data, loading } = useStaffDashboard();
  const { user } = useAuth();

  if (loading) return (
    <div className="space-y-6 skeleton-stagger">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <div className="shimmer w-14 h-14 rounded-full" />
        <div className="flex-1">
          <div className="shimmer h-8 w-48" />
          <div className="shimmer h-4 w-64 mt-2" />
        </div>
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl card shadow-sm p-6 flex items-center gap-4">
            <div className="shimmer w-12 h-12 rounded-xl" />
            <div className="flex-1">
              <div className="shimmer h-4 w-24 mb-2" />
              <div className="shimmer h-8 w-12" />
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions skeleton */}
      <div className="bg-white rounded-2xl card shadow-sm p-6">
        <div className="shimmer h-6 w-32 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center p-4 rounded-xl">
              <div className="shimmer w-10 h-10 rounded-lg mb-2" />
              <div className="shimmer h-3 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl card shadow-sm p-6">
          <div className="shimmer h-6 w-48 mb-4" />
          <div className="shimmer h-80 w-full" />
        </div>
        <div className="bg-white rounded-2xl card shadow-sm p-6">
          <div className="shimmer h-6 w-48 mb-4" />
          <div className="shimmer h-80 w-full" />
        </div>
      </div>

      <div className="bg-white rounded-2xl card shadow-sm p-6">
        <div className="shimmer h-6 w-48 mb-4" />
        <div className="shimmer h-80 w-full" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-blue-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
          {getImageUrl(data?.user?.image ?? user?.image)
            ? <img src={getImageUrl(data?.user?.image ?? user?.image)!} className="w-full h-full object-cover" />
            : <User size={24} className="text-blue-600" />}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome, {data?.user?.firstname ?? user?.firstname}!</h1>
          <p className="text-gray-500 text-sm mt-0.5">{data?.current_session} — {data?.current_term}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total Students" value={data?.total_students ?? data?.student_count ?? 0} color="bg-blue-600" />
        <StatCard icon={BookOpen} label="Assignments" value={data?.total_assignments ?? data?.analytics?.assignments?.total ?? 0} color="bg-blue-600" />
        <StatCard icon={TrendingUp} label="Library Docs" value={data?.total_library ?? data?.analytics?.library?.total ?? 0} color="bg-purple-600" />
        <StatCard icon={Calendar} label="Current Term" value={data?.current_term ?? '—'} color="bg-rose-500" />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl card shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link href="/staff/assignments" className="flex flex-col items-center p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors group">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-2 group-hover:bg-blue-200">
              <BookOpen size={20} className="text-blue-600" />
            </div>
            <span className="text-xs font-medium text-gray-700 text-center">Assignments</span>
          </Link>

          <Link href="/staff/students" className="flex flex-col items-center p-4 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors group">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mb-2 group-hover:bg-purple-200">
              <Users size={20} className="text-purple-600" />
            </div>
            <span className="text-xs font-medium text-gray-700 text-center">Students</span>
          </Link>

          <Link href="/staff/results" className="flex flex-col items-center p-4 rounded-xl bg-green-50 hover:bg-green-100 transition-colors group">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-2 group-hover:bg-green-200">
              <BarChart3 size={20} className="text-green-600" />
            </div>
            <span className="text-xs font-medium text-gray-700 text-center">Results</span>
          </Link>

          <Link href="/staff/library" className="flex flex-col items-center p-4 rounded-xl bg-pink-50 hover:bg-pink-100 transition-colors group">
            <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center mb-2 group-hover:bg-pink-200">
              <FileText size={20} className="text-pink-600" />
            </div>
            <span className="text-xs font-medium text-gray-700 text-center">Library</span>
          </Link>

          <Link href="/staff/cbt" className="flex flex-col items-center p-4 rounded-xl bg-orange-50 hover:bg-orange-100 transition-colors group">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center mb-2 group-hover:bg-orange-200">
              <Zap size={20} className="text-orange-600" />
            </div>
            <span className="text-xs font-medium text-gray-700 text-center">CBT</span>
          </Link>

          <Link href="/staff/attendance" className="flex flex-col items-center p-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors group">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center mb-2 group-hover:bg-indigo-200">
              <Clock size={20} className="text-indigo-600" />
            </div>
            <span className="text-xs font-medium text-gray-700 text-center">Attendance</span>
          </Link>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Distribution */}
        <div className="bg-white rounded-2xl card shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Student Performance Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.analytics?.performanceDistribution ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      {/* Top 3 Students + Recent Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top 3 Best Students */}
        <div className="bg-white rounded-2xl card shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">🏆 Top 3 Students — {data?.user?.class ?? 'Your Class'}</h2>
          {(data?.analytics?.top3Students ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No results available yet.</p>
          ) : (
            <ul className="space-y-3">
              {(data?.analytics?.top3Students ?? []).map((s: any, i: number) => (
                <li key={i} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    i === 0 ? 'bg-yellow-400 text-white' :
                    i === 1 ? 'bg-gray-300 text-gray-700' :
                               'bg-orange-300 text-white'
                  }`}>{i + 1}</div>
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-blue-100 shrink-0 flex items-center justify-center">
                    {getImageUrl(s.image)
                      ? <img src={getImageUrl(s.image)!} className="w-full h-full object-cover" />
                      : <span className="text-xs font-bold text-blue-600">{s.name?.[0]}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                    <p className="text-xs text-gray-400">Avg score</p>
                  </div>
                  <span className="text-sm font-bold text-blue-600">{s.average}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Assignments */}
        <div className="bg-white rounded-2xl card shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Assignments</h2>
          {(data?.analytics?.assignmentTrend ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No assignments yet.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {(data?.analytics?.assignmentTrend ?? []).map((a: any, i: number) => (
                <li key={i} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">{i + 1}</div>
                    <span className="text-sm font-medium text-gray-800">{a.label}</span>
                  </div>
                  <span className="text-xs text-gray-400">{a.date}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
      </div>

      {/* Class Distribution */}
      <div className="bg-white rounded-2xl card shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Student Distribution by Class</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data?.analytics?.classDistribution ?? []}
              cx="50%"
              cy="45%"
              labelLine={true}
              label={({ name, percent }) => percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''}
              outerRadius={70}
              fill="#8884d8"
              dataKey="value"
            >
              {(data?.analytics?.classDistribution ?? []).map((_, i) => (
                <Cell key={i} fill={['#3b82f6','#8b5cf6','#f59e0b','#10b981','#ef4444','#f97316','#06b6d4'][i % 7]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
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
