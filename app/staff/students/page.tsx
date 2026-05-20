'use client';
import { EmptyState } from '@/components/ui/StateDisplay';
import { useToast } from '@/components/ui/Toast';
import { api, endpoints } from '@/lib/api';
import type { ApiResponse, Student } from '@/types';
import { ChevronLeft, ChevronRight, GraduationCap, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

interface StudentsData {
  students: Student[];
  total: number;
  classes?: string[];
}

export default function StaffStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [classFilter, setClassFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const limit = 20;

  const load = (p = 1) => {
    setLoading(true);
    api.get<ApiResponse<Student[]>>(endpoints.staff.students, {
      page: p, limit, class: classFilter || undefined, search: search || undefined,
    })
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : [];
        setStudents(data);
        setTotal(data.length);
      })
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get<ApiResponse<{ name: string }[]>>(endpoints.staff.classes)
      .then((r) => setClasses((Array.isArray(r.data) ? r.data : []).map((c: any) => c.name).filter(Boolean)));
  }, []);

  useEffect(() => { load(1); setPage(1); }, [classFilter]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(1); setPage(1); };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Students</h1>

      <div className="bg-white rounded-2xl card shadow-sm p-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students…"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button type="submit" className="btn-brand text-white px-4 py-2 rounded-xl text-sm font-medium ">
              Search
            </button>
          </form>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Classes</option>
            {classes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="space-y-3 skeleton-stagger">
            <div className="space-y-2">
              <div className="shimmer h-4 w-full" />
              <div className="shimmer h-4 w-5/6" />
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border border-gray-100 rounded-lg">
                <div className="shimmer h-10 w-32" />
                <div className="shimmer h-10 w-40" />
                <div className="shimmer h-10 w-32" />
                <div className="shimmer h-10 w-48" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-3 font-medium">Student ID</th>
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Class</th>
                    <th className="pb-3 font-medium">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.length === 0 ? (
                    <tr><td colSpan={4}><EmptyState icon={GraduationCap} message="No students found." card={false} /></td></tr>
                  ) : students.map((s) => (
                    <tr key={s.student_id} className="hover:bg-gray-50">
                      <td className="py-3 font-mono text-xs text-gray-600">{s.student_id}</td>
                      <td className="py-3 font-medium text-gray-800">{s.firstname} {s.lastname}</td>
                      <td className="py-3 text-gray-600">{s.class}</td>
                      <td className="py-3 text-gray-500">{s.email ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">Showing {students.length} of {total}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setPage(p => p - 1); load(page - 1); }}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  ><ChevronLeft size={16} /></button>
                  <span className="text-sm text-gray-600">{page} / {totalPages}</span>
                  <button
                    onClick={() => { setPage(p => p + 1); load(page + 1); }}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  ><ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
