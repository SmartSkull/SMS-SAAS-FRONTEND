'use client';
import { EmptyState } from '@/components/ui/StateDisplay';
import { useToast } from '@/components/ui/Toast';
import { api, endpoints } from '@/lib/api';
import { useSchoolData } from '@/hooks/useSchoolData';
import {
  Monitor, Search, ChevronDown, ChevronUp, User, Clock,
  Calendar, CheckCircle2, AlertCircle, HelpCircle, BookOpen,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface Uploader { name: string; uploadedAt: string; }

interface CbtTestSummary {
  id: string;
  title: string;
  class: string;
  course: string;
  session: string;
  term: string;
  duration: number;
  questionCount: number;
  startTime: string | null;
  endTime: string | null;
  createdAt: string;
  uploaders: Uploader[];
}

interface CbtQuestion {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answer: string;
  createdAt: string;
  class: string;
  course: string;
  testId: string;
  uploadedBy: string;
}

const SEL = 'border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500';

function ScheduleBadge({ start, end }: { start: string | null; end: string | null }) {
  if (!start || !end) {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
        <AlertCircle size={10} /> No schedule
      </span>
    );
  }
  const now = new Date();
  const s = new Date(start);
  const e = new Date(end);
  if (now >= s && now <= e) {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
        <CheckCircle2 size={10} /> Live
      </span>
    );
  }
  if (now < s) {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
        <Clock size={10} /> Upcoming
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
      <AlertCircle size={10} /> Expired
    </span>
  );
}

