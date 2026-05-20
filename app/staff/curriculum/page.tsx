'use client';
import { useState, useEffect } from 'react';
import { BookOpen, FileText, CalendarDays, Plus, Trash2, Save, X } from 'lucide-react';
import { useCurriculum, type CurriculumTopic, type LessonPlan, type WeeklyScheme } from '@/hooks/staff';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

const inputCls = 'w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white';
const textareaCls = `${inputCls} min-h-[100px] resize-y`;

type Tab = 'topics' | 'lessons' | 'weekly';

export default function CurriculumPage() {
  const toast = useToast();
  const { topics, lessonPlans, weeklySchemes, loading, saveTopic, deleteTopic, saveLessonPlan, deleteLessonPlan, saveWeeklyScheme, deleteWeeklyScheme } = useCurriculum();
  const [tab, setTab] = useState<Tab>('topics');
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; course: string }[]>([]);
  const [sessions, setSessions] = useState<string[]>([]);
  const [terms, setTerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Forms
  const emptyTopic = { id: '', title: '', description: '', week: '', term: '', session: '', subjectId: '', classRoomId: '' };
  const emptyLesson = { id: '', title: '', objectives: '', content: '', resources: '', evaluation: '', date: '', duration: '', topicId: '', subjectId: '', classRoomId: '' };
  const emptyScheme = { id: '', week: '', term: '', session: '', content: '', subjectId: '', classRoomId: '' };

  const [topicForm, setTopicForm] = useState(emptyTopic);
  const [lessonForm, setLessonForm] = useState(emptyLesson);
  const [schemeForm, setSchemeForm] = useState(emptyScheme);

  useEffect(() => {
    api.get<any>(endpoints.staff.classes).then(r => setClasses((r.data ?? []).map((c: any) => ({ id: c.id.toString(), name: c.name }))));
    api.get<any>(endpoints.staff.courses).then(r => setSubjects((r.data ?? []).map((s: any) => ({ id: s.course_id ?? s.id, course: s.course }))));
    api.get<any>(endpoints.public.sessions).then(r => setSessions((r.data ?? []).map((s: any) => s.name)));
    api.get<any>(endpoints.public.terms).then(r => setTerms([...new Set<string>((r.data ?? []).map((t: any) => t.name as string))]));
  }, []);

  const handle = async (fn: () => Promise<void>) => {
    setSaving(true);
    try { await fn(); toast.success('Saved'); }
    catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const TABS: [Tab, typeof BookOpen, string][] = [
    ['topics', BookOpen, 'Topics'],
    ['lessons', FileText, 'Lesson Plans'],
    ['weekly', CalendarDays, 'Weekly Scheme'],
  ];

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Curriculum Management</h1>

      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map(([key, Icon, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Icon size={16} />{label}
          </button>
        ))}
      </div>

      {/* ── TOPICS ── */}
      {tab === 'topics' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Plus size={16} />{topicForm.id ? 'Edit' : 'Add'} Topic</h2>
            <input placeholder="Topic title *" value={topicForm.title} onChange={e => setTopicForm(f => ({ ...f, title: e.target.value }))} className={inputCls} />
            <textarea placeholder="Description" value={topicForm.description} onChange={e => setTopicForm(f => ({ ...f, description: e.target.value }))} className={textareaCls} />
            <div className="grid grid-cols-2 gap-3">
              <select value={topicForm.classRoomId} onChange={e => setTopicForm(f => ({ ...f, classRoomId: e.target.value }))} className={inputCls}>
                <option value="">Class (optional)</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={topicForm.subjectId} onChange={e => setTopicForm(f => ({ ...f, subjectId: e.target.value }))} className={inputCls}>
                <option value="">Subject (optional)</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.course}</option>)}
              </select>
              <select value={topicForm.week} onChange={e => setTopicForm(f => ({ ...f, week: e.target.value }))} className={inputCls}>
                <option value="">Week</option>
                {Array.from({ length: 15 }, (_, i) => i + 1).map(w => <option key={w} value={w}>{`Week ${w}`}</option>)}
              </select>
              <select value={topicForm.term} onChange={e => setTopicForm(f => ({ ...f, term: e.target.value }))} className={inputCls}>
                <option value="">Term</option>
                {terms.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={topicForm.session} onChange={e => setTopicForm(f => ({ ...f, session: e.target.value }))} className={inputCls}>
                <option value="">Session</option>
                {sessions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handle(() => saveTopic(topicForm).then(() => setTopicForm(emptyTopic)))} disabled={saving || !topicForm.title}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
                <Save size={15} />{saving ? 'Saving…' : 'Save'}
              </button>
              {topicForm.id && <button onClick={() => setTopicForm(emptyTopic)} className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50"><X size={14} /></button>}
            </div>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {loading && <p className="text-gray-400 text-sm">Loading…</p>}
            {!loading && topics.length === 0 && <p className="text-gray-400 text-sm">No topics yet.</p>}
            {topics.map(t => (
              <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-800">{t.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{[t.classRoom, t.subject, t.term, t.session && `Week ${t.week}`].filter(Boolean).join(' · ')}</p>
                    {t.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{t.description}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setTopicForm({ id: t.id, title: t.title, description: t.description ?? '', week: t.week?.toString() ?? '', term: t.term ?? '', session: t.session ?? '', subjectId: t.subjectId ?? '', classRoomId: t.classRoomId ?? '' })}
                      className="text-xs px-3 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Edit</button>
                    <button onClick={() => deleteTopic(t.id).catch(() => toast.error('Failed'))} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LESSON PLANS ── */}
      {tab === 'lessons' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Plus size={16} />{lessonForm.id ? 'Edit' : 'Add'} Lesson Plan</h2>
            <input placeholder="Lesson title *" value={lessonForm.title} onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))} className={inputCls} />
            <div className="grid grid-cols-2 gap-3">
              <select value={lessonForm.classRoomId} onChange={e => setLessonForm(f => ({ ...f, classRoomId: e.target.value }))} className={inputCls}>
                <option value="">Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={lessonForm.subjectId} onChange={e => setLessonForm(f => ({ ...f, subjectId: e.target.value }))} className={inputCls}>
                <option value="">Subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.course}</option>)}
              </select>
              <select value={lessonForm.topicId} onChange={e => setLessonForm(f => ({ ...f, topicId: e.target.value }))} className={inputCls}>
                <option value="">Link to Topic (optional)</option>
                {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
              <input type="date" value={lessonForm.date} onChange={e => setLessonForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
              <input type="number" placeholder="Duration (mins)" value={lessonForm.duration} onChange={e => setLessonForm(f => ({ ...f, duration: e.target.value }))} className={inputCls} />
            </div>
            {(['objectives', 'content', 'resources', 'evaluation'] as const).map(field => (
              <textarea key={field} placeholder={field.charAt(0).toUpperCase() + field.slice(1)} value={lessonForm[field]}
                onChange={e => setLessonForm(f => ({ ...f, [field]: e.target.value }))} className={textareaCls} />
            ))}
            <div className="flex gap-2">
              <button onClick={() => handle(() => saveLessonPlan(lessonForm).then(() => setLessonForm(emptyLesson)))} disabled={saving || !lessonForm.title}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
                <Save size={15} />{saving ? 'Saving…' : 'Save'}
              </button>
              {lessonForm.id && <button onClick={() => setLessonForm(emptyLesson)} className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50"><X size={14} /></button>}
            </div>
          </div>

          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
            {loading && <p className="text-gray-400 text-sm">Loading…</p>}
            {!loading && lessonPlans.length === 0 && <p className="text-gray-400 text-sm">No lesson plans yet.</p>}
            {lessonPlans.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800">{p.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{[p.classRoom, p.subject, p.topic, p.date, p.duration && `${p.duration} mins`].filter(Boolean).join(' · ')}</p>
                    {p.objectives && <p className="text-sm text-gray-600 mt-1 line-clamp-2"><span className="font-medium">Objectives:</span> {p.objectives}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setLessonForm({ id: p.id, title: p.title, objectives: p.objectives ?? '', content: p.content ?? '', resources: p.resources ?? '', evaluation: p.evaluation ?? '', date: p.date ?? '', duration: p.duration?.toString() ?? '', topicId: p.topicId ?? '', subjectId: p.subjectId ?? '', classRoomId: p.classRoomId ?? '' })}
                      className="text-xs px-3 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Edit</button>
                    <button onClick={() => deleteLessonPlan(p.id).catch(() => toast.error('Failed'))} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── WEEKLY SCHEME ── */}
      {tab === 'weekly' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Plus size={16} />{schemeForm.id ? 'Edit' : 'Add'} Weekly Scheme</h2>
            <div className="grid grid-cols-2 gap-3">
              <select value={schemeForm.classRoomId} onChange={e => setSchemeForm(f => ({ ...f, classRoomId: e.target.value }))} className={inputCls}>
                <option value="">Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={schemeForm.subjectId} onChange={e => setSchemeForm(f => ({ ...f, subjectId: e.target.value }))} className={inputCls}>
                <option value="">Subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.course}</option>)}
              </select>
              <select value={schemeForm.week} onChange={e => setSchemeForm(f => ({ ...f, week: e.target.value }))} className={inputCls}>
                <option value="">Week *</option>
                {Array.from({ length: 15 }, (_, i) => i + 1).map(w => <option key={w} value={w}>{`Week ${w}`}</option>)}
              </select>
              <select value={schemeForm.term} onChange={e => setSchemeForm(f => ({ ...f, term: e.target.value }))} className={inputCls}>
                <option value="">Term *</option>
                {terms.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select suppressHydrationWarning value={schemeForm.session} onChange={e => setSchemeForm(f => ({ ...f, session: e.target.value }))} className={`${inputCls} col-span-2`}>
                              <option value="">Session *</option>
                              {sessions.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
            </div>
            <textarea placeholder="Scheme of work content *" value={schemeForm.content} onChange={e => setSchemeForm(f => ({ ...f, content: e.target.value }))} className={`${textareaCls} min-h-[140px]`} />
            <div className="flex gap-2">
              <button onClick={() => handle(() => saveWeeklyScheme(schemeForm).then(() => setSchemeForm(emptyScheme)))} disabled={saving || !schemeForm.week || !schemeForm.term || !schemeForm.session || !schemeForm.content}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
                <Save size={15} />{saving ? 'Saving…' : 'Save'}
              </button>
              {schemeForm.id && <button onClick={() => setSchemeForm(emptyScheme)} className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50"><X size={14} /></button>}
            </div>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {loading && <p className="text-gray-400 text-sm">Loading…</p>}
            {!loading && weeklySchemes.length === 0 && <p className="text-gray-400 text-sm">No weekly schemes yet.</p>}
            {weeklySchemes.map(s => (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800">Week {s.week} — {s.term} Term</p>
                    <p className="text-xs text-gray-500 mt-0.5">{[s.session, s.classRoom, s.subject].filter(Boolean).join(' · ')}</p>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-3 whitespace-pre-wrap">{s.content}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setSchemeForm({ id: s.id, week: s.week.toString(), term: s.term, session: s.session, content: s.content, subjectId: s.subjectId ?? '', classRoomId: s.classRoomId ?? '' })}
                      className="text-xs px-3 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Edit</button>
                    <button onClick={() => deleteWeeklyScheme(s.id).catch(() => toast.error('Failed'))} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
