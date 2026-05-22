'use client';
import { useEffect, useState } from 'react';
import { CheckCircle, ChevronDown, FileBarChart2, Loader2, Search, XCircle } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/StateDisplay';

interface ClassItem { id: string; name: string; }
interface SessionItem { id: string; name: string; isCurrent: boolean; }
interface StudentResult { student_id: string; firstname: string; lastname: string; [key: string]: any; }

interface InitData {
  students: StudentResult[];
  classes: ClassItem[];
  sessions: SessionItem[];
  current_session: string;
  current_term: string;
}

export default function AdminResults() {
  const [init, setInit] = useState<InitData | null>(null);
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [approving, setApproving] = useState<Record<string, boolean>>({});
  const toast = useToast();

  const TERMS = ['FIRST', 'SECOND', 'THIRD'];

  useEffect(() => {
    api.get<{ success: boolean; data: InitData }>(endpoints.admin.results)
      .then((r) => {
        setInit(r.data);
        setStudents(r.data.students ?? []);
        setSelectedSession(r.data.current_session);
        setSelectedTerm(r.data.current_term);
      })
      .catch(() => toast.error('Failed to load results'))
      .finally(() => setLoading(false));
  }, []);

  const fetchResults = async () => {
    if (!selectedClass) return toast.info('Select a class first');
    setFetching(true);
    try {
      const r = await api.get<{ success: boolean; data: any }>(endpoints.admin.results, {
        class: selectedClass, session: selectedSession, term: selectedTerm,
      });
      setStudents(r.data?.students ?? []);
      setSelected([]);
    } catch { toast.error('Failed to fetch results'); }
    finally { setFetching(false); }
  };

  const approve = async (studentId: string) => {
    setApproving(p => ({ ...p, [studentId]: true }));
    try {
      await api.put(endpoints.admin.resultApprove(studentId), { session: selectedSession, term: selectedTerm });
      toast.success('Approved'); fetchResults();
    } catch { toast.error('Failed to approve'); }
    finally { setApproving(p => { const n = { ...p }; delete n[studentId]; return n; }); }
  };

  const bulkApprove = async () => {
    try {
      await api.post(endpoints.admin.resultsBulkApprove, { student_ids: selected, session: selectedSession, term: selectedTerm });
      toast.success(`${selected.length} approved`); setSelected([]); fetchResults();
    } catch { toast.error('Bulk approve failed'); }
  };

  const toggleSelect = (id: string) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  if (loading) return <div className="h-64 bg-gray-200 rounded-2xl animate-pulse" />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Results</h1>

      {/* Filters */}
      <div className="bg-white rounded-2xl card shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-36">
          <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500">
            <option value="">Select class</option>
            {(init?.classes ?? []).filter(c => c.name !== 'none').map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-36">
          <label className="block text-xs font-medium text-gray-600 mb-1">Session</label>
          <select value={selectedSession} onChange={e => setSelectedSession(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500">
            {(init?.sessions ?? []).map(s => (
              <option key={s.id} value={s.name}>{s.name}{s.isCurrent ? ' (current)' : ''}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-32">
          <label className="block text-xs font-medium text-gray-600 mb-1">Term</label>
          <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500">
            {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button onClick={fetchResults} disabled={fetching}
          className="px-5 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-60">
          {fetching ? 'Loading…' : 'Search'}
        </button>
        {selected.length > 0 && (
          <button onClick={bulkApprove}
            className="flex items-center gap-2 px-4 py-2 btn-brand text-white rounded-xl text-sm font-medium ">
            <CheckCircle size={16} /> Approve {selected.length}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl card shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-3 w-10"><input type="checkbox"
                checked={selected.length === students.length && students.length > 0}
                onChange={() => setSelected(selected.length === students.length ? [] : students.map(s => s.student_id))} /></th>
              <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Student</th>
              <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
              <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {students.length === 0 ? (
              <tr><td colSpan={5}>
                <EmptyState
                  icon={selectedClass ? FileBarChart2 : Search}
                  message={selectedClass ? 'No results found for this filter.' : 'Select a class and click Search.'}
                  card={false}
                />
              </td></tr>
            ) : students.map((s) => (
              <tr key={s.student_id} className="hover:bg-gray-50">
                <td className="p-3"><input type="checkbox" checked={selected.includes(s.student_id)} onChange={() => toggleSelect(s.student_id)} /></td>
                <td className="p-3 font-medium text-gray-900">{s.firstname} {s.lastname}</td>
                <td className="p-3 text-gray-500 font-mono text-xs">{s.student_id}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.approved ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {s.approved ? 'Approved' : 'Pending'}
                  </span>
                </td>
                <td className="p-3">
                  <button onClick={() => approve(s.student_id)} disabled={approving[s.student_id]} className="text-blue-600 hover:text-blue-800 disabled:opacity-50" title="Approve">
                    {approving[s.student_id] ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
