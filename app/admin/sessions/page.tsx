'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Star, X } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import type { ApiResponse } from '@/types';

interface Session { id: number; name: string; isCurrent: boolean; }
interface Term { id: number; name: string; isCurrent: boolean; session?: string; }

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionModal, setSessionModal] = useState(false);
  const [newSession, setNewSession] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<ApiResponse<{ sessions: Session[] }>>(endpoints.admin.sessions),
      api.get<ApiResponse<{ terms: Term[] }>>(endpoints.admin.terms),
    ])
      .then(([s, t]) => { setSessions(s.data.sessions ?? []); setTerms(t.data.terms ?? []); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const createSession = async () => {
    if (!newSession.trim()) return;
    setSaving(true);
    try {
      await api.post(endpoints.admin.sessions, { name: newSession });
      toast.success('Session created'); setSessionModal(false); setNewSession(''); load();
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? 'Failed');
    } finally { setSaving(false); }
  };

  const deleteSession = async (id: number) => {
    if (!confirm('Delete this session?')) return;
    try { await api.delete(`${endpoints.admin.sessions}/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const setCurrentSession = async (name: string) => {
    try { await api.put(`${endpoints.admin.sessions}/${name}/current`, {}); toast.success('Current session updated'); load(); }
    catch { toast.error('Failed to update'); }
  };

  const setCurrentTerm = async (id: number, isCurrent: boolean) => {
    try { await api.put(`${endpoints.admin.terms}/${id}`, { isCurrent }); toast.success('Term updated'); load(); }
    catch { toast.error('Failed to update'); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Sessions & Terms</h1>

      {/* Sessions */}
      <div className="bg-white rounded-2xl card shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Sessions</h2>
          <button onClick={() => setSessionModal(true)} className="flex items-center gap-2 bg-purple-600 text-white px-3 py-1.5 rounded-xl text-sm font-medium hover:bg-purple-700">
            <Plus size={14} /> Add Session
          </button>
        </div>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : sessions.length === 0 ? (
          <p className="text-gray-400 text-sm">No sessions found</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  {s.isCurrent && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                  <span className="font-medium text-gray-900">{s.name}</span>
                  {s.isCurrent && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Current</span>}
                </div>
                <div className="flex items-center gap-2">
                  {!s.isCurrent && (
                    <button onClick={() => setCurrentSession(s.name)} title="Set as current" className="text-yellow-500 hover:text-yellow-700">
                      <Star size={16} />
                    </button>
                  )}
                  <button onClick={() => deleteSession(s.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Terms */}
      <div className="bg-white rounded-2xl card shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Terms</h2>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : terms.length === 0 ? (
          <p className="text-gray-400 text-sm">No terms found</p>
        ) : (
          <div className="space-y-2">
            {terms.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  {t.isCurrent && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                  <span className="font-medium text-gray-900">{t.name}</span>
                  {t.session && <span className="text-gray-400 text-xs">{t.session}</span>}
                  {t.isCurrent && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Current</span>}
                </div>
                {!t.isCurrent && (
                  <button onClick={() => setCurrentTerm(t.id, true)} title="Set as current" className="text-yellow-500 hover:text-yellow-700">
                    <Star size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {sessionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl card shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Add Session</h2>
              <button onClick={() => setSessionModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Session Name</label>
              <input value={newSession} onChange={(e) => setNewSession(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createSession()}
                placeholder="e.g. 2024/2025" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setSessionModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={createSession} disabled={saving} className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-60">
                {saving ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
