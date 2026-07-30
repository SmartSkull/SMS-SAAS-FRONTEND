'use client';
import { useEffect, useState, useCallback } from 'react';
import { Trophy, Medal, Search, ChevronDown, ChevronUp, Printer } from 'lucide-react';
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

interface PerSubjectRank {
  rank: number;
  student_id: string;
  firstname: string;
  lastname: string;
  image: string;
  class: string;
  total: number;
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
  const [subjectFilter, setSubjectFilter] = useState('');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const { classes, sessions, terms, subjects } = useSchoolData();
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    api.get<{ success: boolean; data: { overall: StudentRank[]; perSubject: PerSubject[] } }>(
      endpoints.admin.resultsBestStudents,
      { class: classFilter || undefined, session: session || undefined, term: term || undefined, subject: subjectFilter || undefined }
    )
      .then(r => {
        setOverall(r.data.overall ?? []);
        setPerSubject(r.data.perSubject ?? []);
      })
      .catch(() => toast.error('Failed to load best students'))
      .finally(() => setLoading(false));
  }, [classFilter, session, term, subjectFilter]);

  useEffect(() => { load(); }, [load]);

  const printOverall = () => {
    const win = window.open('', '_blank');
    if (!win) { toast.error('Pop-up blocked. Please allow pop-ups.'); return; }
    const rows = overall.map(s => `
      <tr>
        <td style="text-align:center;padding:6px 8px;border-bottom:1px solid #eee">${s.rank}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee"><strong>${s.firstname} ${s.lastname}</strong><br><span style="font-size:11px;color:#888">${s.student_id}</span></td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${s.class || '—'}</td>
        <td style="text-align:center;padding:6px 8px;border-bottom:1px solid #eee">${s.subject_count}</td>
        <td style="text-align:center;padding:6px 8px;border-bottom:1px solid #eee"><strong>${s.average}%</strong></td>
      </tr>
    `).join('');
    win.document.write(`<!DOCTYPE html><html><head><title>Overall Best Students</title>
    <style>
      @page{size:A4 landscape;margin:10mm}
      *{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif}
      body{padding:20px;color:#333}
      h1{font-size:20px;margin-bottom:4px}
      .sub{font-size:13px;color:#666;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{background:#f5f5f5;padding:8px;text-align:left;font-size:11px;text-transform:uppercase;color:#666;border-bottom:2px solid #ddd}
      td{padding:6px 8px;border-bottom:1px solid #eee}
      @media print{body{padding:10mm}}
    </style></head><body>
    <h1>🏆 Overall Best Students</h1>
    <p class="sub">${classFilter || 'All Classes'} · ${session || 'All Sessions'} · ${term || 'All Terms'}</p>
    <table><thead><tr>
      <th style="text-align:center">Rank</th><th>Student</th><th>Class</th><th style="text-align:center">Subjects</th><th style="text-align:center">Average</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <script>window.print();window.close()</script></body></html>`);
    win.document.close();
  };

  const printPerSubject = (ps?: PerSubject) => {
    const items = ps ? [ps] : perSubject;
    if (!items.length) return;
    const sections = items.map(ps => {
      const rows = ps.students.map((st, i) => `
        <tr>
          <td style="text-align:center;padding:5px 8px;border-bottom:1px solid #eee">${i + 1}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #eee"><strong>${st.firstname} ${st.lastname}</strong><br><span style="font-size:11px;color:#888">${st.student_id}</span></td>
          <td style="padding:5px 8px;border-bottom:1px solid #eee">${st.class || '—'}</td>
          <td style="text-align:center;padding:5px 8px;border-bottom:1px solid #eee"><strong>${st.total}</strong></td>
        </tr>
      `).join('');
      return `
        <h2 style="font-size:16px;margin-top:20px;margin-bottom:8px;color:#444">${ps.subject}</h2>
        <table><thead><tr>
          <th style="text-align:center">#</th><th>Student</th><th>Class</th><th style="text-align:center">Score</th>
        </tr></thead><tbody>${rows}</tbody></table>`;
    }).join('');
    const win = window.open('', '_blank');
    if (!win) { toast.error('Pop-up blocked. Please allow pop-ups.'); return; }
    win.document.write(`<!DOCTYPE html><html><head><title>Best Per Subject</title>
    <style>
      @page{size:A4 landscape;margin:10mm}
      *{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif}
      body{padding:20px;color:#333}
      h1{font-size:20px;margin-bottom:4px}
      .sub{font-size:13px;color:#666;margin-bottom:6px}
      table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:10px}
      th{background:#f5f5f5;padding:6px 8px;text-align:left;font-size:11px;text-transform:uppercase;color:#666;border-bottom:2px solid #ddd}
      td{padding:5px 8px;border-bottom:1px solid #eee}
      @media print{body{padding:10mm}}
    </style></head><body>
    <h1>🏅 Best Per Subject</h1>
    <p class="sub">${classFilter || 'All Classes'} · ${session || 'All Sessions'} · ${term || 'All Terms'}${subjectFilter ? ' · ' + subjectFilter : ''}</p>
    ${sections}
    <script>window.print();window.close()</script></body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <Trophy size={24} className="text-yellow-500" /> Best Students
      </h1>

      {/* Filters */}
      <div className="bg-white rounded-2xl card shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Class</label>
          <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 bg-white">
            <option value="">All Classes</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Session</label>
          <select value={session} onChange={e => setSession(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 bg-white">
            <option value="">All Sessions</option>
            {sessions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Term</label>
          <select value={term} onChange={e => setTerm(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 bg-white">
            <option value="">All Terms</option>
            {terms.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
          <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 bg-white">
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Overall Best */}
      <div className="bg-white rounded-2xl card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Trophy size={18} className="text-yellow-500" /> Overall Best Students
          </h2>
          {overall.length > 0 && (
            <button onClick={printOverall} className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              <Printer size={15} /> Export PDF
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-3 text-center w-12 text-xs font-semibold text-gray-500 uppercase">Rank</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Student</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Class</th>
                <th className="p-3 text-center text-xs font-semibold text-gray-500 uppercase">Subjects</th>
                <th className="p-3 text-center text-xs font-semibold text-gray-500 uppercase">Average</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={5} className="p-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
              )) : overall.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-gray-400">No results found for the selected filters.</td></tr>
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
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Medal size={18} className="text-yellow-500" /> Best Per Subject
          </h2>
          {perSubject.length > 0 && (
            <button onClick={() => printPerSubject()} className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              <Printer size={15} /> Export All PDF
            </button>
          )}
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
                  <button onClick={(e) => { e.stopPropagation(); printPerSubject(ps); }}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg" title="Export PDF">
                    <Printer size={13} />
                  </button>
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
                        <th className="p-2 text-center text-xs font-semibold text-gray-500 uppercase">Score</th>
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