export default function AdminCbtPage() {
  const { classes, subjects } = useSchoolData();
  const toast = useToast();

  const [tests, setTests] = useState<CbtTestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ class: '', course: '', search: '' });

  // which test row is expanded to show its questions
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, CbtQuestion[]>>({});
  const [questionsLoading, setQuestionsLoading] = useState(false);

  const loadTests = () => {
    setLoading(true);
    const params: any = {};
    if (filter.class) params.class = filter.class;
    if (filter.course) params.course = filter.course;
    api.get<any>(endpoints.admin.cbtTests, params)
      .then(r => setTests(r.data ?? []))
      .catch(() => toast.error('Failed to load CBT tests'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTests(); }, [filter.class, filter.course]);

  const toggleExpand = async (test: CbtTestSummary) => {
    if (expandedId === test.id) { setExpandedId(null); return; }
    setExpandedId(test.id);
    // Use cached questions if already loaded
    if (expandedQuestions[test.id]) return;
    setQuestionsLoading(true);
    try {
      const r = await api.get<any>(endpoints.admin.cbtQuestions, {
        class: test.class, course: test.course,
      });
      const qs: CbtQuestion[] = (r.data ?? []).filter((q: CbtQuestion) => q.testId === test.id);
      setExpandedQuestions(prev => ({ ...prev, [test.id]: qs }));
    } catch { toast.error('Failed to load questions'); }
    finally { setQuestionsLoading(false); }
  };

  const filtered = tests.filter(t => {
    if (!filter.search) return true;
    const s = filter.search.toLowerCase();
    return (
      t.course.toLowerCase().includes(s) ||
      t.class.toLowerCase().includes(s) ||
      t.uploaders.some(u => u.name.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Monitor size={22} className="text-purple-600" /> CBT Monitor
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            All CBT tests uploaded by teachers — {tests.length} test{tests.length !== 1 ? 's' : ''} found
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl card shadow-sm p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={filter.search}
            onChange={e => setFilter(p => ({ ...p, search: e.target.value }))}
            placeholder="Search subject, class or teacher…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500"
          />
        </div>
        <select value={filter.class} onChange={e => setFilter(p => ({ ...p, class: e.target.value }))} className={SEL}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filter.course} onChange={e => setFilter(p => ({ ...p, course: e.target.value }))} className={SEL}>
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Tests table */}
      <div className="bg-white rounded-2xl card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl">
                <div className="flex-1 space-y-2">
                  <div className="shimmer h-4 w-48" />
                  <div className="shimmer h-3 w-64" />
                </div>
                <div className="shimmer h-6 w-20 rounded-full" />
                <div className="shimmer h-6 w-28 rounded-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8">
            <EmptyState icon={HelpCircle} message="No CBT tests found." card={false} />
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {/* Column headers */}
            <div className="hidden md:grid grid-cols-[2fr_1.4fr_80px_80px_120px_100px_40px] gap-3 px-5 py-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <span>Subject / Class</span>
              <span>Uploaded By</span>
              <span>Questions</span>
              <span>Duration</span>
              <span>Schedule</span>
              <span>Created</span>
              <span />
            </div>

            {filtered.map(test => {
              const isExpanded = expandedId === test.id;
              const qs = expandedQuestions[test.id] ?? [];

              return (
                <div key={test.id}>
                  {/* Summary row */}
                  <div
                    className="grid grid-cols-1 md:grid-cols-[2fr_1.4fr_80px_80px_120px_100px_40px] gap-3 items-center px-5 py-4 hover:bg-gray-50/60 cursor-pointer transition-colors"
                    onClick={() => toggleExpand(test)}
                  >
                    {/* Subject + class */}
                    <div>
                      <p className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                        <BookOpen size={14} className="text-purple-500 shrink-0" />
                        {test.course}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 ml-[22px]">
                        {test.class}
                        {test.session !== '—' && <span> · {test.session}</span>}
                        {test.term !== '—' && <span> · {test.term} Term</span>}
                      </p>
                    </div>

                    {/* Uploaders */}
                    <div className="flex flex-col gap-0.5">
                      {test.uploaders.length === 0 ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        <>
                          {test.uploaders.slice(0, 2).map((u, i) => (
                            <span key={i} className="flex items-center gap-1 text-xs text-gray-700">
                              <User size={11} className="text-gray-400 shrink-0" />
                              {u.name}
                            </span>
                          ))}
                          {test.uploaders.length > 2 && (
                            <span className="text-xs text-gray-400 ml-4">+{test.uploaders.length - 2} more</span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Question count */}
                    <div>
                      <span className="text-sm font-bold text-gray-800">
                        {test.questionCount}
                        <span className="text-xs font-normal text-gray-400 ml-0.5">Qs</span>
                      </span>
                    </div>

                    {/* Duration */}
                    <div className="text-sm text-gray-600">{test.duration} min</div>

                    {/* Schedule */}
                    <div>
                      <ScheduleBadge start={test.startTime} end={test.endTime} />
                      {test.startTime && (
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(test.startTime).toLocaleDateString()} →{' '}
                          {new Date(test.endTime!).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {/* Created */}
                    <div className="text-xs text-gray-400">
                      <Calendar size={10} className="inline mr-1" />
                      {new Date(test.createdAt).toLocaleDateString()}
                    </div>

                    {/* Chevron */}
                    <div className="flex justify-end">
                      {isExpanded
                        ? <ChevronUp size={16} className="text-gray-400" />
                        : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </div>

                  {/* Expanded questions panel */}
                  {isExpanded && (
                    <div className="bg-gray-50 border-t border-gray-100 px-5 py-4">
                      {questionsLoading && !expandedQuestions[test.id] ? (
                        <div className="space-y-2">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="shimmer h-16 w-full rounded-xl" />
                          ))}
                        </div>
                      ) : qs.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">No questions loaded for this test.</p>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {qs.length} Question{qs.length !== 1 ? 's' : ''}
                          </p>
                          {qs.map((q, i) => (
                            <div key={q.id} className="bg-white rounded-xl border border-gray-100 p-4">
                              <div className="flex items-start justify-between gap-4">
                                <p className="text-sm font-medium text-gray-800 flex-1 leading-relaxed">
                                  <span className="text-gray-400 font-normal mr-1">{i + 1}.</span>
                                  <span dangerouslySetInnerHTML={{ __html: q.question }} />
                                </p>
                                <div className="flex flex-col items-end shrink-0 gap-1 min-w-fit">
                                  <span className="flex items-center gap-1 text-xs text-gray-600 font-medium">
                                    <User size={10} className="text-purple-400" />
                                    {q.uploadedBy}
                                  </span>
                                  <span className="flex items-center gap-1 text-xs text-gray-400">
                                    <Clock size={10} />
                                    {new Date(q.createdAt).toLocaleDateString(undefined, {
                                      day: '2-digit', month: 'short', year: 'numeric',
                                    })}
                                  </span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-1.5 mt-3">
                                {(['A', 'B', 'C', 'D'] as const).map(letter => {
                                  const opt = (q as any)[`option${letter}`];
                                  const isCorrect = q.answer === letter;
                                  return (
                                    <p key={letter} className={`text-xs px-2.5 py-1.5 rounded-lg ${
                                      isCorrect
                                        ? 'bg-green-100 text-green-700 font-semibold'
                                        : 'bg-gray-100 text-gray-500'
                                    }`}>
                                      {letter}. {opt}
                                    </p>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
