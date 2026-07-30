'use client';
import { useEffect, useState, useCallback } from 'react';
import { Trophy, Medal, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { api, endpoints, getImageUrl } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useSchoolData } from '@/hooks/useSchoolData';

interface StudentRank {
  rank: number;
  student_id: string;
  firstname: string;
  lastname: string;
  image: string;
  class: string;
  subject_count: number;
  total: number;
  average: number;
}

interface PerSubjectRank extends StudentRank {
  test: number;
  exam: number;
}

interface PerSubject {
  subject: string;
  students: PerSubjectRank[];
}

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];

function StudentAvatar({ student, size = 8 }: { student: { image?: string; firstname?: string; lastname?: string; student_id?: string }; size?: number }) {
  const initials = ((student.firstname?.[0] ?? '') + (student.lastname?.[0] ?? '')).toUpperCase() || '?';
  const color = COLORS[(student.student_id?.charCodeAt(student.student_id.length - 1) ?? 0) % COLORS.length];
  const src = student.image && student.image !== 'image.png' && student.image !== 'default.png' ? getImageUrl(student.image) : null;
  return src ? (
    <img src={src} alt={initials} className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0`} />
  ) : (
    <span className={`w-${size} h-${size} rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold`} style={{ background: color }}>{initials}</span>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-yellow-500"><Medal size={18} /></span>;
  if (rank === 2) return <span className="text-gray-400"><Medal size={18} /></span>;
  if (rank === 3) return <span className="text-amber-700"><Medal size={18} /></span>;
  return <span className="text-gray-500 font-mono text-xs w-[18px] text-center">{rank}</span>;
}

export default function BestStudentsPage() {
  const [overall, setOverall] = useState<StudentRank[]>([]);
  const [perSubject, setPerSubject] = useState<PerSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState('');
  const [session, setSession] = useState('');
  const [term, setTerm] = useState('');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const { classes, sessions, terms } = useSchoolData();
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    api.get<{ success: boolean; data: { overall: StudentRank[]; perSubject: PerSubject[]; current_session: string; current_term: string } }>(
      endpoints.admin.resultsBestStudents,
      { class: classFilter || undefined, session: session || undefined, term: term || undefined }
    )
      .then(r => {
        setOverall(r.data.overall ?? []);
        setPerSubject(r.data.perSubject ?? []);
        if (!session && r.data.current_session) setSession(r.data.current_session);
        if (!term && r.data.current_term) setTerm(r.data.current_term);
      })
      .catch(() => toast.error('Failed to load best students'))
      .finally(() => setLoading(false));
  }, [classFilter, session, term]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <Trophy size={24} className="text-yellow-500" /> Best Students
      </h1>

      {/* Filters */}
      <div className="bg-white rounded-2xl card shadow-sm p-4 flex flex-wrap gap-3">
        <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 bg-white">
          <option value="">All Classes</option>
          {classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={session} onChange={e => setSession(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 bg-white">
          <option value="">All Sessions</option>
          {sessions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={term} onChange={e => setTerm(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 bg-white">
          <option value="">All Terms</option>
          {terms.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Overall Best */}
      <div className="bg-white rounded-2xl card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Trophy size={18} className="text-yellow-500" /> Overall Best Students
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-3 text-center w-12 text-xs font-semibold text-gray-500 uppercase">Rank</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Student</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Class</th>
                <th className="p-3 text-center text-xs font-semibold text-gray-500 uppercase">Subjects</th>
                <th className="p-3 text-center text-xs font-semibold text-gray-500 uppercase">Total</th>
                <th className="p-3 text-center text-xs font-semibold text-gray-500 uppercase">Average</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={6} className="p-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
              )) : overall.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-gray-400">No results found for the selected filters.</td></tr>
              ) : overall.map((s) => (
                <tr key={s.student_id} className="hover:bg-gray-50">
                  <td className="p-3 text-center"><RankBadge rank={s.rank} /></td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <StudentAvatar student={s} />
                      <div>
                        <p className="font-medium text-gray-900">{s.firstname} {s.lastname}</p>
                        <p className="text-xs text-gray-400">{s.student_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-gray-600">{s.class || '—'}</td>
                  <td className="p-3 text-center text-gray-600">{s.subject_count}</td>
                  <td className="p-3 text-center font-semibold text-gray-900">{s.total}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      s.average >= 75 ? 'bg-green-100 text-green-700' :
                      s.average >= 60 ? 'bg-blue-100 text-blue-700' :
                      s.average >= 50 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {s.average}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-Subject Best */}
      <div className="bg-white rounded-2xl card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Medal size={18} className="text-yellow-500" /> Best Per Subject
          </h2>
        </div>
        <div className="divide-y divide-gray-50">
          {loading ? (
            <div className="p-6 text-center text-gray-400">Loading...</div>
          ) : perSubject.length === 0 ? (
            <div className="p-6 text-center text-gray-400">No results found for the selected filters.</div>
          ) : perSubject.map((ps) => (
            <div key={ps.subject}>
              <button
                onClick={() => setExpandedSubject(expandedSubject === ps.subject ? null : ps.subject)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 text-left"
              >
                <span className="font-medium text-gray-900">{ps.subject}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">Best: {ps.students[0]?.firstname} {ps.students[0]?.lastname} ({ps.students[0]?.total})</span>
                  {expandedSubject === ps.subject ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </button>
              {expandedSubject === ps.subject && (
                <div className="overflow-x-auto border-t border-gray-50">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 pl-4 text-center w-10 text-xs font-semibold text-gray-500 uppercase">#</th>
                        <th className="p-2 text-left text-xs font-semibold text-gray-500 uppercase">Student</th>
                        <th className="p-2 text-left text-xs font-semibold text-gray-500 uppercase">Class</th>
                        <th className="p-2 text-center text-xs font-semibold text-gray-500 uppercase">Test</th>
                        <th className="p-2 text-center text-xs font-semibold text-gray-500 uppercase">Exam</th>
                        <th className="p-2 text-center text-xs font-semibold text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {ps.students.map((st) => (
                        <tr key={st.student_id} className="hover:bg-gray-50">
                          <td className="p-2 pl-4 text-center"><RankBadge rank={st.rank} /></td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <StudentAvatar student={st} size={6} />
                              <span className="font-medium text-gray-900">{st.firstname} {st.lastname}</span>
                            </div>
                          </td>
                          <td className="p-2 text-gray-600">{st.class || '—'}</td>
                          <td className="p-2 text-center text-gray-700">{st.test}</td>
                          <td className="p-2 text-center text-gray-700">{st.exam}</td>
                          <td className="p-2 text-center font-semibold text-gray-900">{st.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
