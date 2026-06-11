'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, CalendarDays } from 'lucide-react';

interface Task { id: string; title: string; subject: string; dueDate: string; priority: 'low' | 'medium' | 'high'; done: boolean; }
const KEY = 'student_planner_tasks';
const pri = { high: 'bg-red-100 text-red-700', medium: 'bg-orange-100 text-orange-700', low: 'bg-gray-100 text-gray-600' };

function today() { return new Date().toISOString().slice(0, 10); }
function isOverdue(d: string) { return d && d < today(); }
function isToday(d: string) { return d === today(); }

export default function PlannerPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [form, setForm] = useState({ title: '', subject: '', dueDate: '', priority: 'medium' as Task['priority'] });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    try { setTasks(JSON.parse(localStorage.getItem(KEY) ?? '[]')); } catch {}
  }, []);

  const save = (updated: Task[]) => { setTasks(updated); localStorage.setItem(KEY, JSON.stringify(updated)); };

  const add = () => {
    if (!form.title.trim()) return;
    save([...tasks, { ...form, id: Date.now().toString(), done: false }]);
    setForm({ title: '', subject: '', dueDate: '', priority: 'medium' });
    setShowForm(false);
  };

  const toggle = (id: string) => save(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const remove = (id: string) => save(tasks.filter(t => t.id !== id));

  const sorted = [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (a.dueDate || '9999') < (b.dueDate || '9999') ? -1 : 1;
  });

  const pending = tasks.filter(t => !t.done).length;

  return (
    <div className="max-w-lg mx-auto space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Study Planner</h1>
          {pending > 0 && <p className="text-sm text-gray-500">{pending} task{pending !== 1 ? 's' : ''} remaining</p>}
        </div>
        <button onClick={() => setShowForm(p => !p)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700">
          <Plus size={16} /> Add Task
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="Task title…" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400" />
          <div className="grid grid-cols-2 gap-3">
            <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
              placeholder="Subject (optional)" className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400" />
            <input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400" />
          </div>
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as const).map(p => (
              <button key={p} onClick={() => setForm(f => ({ ...f, priority: p }))}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize border ${form.priority === p ? pri[p] + ' border-current' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                {p}
              </button>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            <button onClick={add} disabled={!form.title.trim()}
              className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50">Add</button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <CalendarDays size={40} className="mb-3 opacity-30" />
          <p className="text-sm">No tasks yet. Add one to get started!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(t => (
            <div key={t.id} className={`bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 border ${
              !t.done && isOverdue(t.dueDate) ? 'border-red-200 bg-red-50/30' :
              !t.done && isToday(t.dueDate) ? 'border-yellow-200 bg-yellow-50/30' : 'border-transparent'
            }`}>
              <button onClick={() => toggle(t.id)} className="shrink-0 text-gray-400 hover:text-purple-600">
                {t.done ? <CheckCircle2 size={22} className="text-green-500" /> : <Circle size={22} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${t.done ? 'line-through text-gray-400' : 'text-gray-900'}`}>{t.title}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {t.subject && <span className="text-xs text-gray-400">{t.subject}</span>}
                  {t.dueDate && (
                    <span className={`text-xs font-medium ${
                      !t.done && isOverdue(t.dueDate) ? 'text-red-600' :
                      !t.done && isToday(t.dueDate) ? 'text-yellow-600' : 'text-gray-400'
                    }`}>
                      {isToday(t.dueDate) ? 'Today' : isOverdue(t.dueDate) ? `Overdue · ${t.dueDate}` : t.dueDate}
                    </span>
                  )}
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${pri[t.priority]}`}>{t.priority}</span>
                </div>
              </div>
              <button onClick={() => remove(t.id)} className="shrink-0 text-gray-300 hover:text-red-400">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
