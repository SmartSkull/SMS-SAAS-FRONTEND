'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, Video, Loader2, ExternalLink } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useSchoolData } from '@/hooks/useSchoolData';

interface OnlineClass {
  id: number;
  title: string;
  className: string;
  scheduledAt: string;
  durationMinutes: number;
  roomUrl: string;
  staff?: { user?: { firstname: string; lastname: string } };
}

export default function StaffOnlineClasses() {
  const [classes, setClasses] = useState<OnlineClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [form, setForm] = useState({ title: '', className: '', scheduledAt: '', durationMinutes: 60 });
  const { classes: classOptions } = useSchoolData();
  const toast = useToast();

  const load = () => {
    setLoading(true);
    api.get<any>(endpoints.staff.onlineClasses)
      .then(r => setClasses(r.data ?? r ?? []))
      .catch(() => toast.error('Failed to load classes'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(endpoints.staff.onlineClasses, form);
      toast.success('Online class created');
      setShowForm(false);
      setForm({ title: '', className: '', scheduledAt: '', durationMinutes: 60 });
      load();
    } catch { toast.error('Failed to create class'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await api.delete(endpoints.staff.onlineClass(id));
      toast.success('Deleted');
      setClasses(p => p.filter(c => c.id !== id));
    } catch { toast.error('Failed to delete'); }
    finally { setDeleting(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Online Classes</h1>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
          <Plus size={16} /> Schedule Class
        </button>
      </div>

      {/* Schedule Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Schedule Online Class</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required
                  placeholder="e.g. Mathematics — Algebra"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
                <select value={form.className} onChange={e => setForm(p => ({ ...p, className: e.target.value }))} required
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white">
                  <option value="">Select class</option>
                  {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date & Time</label>
                <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))} required
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Duration (minutes)</label>
                <input type="number" min={15} max={240} value={form.durationMinutes}
                  onChange={e => setForm(p => ({ ...p, durationMinutes: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {submitting ? 'Creating…' : 'Create & Get Link'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Classes List */}
      <div className="bg-white rounded-2xl card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Video size={40} className="mb-3 opacity-40" />
            <p className="text-sm">No online classes scheduled yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {classes.map(c => {
              const dt = new Date(c.scheduledAt);
              const endTime = new Date(dt.getTime() + c.durationMinutes * 60 * 1000);
              const isExpired = endTime < new Date();
              return (
                <div key={c.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isExpired ? 'bg-gray-100' : 'bg-blue-100'}`}>
                    <Video size={18} className={isExpired ? 'text-gray-400' : 'text-blue-600'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{c.title}</p>
                    <p className="text-xs text-gray-500">{c.className} · {dt.toLocaleString()} · {c.durationMinutes} min</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isExpired ? (
                      <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-400">Ended</span>
                    ) : (
                      <a href={c.roomUrl} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                        <ExternalLink size={12} /> Join
                      </a>
                    )}
                    <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg disabled:opacity-50">
                      {deleting === c.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
