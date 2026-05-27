'use client';
import { useEffect, useState } from 'react';
import { BadgeCheck, Check, CheckCircle, Eye, FileBarChart2, Loader2, Search, User, X } from 'lucide-react';
import { api, endpoints, getImageUrl } from '@/lib/api';
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
  const [viewingStudent, setViewingStudent] = useState<string | null>(null);
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
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.approved == 1 || s.approved === true || s.approved === '1' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {s.approved == 1 || s.approved === true || s.approved === '1' ? 'Approved' : 'Pending'}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewingStudent(s.student_id)}
                      className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                      title="View Result"
                    >
                      <Eye size={18} />
                    </button>
                  {s.approved == 1 || s.approved === true || s.approved === '1' ? (
                    <span className="text-green-500" title="Verified">
                      <BadgeCheck size={18} />
                    </span>
                  ) : (
                    <button onClick={() => approve(s.student_id)} disabled={approving[s.student_id]} className="text-blue-600 hover:text-blue-800 disabled:opacity-50" title="Verify">
                      {approving[s.student_id] ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                    </button>
                  )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {viewingStudent && (
        <StudentResultModal
          studentId={viewingStudent}
          session={selectedSession}
          term={selectedTerm}
          onClose={() => setViewingStudent(null)}
        />
      )}
    </div>
  );
}

