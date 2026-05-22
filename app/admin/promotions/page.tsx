'use client';
import { useEffect, useState } from 'react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { ArrowRight, RefreshCw, UserCheck, Users } from 'lucide-react';
import type { ApiResponse } from '@/types';
import clsx from 'clsx';

interface ClassInfo { id: string; name: string; studentCount: number; }

type Tab = 'promote' | 'repeat' | 'transfer';

export default function PromotionsPage() {
  const [classes, setClasses]       = useState<ClassInfo[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<Tab>('promote');
  const [acting, setActing]         = useState(false);
  const toast = useToast();

  // Promote state
  const [fromClass, setFromClass]   = useState('');
  const [toClass, setToClass]       = useState('');

  // Repeat state
  const [repeatClass, setRepeatClass] = useState('');
  const [students, setStudents]       = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Transfer state
  const [transferStudent, setTransferStudent] = useState('');
  const [transferTo, setTransferTo]           = useState('');
  const [allStudents, setAllStudents]         = useState<any[]>([]);

  useEffect(() => {
    api.get<ApiResponse<ClassInfo[]>>(endpoints.admin.promotionClasses)
      .then(r => setClasses(r.data ?? []))
      .catch(() => toast.error('Failed to load classes'))
      .finally(() => setLoading(false));
  }, []);

  // Load students for repeat tab
  useEffect(() => {
    if (tab !== 'repeat' || !repeatClass) return;
    setLoadingStudents(true);
    setSelectedIds(new Set());
    api.get<ApiResponse<any>>(endpoints.admin.students, { class: classes.find(c => c.id === repeatClass)?.name, per_page: '200' })
      .then(r => setStudents(r.data ?? []))
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoadingStudents(false));
  }, [repeatClass, tab]);

  // Load all students for transfer tab
  useEffect(() => {
    if (tab !== 'transfer') return;
    api.get<ApiResponse<any>>(endpoints.admin.students, { per_page: '200' })
      .then(r => setAllStudents(r.data ?? []))
      .catch(() => {});
  }, [tab]);

  const handlePromote = async () => {
    if (!fromClass || !toClass) return toast.error('Select both classes');
    setActing(true);
    try {
      const r = await api.post<ApiResponse<any>>(endpoints.admin.promotionPromote, { fromClassId: fromClass, toClassId: toClass });
      toast.success(r.message ?? 'Promoted successfully');
      // Refresh class counts
      const updated = await api.get<ApiResponse<ClassInfo[]>>(endpoints.admin.promotionClasses);
      setClasses(updated.data ?? []);
      setFromClass(''); setToClass('');
    } catch (e: any) { toast.error(e?.message ?? 'Failed to promote'); }
    finally { setActing(false); }
  };

  const handleRepeat = async () => {
    if (!selectedIds.size) return toast.error('Select at least one student');
    setActing(true);
    try {
      const r = await api.post<ApiResponse<any>>(endpoints.admin.promotionRepeat, { studentIds: [...selectedIds] });
      toast.success(r.message ?? 'Marked to repeat');
      setSelectedIds(new Set());
    } catch (e: any) { toast.error(e?.message ?? 'Failed'); }
    finally { setActing(false); }
  };

  const handleTransfer = async () => {
    if (!transferStudent || !transferTo) return toast.error('Select student and destination class');
    setActing(true);
    try {
      const r = await api.post<ApiResponse<any>>(endpoints.admin.promotionTransfer, { studentId: transferStudent, toClassId: transferTo });
      toast.success(r.message ?? 'Transferred successfully');
      setTransferStudent(''); setTransferTo('');
    } catch (e: any) { toast.error(e?.message ?? 'Failed to transfer'); }
    finally { setActing(false); }
  };

  const toggleStudent = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'promote', label: 'Promote Class', icon: ArrowRight },
    { key: 'repeat',  label: 'Repeat Students', icon: RefreshCw },
    { key: 'transfer', label: 'Transfer Student', icon: UserCheck },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Student Promotion</h1>
        <p className="text-sm text-gray-500 mt-1">Promote entire classes, mark students to repeat, or transfer individual students.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition',
              tab === key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

        {/* ── Promote Class ── */}
        {tab === 'promote' && (
          <div className="space-y-5">
            <p className="text-sm text-gray-600">Move all students from one class to another. For example, promote all JSS1 students to JSS2.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">From Class</label>
                <select value={fromClass} onChange={e => setFromClass(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">Select class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.studentCount} students)</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">To Class</label>
                <select value={toClass} onChange={e => setToClass(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">Select class</option>
                  {classes.filter(c => c.id !== fromClass).map(c => <option key={c.id} value={c.id}>{c.name} ({c.studentCount} students)</option>)}
                </select>
              </div>
            </div>

            {fromClass && toClass && (
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
                <Users size={15} className="shrink-0" />
                <span>
                  <strong>{classes.find(c => c.id === fromClass)?.studentCount ?? 0}</strong> students from{' '}
                  <strong>{classes.find(c => c.id === fromClass)?.name}</strong> will be moved to{' '}
                  <strong>{classes.find(c => c.id === toClass)?.name}</strong>.
                </span>
              </div>
            )}

            <button onClick={handlePromote} disabled={acting || !fromClass || !toClass}
              className="flex items-center gap-2 px-6 py-2.5 btn-brand text-white rounded-xl text-sm font-semibold disabled:opacity-50">
              <ArrowRight size={15} /> {acting ? 'Promoting…' : 'Promote Class'}
            </button>
          </div>
        )}

        {/* ── Repeat Students ── */}
        {tab === 'repeat' && (
          <div className="space-y-5">
            <p className="text-sm text-gray-600">Select students who will repeat their current class next session.</p>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Select Class</label>
              <select value={repeatClass} onChange={e => setRepeatClass(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="">Select class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {repeatClass && (
              loadingStudents ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
              ) : students.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No students in this class.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500">{selectedIds.size} of {students.length} selected</p>
                    <button onClick={() => setSelectedIds(selectedIds.size === students.length ? new Set() : new Set(students.map((s: any) => s.student_id)))}
                      className="text-xs text-blue-600 font-semibold hover:text-blue-700">
                      {selectedIds.size === students.length ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                  {students.map((s: any) => (
                    <label key={s.student_id} className={clsx('flex items-center gap-3 px-4 py-2.5 rounded-xl border cursor-pointer transition',
                      selectedIds.has(s.student_id) ? 'border-blue-400 bg-blue-50' : 'border-gray-100 hover:bg-gray-50')}>
                      <input type="checkbox" checked={selectedIds.has(s.student_id)} onChange={() => toggleStudent(s.student_id)} className="accent-blue-600" />
                      <span className="text-sm font-medium text-gray-800">{s.firstname} {s.lastname}</span>
                      <span className="text-xs text-gray-400 ml-auto">{s.student_id}</span>
                    </label>
                  ))}
                </div>
              )
            )}

            <button onClick={handleRepeat} disabled={acting || !selectedIds.size}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
              <RefreshCw size={15} /> {acting ? 'Saving…' : `Mark ${selectedIds.size || ''} Student(s) to Repeat`}
            </button>
          </div>
        )}

        {/* ── Transfer Student ── */}
        {tab === 'transfer' && (
          <div className="space-y-5">
            <p className="text-sm text-gray-600">Move a single student from their current class to a different class.</p>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Student</label>
              <select value={transferStudent} onChange={e => setTransferStudent(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="">Select student</option>
                {allStudents.map((s: any) => (
                  <option key={s.student_id} value={s.student_id}>
                    {s.firstname} {s.lastname} — {s.class || 'No class'} ({s.student_id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Transfer To</label>
              <select value={transferTo} onChange={e => setTransferTo(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="">Select destination class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <button onClick={handleTransfer} disabled={acting || !transferStudent || !transferTo}
              className="flex items-center gap-2 px-6 py-2.5 btn-brand text-white rounded-xl text-sm font-semibold disabled:opacity-50">
              <UserCheck size={15} /> {acting ? 'Transferring…' : 'Transfer Student'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
