'use client';
import { useState, useEffect } from 'react';
import {
  BookOpen, FileText, CalendarDays, Plus, Trash2, Save, X,
  Search, ChevronDown, ChevronUp, Clock, Tag, GraduationCap,
  ListChecks, Layers, Edit2, AlertCircle,
} from 'lucide-react';
import { useCurriculum, type CurriculumTopic, type LessonPlan, type WeeklyScheme } from '@/hooks/staff';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import clsx from 'clsx';

const inputCls = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white transition';
const textareaCls = `${inputCls} min-h-[90px] resize-y`;
const labelCls = 'block text-xs font-semibold text-gray-500 mb-1';

type Tab = 'topics' | 'lessons' | 'weekly';

/* ─── Shared Field Group ──────────────────────────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

/* ─── Section Badge ───────────────────────────────────────────────────── */
function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: string }) {
  const map: Record<string, string> = {
    blue:   'bg-blue-50 text-blue-700 border border-blue-100',
    purple: 'bg-purple-50 text-purple-700 border border-purple-100',
    amber:  'bg-amber-50 text-amber-700 border border-amber-100',
    green:  'bg-emerald-50 text-emerald-700 border border-emerald-100',
    gray:   'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold ${map[color] ?? map.gray}`}>
      {children}
    </span>
  );
}

/* ─── Empty State ─────────────────────────────────────────────────────── */
function Empty({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
        <Icon size={26} className="text-gray-300" />
      </div>
      <p className="text-sm font-medium text-gray-400">{label}</p>
    </div>
  );
}