function StudentResultModal({ studentId, session, term, onClose }: { studentId: string; session: string; term: string; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get<any>(endpoints.admin.resultStudent(studentId), {
      session: session || undefined,
      term: term || undefined,
    })
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [studentId, session, term]);

  const results: any[] = data?.results ?? [];
  const termLower = term.toLowerCase();
  const showFirst = termLower === 'second' || termLower === 'third';
  const showSecond = termLower === 'third';
  const avg = results.length
    ? (results.reduce((sum: number, r: any) => sum + Number(r.testScore ?? r.test_score) + Number(r.examScore ?? r.exam_score), 0) / results.length).toFixed(1)
    : '0';

  const gradeColor = (total: number) => {
    if (total >= 70) return 'bg-green-100 text-green-700';
    if (total >= 60) return 'bg-blue-100 text-blue-700';
    if (total >= 50) return 'bg-yellow-100 text-yellow-700';
    if (total >= 40) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-semibold text-gray-900">Result Sheet</h2>
            <p className="text-xs text-gray-500 font-mono">{studentId} - {session} · {term} Term</p>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />)}
            </div>
          ) : !results.length ? (
            <p className="text-center text-gray-500 py-12">No results found for this student.</p>
          ) : (
            <>
              {data.student && (
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border-2 border-blue-200">
                    {getImageUrl(data.student.image)
                      ? <img src={getImageUrl(data.student.image)!} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-gray-400"><User size={22} /></div>}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{data.student.firstName} {data.student.lastName}</p>
                    <p className="text-xs text-gray-500 font-mono">{data.student.uniqueId}</p>
                    {data.class && <p className="text-xs text-blue-600 font-medium mt-0.5">{data.class}</p>}
                  </div>
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase min-w-[140px]">Subject</th>
                      {showFirst && <th className="px-3 py-3 text-center text-xs font-semibold bg-blue-700">1st</th>}
                      {showSecond && <th className="px-3 py-3 text-center text-xs font-semibold bg-green-700">2nd</th>}
                      <th className="px-3 py-3 text-center text-xs font-semibold uppercase">CA</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold uppercase">Exam</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold uppercase">Total</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold uppercase bg-purple-700">Cumul.</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold uppercase bg-amber-600">Avg</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold uppercase">Grade</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold uppercase">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {results.map((r: any, i: number) => {
                      const total = Number(r.testScore ?? r.test_score) + Number(r.examScore ?? r.exam_score);
                      return (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-bold text-gray-900 min-w-[140px]">{r.course ?? r.subject?.name}</td>
                          {showFirst && <td className="px-3 py-2.5 text-center text-blue-700 bg-blue-50">{r.first_term_score ?? '-'}</td>}
                          {showSecond && <td className="px-3 py-2.5 text-center text-green-700 bg-green-50">{r.second_term_score ?? '-'}</td>}
                          <td className="px-3 py-2.5 text-center text-gray-600">{Number(r.testScore ?? r.test_score)}</td>
                          <td className="px-3 py-2.5 text-center text-gray-600">{Number(r.examScore ?? r.exam_score)}</td>
                          <td className="px-3 py-2.5 text-center font-semibold text-gray-900">{total}</td>
                          <td className="px-3 py-2.5 text-center text-purple-700 bg-purple-50">{r.cumulative ?? total}</td>
                          <td className="px-3 py-2.5 text-center text-amber-700 bg-amber-50">{r.average ?? total}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${gradeColor(total)}`}>{r.grade}</span>
                          </td>
                          <td className="px-3 py-2.5 text-center text-gray-500 text-xs">{r.remark}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-200 bg-blue-50">
                    <tr>
                      <td colSpan={showFirst && showSecond ? 4 : showFirst || showSecond ? 3 : 2} className="px-4 py-2.5 font-bold text-gray-700">Average</td>
                      <td className="px-3 py-2.5 text-center font-bold text-gray-900">{avg}%</td>
                      <td colSpan={4} />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {data?.trait && (
                <div className="grid sm:grid-cols-2 gap-6">
                  <TraitTable title="Affective Traits" color="blue" items={[
                    ['Punctuality', data.trait.punctuality], ['Perseverance', data.trait.perseverance],
                    ['Responsibility', data.trait.responsibility], ['Diligence', data.trait.diligence],
                    ['Self Control', data.trait.selfControl], ['Honesty', data.trait.honesty],
                    ['Attendance', data.trait.attendance], ['Attentiveness', data.trait.attentiveness],
                    ['Creativity', data.trait.creativity], ['Curiosity', data.trait.curiosity],
                  ]} />
                  <TraitTable title="Psychomotor Traits" color="purple" items={[
                    ['Drawing', data.trait.drawing], ['Physical Activity', data.trait.physicalActivity],
                    ['Accuracy', data.trait.accuracy], ['Handling of Tools', data.trait.handlingOfTools],
                    ['Mental Skills', data.trait.mentalSkills],
                  ]} />
                </div>
              )}

              {(data.teacher || data.principal) && (
                <div className="grid sm:grid-cols-2 gap-4">
                  {([
                    { key: 'teacherComment', person: data.teacher, title: "Teacher's Comment", border: 'border-yellow-200', bg: 'bg-yellow-50' },
                    { key: 'principalComment', person: data.principal, title: "Principal's Comment", border: 'border-indigo-200', bg: 'bg-indigo-50' },
                  ] as const).map(({ key, person, title, border, bg }) => (
                    <div key={key} className={`rounded-xl border ${border} ${bg} p-4`}>
                      <div className="flex items-center gap-3 mb-2 pb-2 border-b border-black/10">
                        <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                          {getImageUrl(person?.image)
                            ? <img src={getImageUrl(person.image)!} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-gray-400"><User size={16} /></div>}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{person?.name ?? '-'}</p>
                          <p className="text-xs text-gray-500">{title.split("'")[0]}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 italic">
                        {data.attendance?.[key] ? `"${data.attendance[key]}"` : 'No comment entered yet.'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TraitTable({ title, color, items }: { title: string; color: 'blue' | 'purple'; items: [string, any][] }) {
  const header = color === 'blue' ? 'bg-blue-600' : 'bg-purple-600';
  const badge = color === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700';
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className={`${header} text-white px-4 py-2.5`}>
        <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>
      </div>
      <table className="w-full text-xs">
        <tbody className="divide-y divide-gray-100">
          {items.map(([label, value]) => (
            <tr key={label} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-2 font-medium text-gray-700">{label}</td>
              <td className="px-4 py-2 text-right">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${badge} font-bold text-xs`}>{value}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
