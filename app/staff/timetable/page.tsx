'use client';
import { useState, useEffect } from 'react';
import { CalendarDays, BookOpen, GraduationCap, Plus, Trash2, Save } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

type ClassTimetable = { id: string; classRoom: string; classRoomId: string; content: string };
type ExamTimetable  = { id: string; level: string; content: string };

export default function StaffTimetablePage() {
  const toast = useToast();
  const [tab, setTab] = useState<'class' | 'exam'>('class');

  // Class timetable state
  const [classes, setClasses] = useState<{ name: string; id: string }[]>([]);
  const [classTimetables, setClassTimetables] = useState<ClassTimetable[]>([]);
  const [classForm, setClassForm] = useState({ id: '', classRoomId: '', content: '' });
  const [savingClass, setSavingClass] = useState(false);

  // Exam timetable state
  const [examTimetables, setExamTimetables] = useState<ExamTimetable[]>([]);
  const [examForm, setExamForm] = useState({ id: '', level: '', content: '' });
  const [savingExam, setSavingExam] = useState(false);

  useEffect(() => {
    api.get<any>(endpoints.staff.classes).then(r => setClasses(r.data ?? []));
    loadClass();
    loadExam();
  }, []);

  const loadClass = () =>
    api.get<any>(endpoints.staff.classTimetable).then(r => setClassTimetables(r.data ?? []));

  const loadExam = () =>
    api.get<any>(endpoints.staff.examTimetable).then(r => setExamTimetables(r.data ?? []));

  const saveClass = async () => {
    if (!classForm.classRoomId || !classForm.content.trim()) return toast.error('Select a class and enter content');
    setSavingClass(true);
    try {
      await api.post(endpoints.staff.classTimetable, classForm);
      toast.success(classForm.id ? 'Updated' : 'Created');
      setClassForm({ id: '', classRoomId: '', content: '' });
      loadClass();
    } catch { toast.error('Failed to save'); }
    finally { setSavingClass(false); }
  };

  const deleteClass = async (id: string) => {
    try { await api.delete(`${endpoints.staff.classTimetable}/${id}`); loadClass(); toast.success('Deleted'); }
    catch { toast.error('Failed to delete'); }
  };

  const saveExam = async () => {
    if (!examForm.level || !examForm.content.trim()) return toast.error('Select a level and enter content');
    setSavingExam(true);
    try {
      await api.post(endpoints.staff.examTimetable, examForm);
      toast.success(examForm.id ? 'Updated' : 'Created');
      setExamForm({ id: '', level: '', content: '' });
      loadExam();
    } catch { toast.error('Failed to save'); }
    finally { setSavingExam(false); }
  };

  const deleteExam = async (id: string) => {
    try { await api.delete(`${endpoints.staff.examTimetable}/${id}`); loadExam(); toast.success('Deleted'); }
    catch { toast.error('Failed to delete'); }
  };

  const inputCls = 'w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white';
  const textareaCls = `${inputCls} min-h-[160px] resize-y font-mono`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Timetable Management</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {([['class', BookOpen, 'Class Timetable'], ['exam', GraduationCap, 'Exam Timetable']] as const).map(([key, Icon, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Icon size={16} />{label}
          </button>
        ))}
      </div>

      {tab === 'class' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Plus size={16} />{classForm.id ? 'Edit' : 'Add'} Class Timetable</h2>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Class</label>
              <select value={classForm.classRoomId} onChange={e => setClassForm(f => ({ ...f, classRoomId: e.target.value }))} className={inputCls}>
                <option value="">Select class</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Timetable Content</label>
              <textarea value={classForm.content} onChange={e => setClassForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Paste or type the timetable here (e.g. Monday: Math 8am, English 9am...)" className={textareaCls} />
            </div>
            <div className="flex gap-2">
              <button onClick={saveClass} disabled={savingClass}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors">
                <Save size={15} />{savingClass ? 'Saving…' : 'Save'}
              </button>
              {classForm.id && <button onClick={() => setClassForm({ id: '', classRoomId: '', content: '' })}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>}
            </div>
          </div>

          {/* List */}
          <div className="space-y-3">
            {classTimetables.length === 0 && <p className="text-gray-400 text-sm">No class timetables yet.</p>}
            {classTimetables.map(t => (
              <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-gray-800 flex items-center gap-2"><CalendarDays size={15} className="text-blue-500" />{t.classRoom}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setClassForm({ id: t.id, classRoomId: t.classRoomId, content: t.content })}
                      className="text-xs px-3 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Edit</button>
                    <button onClick={() => deleteClass(t.id)} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>
                  </div>
                </div>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">{t.content}</pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'exam' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Plus size={16} />{examForm.id ? 'Edit' : 'Add'} Exam Timetable</h2>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Level</label>
              <select value={examForm.level} onChange={e => setExamForm(f => ({ ...f, level: e.target.value }))} className={inputCls}>
                <option value="">Select level</option>
                <option value="junior">Junior</option>
                <option value="senior">Senior</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Timetable Content</label>
              <textarea value={examForm.content} onChange={e => setExamForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Paste or type the exam timetable here..." className={textareaCls} />
            </div>
            <div className="flex gap-2">
              <button onClick={saveExam} disabled={savingExam}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors">
                <Save size={15} />{savingExam ? 'Saving…' : 'Save'}
              </button>
              {examForm.id && <button onClick={() => setExamForm({ id: '', level: '', content: '' })}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>}
            </div>
          </div>

          {/* List */}
          <div className="space-y-3">
            {examTimetables.length === 0 && <p className="text-gray-400 text-sm">No exam timetables yet.</p>}
            {examTimetables.map(t => (
              <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-gray-800 flex items-center gap-2 capitalize"><GraduationCap size={15} className="text-purple-500" />{t.level} Level</span>
                  <div className="flex gap-2">
                    <button onClick={() => setExamForm({ id: t.id, level: t.level, content: t.content })}
                      className="text-xs px-3 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Edit</button>
                    <button onClick={() => deleteExam(t.id)} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>
                  </div>
                </div>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">{t.content}</pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