/* ─── Collapsible Form Shell ──────────────────────────────────────────── */
function FormShell({
  title, icon: Icon, open, onToggle, children, onSave, onCancel, saving, canSave, editMode,
}: {
  title: string; icon: React.ElementType; open: boolean; onToggle: () => void;
  children: React.ReactNode; onSave: () => void; onCancel?: () => void;
  saving: boolean; canSave: boolean; editMode: boolean;
}) {
  return (
    <div className={clsx('rounded-2xl border shadow-sm overflow-hidden transition-all', open ? 'border-blue-200 bg-white' : 'border-gray-100 bg-white')}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center', open ? 'bg-blue-600' : 'bg-gray-100')}>
            <Icon size={15} className={open ? 'text-white' : 'text-gray-500'} />
          </div>
          <span className="font-semibold text-gray-900 text-sm">
            {editMode ? `Edit ${title}` : `Add New ${title}`}
          </span>
          {editMode && <Badge color="amber"><Edit2 size={9} /> Editing</Badge>}
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-100">
          <div className="pt-4 space-y-4">{children}</div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={onSave}
              disabled={saving || !canSave}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 shadow-sm shadow-blue-600/20"
            >
              <Save size={14} /> {saving ? 'Saving…' : 'Save'}
            </button>
            {editMode && onCancel && (
              <button onClick={onCancel} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
                <X size={14} /> Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════ */
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
  const [formOpen, setFormOpen] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  useEffect(() => setMounted(true), []);

  const emptyTopic  = { id: '', title: '', description: '', week: '', term: '', session: '', subjectId: '', classRoomId: '' };
  const emptyLesson = { id: '', title: '', objectives: '', content: '', resources: '', evaluation: '', date: '', duration: '', topicId: '', subjectId: '', classRoomId: '' };
  const emptyScheme = { id: '', week: '', term: '', session: '', content: '', subjectId: '', classRoomId: '' };

  const [topicForm,  setTopicForm]  = useState(emptyTopic);
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
    try { await fn(); toast.success('Saved successfully'); setFormOpen(false); }
    catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, fn: (id: string) => Promise<void>) => {
    setDeleting(id);
    try { await fn(id); toast.success('Deleted'); }
    catch { toast.error('Failed to delete'); }
    finally { setDeleting(null); }
  };

  const TABS: [Tab, typeof BookOpen, string, string][] = [
    ['topics',  BookOpen,    'Topics',         `${topics.length}`],
    ['lessons', FileText,    'Lesson Plans',   `${lessonPlans.length}`],
    ['weekly',  CalendarDays,'Weekly Scheme',  `${weeklySchemes.length}`],
  ];

  const weeks = Array.from({ length: 15 }, (_, i) => i + 1);

  // Filtered lists
  const q = search.toLowerCase();
  const filteredTopics  = topics.filter(t  => !q || t.title.toLowerCase().includes(q) || (t.subject ?? '').toLowerCase().includes(q) || (t.classRoom ?? '').toLowerCase().includes(q));
  const filteredLessons = lessonPlans.filter(p => !q || p.title.toLowerCase().includes(q) || (p.subject ?? '').toLowerCase().includes(q));
  const filteredSchemes = weeklySchemes.filter(s => !q || s.content.toLowerCase().includes(q) || (s.subject ?? '').toLowerCase().includes(q));

  if (!mounted) return null;

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Curriculum</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage topics, lesson plans and weekly schemes of work</p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
        {TABS.map(([key, Icon, label, count]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setSearch(''); }}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Icon size={15} />
            {label}
            {Number(count) > 0 && (
              <span className={clsx('text-[11px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center',
                tab === key ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600')}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4">

        {/* ════════ TOPICS ════════ */}
        {tab === 'topics' && (
          <>
            <FormShell
              title="Topic" icon={BookOpen}
              open={formOpen} onToggle={() => setFormOpen(v => !v)}
              onSave={() => handle(() => saveTopic(topicForm).then(() => setTopicForm(emptyTopic)))}
              onCancel={() => { setTopicForm(emptyTopic); setFormOpen(false); }}
              saving={saving} canSave={!!topicForm.title} editMode={!!topicForm.id}
            >
              <Field label="Topic Title *">
                <input placeholder="e.g. Introduction to Algebra" value={topicForm.title}
                  onChange={e => setTopicForm(f => ({ ...f, title: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Description">
                <textarea placeholder="What will students learn in this topic?" value={topicForm.description}
                  onChange={e => setTopicForm(f => ({ ...f, description: e.target.value }))} className={textareaCls} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Class">
                  <select value={topicForm.classRoomId} onChange={e => setTopicForm(f => ({ ...f, classRoomId: e.target.value }))} className={inputCls}>
                    <option value="">All classes</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Subject">
                  <select value={topicForm.subjectId} onChange={e => setTopicForm(f => ({ ...f, subjectId: e.target.value }))} className={inputCls}>
                    <option value="">All subjects</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.course}</option>)}
                  </select>
                </Field>
                <Field label="Week">
                  <select value={topicForm.week} onChange={e => setTopicForm(f => ({ ...f, week: e.target.value }))} className={inputCls}>
                    <option value="">Select week</option>
                    {weeks.map(w => <option key={w} value={w}>Week {w}</option>)}
                  </select>
                </Field>
                <Field label="Term">
                  <select value={topicForm.term} onChange={e => setTopicForm(f => ({ ...f, term: e.target.value }))} className={inputCls}>
                    <option value="">Select term</option>
                    {terms.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Session">
                  <select value={topicForm.session} onChange={e => setTopicForm(f => ({ ...f, session: e.target.value }))} className={inputCls}>
                    <option value="">Select session</option>
                    {sessions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
            </FormShell>

            {/* Search */}
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search topics…"
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white" />
            </div>

            {/* Topics list */}
            {loading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />)}</div>
            ) : filteredTopics.length === 0 ? (
              <Empty icon={BookOpen} label={search ? 'No topics match your search.' : 'No topics yet. Add one above.'} />
            ) : (
              <div className="space-y-3">
                {filteredTopics.map(t => (
                  <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-blue-100 transition-colors group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <p className="font-semibold text-gray-900 text-sm">{t.title}</p>
                          {t.week && <Badge color="blue"><Clock size={9} /> Week {t.week}</Badge>}
                          {t.term  && <Badge color="purple">{t.term}</Badge>}
                          {t.subject    && <Badge color="green"><Tag size={9} /> {t.subject}</Badge>}
                          {t.classRoom  && <Badge color="amber"><GraduationCap size={9} /> {t.classRoom}</Badge>}
                        </div>
                        {t.session && <p className="text-xs text-gray-400 mb-1">{t.session}</p>}
                        {t.description && <p className="text-sm text-gray-500 line-clamp-2">{t.description}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setTopicForm({ id: t.id, title: t.title, description: t.description ?? '', week: t.week?.toString() ?? '', term: t.term ?? '', session: t.session ?? '', subjectId: t.subjectId ?? '', classRoomId: t.classRoomId ?? '' }); setFormOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition">
                          <Edit2 size={12} /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(t.id, deleteTopic)}
                          disabled={deleting === t.id}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-40">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ════════ LESSON PLANS ════════ */}
        {tab === 'lessons' && (
          <>
            <FormShell
              title="Lesson Plan" icon={FileText}
              open={formOpen} onToggle={() => setFormOpen(v => !v)}
              onSave={() => handle(() => saveLessonPlan(lessonForm).then(() => setLessonForm(emptyLesson)))}
              onCancel={() => { setLessonForm(emptyLesson); setFormOpen(false); }}
              saving={saving} canSave={!!lessonForm.title} editMode={!!lessonForm.id}
            >
              <Field label="Lesson Title *">
                <input placeholder="e.g. Fractions — Adding and Subtracting" value={lessonForm.title}
                  onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))} className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Class">
                  <select value={lessonForm.classRoomId} onChange={e => setLessonForm(f => ({ ...f, classRoomId: e.target.value }))} className={inputCls}>
                    <option value="">Select class</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Subject">
                  <select value={lessonForm.subjectId} onChange={e => setLessonForm(f => ({ ...f, subjectId: e.target.value }))} className={inputCls}>
                    <option value="">Select subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.course}</option>)}
                  </select>
                </Field>
                <Field label="Link to Topic">
                  <select value={lessonForm.topicId} onChange={e => setLessonForm(f => ({ ...f, topicId: e.target.value }))} className={inputCls}>
                    <option value="">No topic</option>
                    {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                </Field>
                <Field label="Date">
                  <input type="date" value={lessonForm.date} onChange={e => setLessonForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Duration (mins)">
                  <input type="number" placeholder="e.g. 40" value={lessonForm.duration}
                    onChange={e => setLessonForm(f => ({ ...f, duration: e.target.value }))} className={inputCls} />
                </Field>
              </div>
              {([
                ['objectives',  'Learning Objectives',    'By the end of this lesson, students will be able to…'],
                ['content',     'Lesson Content',         'Main content and activities…'],
                ['resources',   'Resources / Materials',  'Textbooks, aids, tools needed…'],
                ['evaluation',  'Evaluation / Assessment','How will you assess understanding?'],
              ] as [keyof typeof lessonForm, string, string][]).map(([field, label, ph]) => (
                <Field key={field} label={label}>
                  <textarea placeholder={ph} value={lessonForm[field]}
                    onChange={e => setLessonForm(f => ({ ...f, [field]: e.target.value }))} className={textareaCls} />
                </Field>
              ))}
            </FormShell>

            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search lesson plans…"
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white" />
            </div>

            {loading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />)}</div>
            ) : filteredLessons.length === 0 ? (
              <Empty icon={FileText} label={search ? 'No lesson plans match your search.' : 'No lesson plans yet. Add one above.'} />
            ) : (
              <div className="space-y-3">
                {filteredLessons.map(p => (
                  <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-blue-100 transition-colors group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <p className="font-semibold text-gray-900 text-sm">{p.title}</p>
                          {p.subject    && <Badge color="green"><Tag size={9} /> {p.subject}</Badge>}
                          {p.classRoom  && <Badge color="amber"><GraduationCap size={9} /> {p.classRoom}</Badge>}
                          {p.duration   && <Badge color="blue"><Clock size={9} /> {p.duration} mins</Badge>}
                        </div>
                        {p.date && <p className="text-xs text-gray-400 mb-1.5">{new Date(p.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                        {p.topic && <p className="text-xs text-gray-400 mb-1"><span className="font-medium text-gray-500">Topic:</span> {p.topic}</p>}
                        {p.objectives && <p className="text-sm text-gray-500 line-clamp-2"><span className="font-medium text-gray-600">Objectives:</span> {p.objectives}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setLessonForm({ id: p.id, title: p.title, objectives: p.objectives ?? '', content: p.content ?? '', resources: p.resources ?? '', evaluation: p.evaluation ?? '', date: p.date ?? '', duration: p.duration?.toString() ?? '', topicId: p.topicId ?? '', subjectId: p.subjectId ?? '', classRoomId: p.classRoomId ?? '' }); setFormOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition">
                          <Edit2 size={12} /> Edit
                        </button>
                        <button onClick={() => handleDelete(p.id, deleteLessonPlan)} disabled={deleting === p.id}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-40">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ════════ WEEKLY SCHEME ════════ */}
        {tab === 'weekly' && (
          <>
            <FormShell
              title="Weekly Scheme" icon={CalendarDays}
              open={formOpen} onToggle={() => setFormOpen(v => !v)}
              onSave={() => handle(() => saveWeeklyScheme(schemeForm).then(() => setSchemeForm(emptyScheme)))}
              onCancel={() => { setSchemeForm(emptyScheme); setFormOpen(false); }}
              saving={saving} canSave={!!schemeForm.week && !!schemeForm.term && !!schemeForm.session && !!schemeForm.content}
              editMode={!!schemeForm.id}
            >
              <div className="grid grid-cols-2 gap-3">
                <Field label="Class">
                  <select value={schemeForm.classRoomId} onChange={e => setSchemeForm(f => ({ ...f, classRoomId: e.target.value }))} className={inputCls}>
                    <option value="">All classes</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Subject">
                  <select value={schemeForm.subjectId} onChange={e => setSchemeForm(f => ({ ...f, subjectId: e.target.value }))} className={inputCls}>
                    <option value="">All subjects</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.course}</option>)}
                  </select>
                </Field>
                <Field label="Week *">
                  <select value={schemeForm.week} onChange={e => setSchemeForm(f => ({ ...f, week: e.target.value }))} className={inputCls}>
                    <option value="">Select week</option>
                    {weeks.map(w => <option key={w} value={w}>Week {w}</option>)}
                  </select>
                </Field>
                <Field label="Term *">
                  <select value={schemeForm.term} onChange={e => setSchemeForm(f => ({ ...f, term: e.target.value }))} className={inputCls}>
                    <option value="">Select term</option>
                    {terms.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <div className="col-span-2">
                  <Field label="Session *">
                    <select suppressHydrationWarning value={schemeForm.session} onChange={e => setSchemeForm(f => ({ ...f, session: e.target.value }))} className={inputCls}>
                      <option value="">Select session</option>
                      {sessions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>
              </div>
              <Field label="Scheme of Work Content *">
                <textarea placeholder="Describe the topics, activities and objectives for this week…" value={schemeForm.content}
                  onChange={e => setSchemeForm(f => ({ ...f, content: e.target.value }))} className={`${textareaCls} min-h-[120px]`} />
              </Field>
            </FormShell>

            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search weekly schemes…"
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white" />
            </div>

            {loading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />)}</div>
            ) : filteredSchemes.length === 0 ? (
              <Empty icon={CalendarDays} label={search ? 'No schemes match your search.' : 'No weekly schemes yet. Add one above.'} />
            ) : (
              <div className="space-y-3">
                {filteredSchemes.map(s => (
                  <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-blue-100 transition-colors group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <p className="font-semibold text-gray-900 text-sm">Week {s.week}</p>
                          <Badge color="purple">{s.term} Term</Badge>
                          {s.subject    && <Badge color="green"><Tag size={9} /> {s.subject}</Badge>}
                          {s.classRoom  && <Badge color="amber"><GraduationCap size={9} /> {s.classRoom}</Badge>}
                        </div>
                        <p className="text-xs text-gray-400 mb-1.5">{s.session}</p>
                        <p className="text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap">{s.content}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setSchemeForm({ id: s.id, week: s.week.toString(), term: s.term, session: s.session, content: s.content, subjectId: s.subjectId ?? '', classRoomId: s.classRoomId ?? '' }); setFormOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition">
                          <Edit2 size={12} /> Edit
                        </button>
                        <button onClick={() => handleDelete(s.id, deleteWeeklyScheme)} disabled={deleting === s.id}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-40">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
