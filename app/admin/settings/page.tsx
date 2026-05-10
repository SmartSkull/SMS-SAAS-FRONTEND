'use client';
import { Save, Calendar, Trash2 } from 'lucide-react';
import { useAdminSettings } from '@/hooks/admin';
import { useSchoolData } from '@/hooks/useSchoolData';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useState } from 'react';

export default function SettingsPage() {
  const { records, form, setForm, loading, saving, save, remove } = useAdminSettings();
  const { sessions, terms } = useSchoolData();
  const [confirmTarget, setConfirmTarget] = useState<{ session: string; term: string } | null>(null);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <div className="bg-white rounded-2xl card shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Calendar size={20} className="text-purple-600" />
          <h2 className="font-semibold text-gray-900">School Days per Term</h2>
        </div>

        {/* Add form */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Session</label>
            <select value={form.session} onChange={e => setForm(p => ({ ...p, session: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 bg-white">
              <option value="">Select session</option>
              {sessions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Term</label>
            <select value={form.term} onChange={e => setForm(p => ({ ...p, term: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 bg-white">
              <option value="">Select term</option>
              {terms.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Total Days</label>
            <input type="number" min={1} value={form.total_days} onChange={e => setForm(p => ({ ...p, total_days: e.target.value }))}
              placeholder="e.g. 65"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500" />
          </div>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-60">
          <Save size={16} /> {saving ? 'Saving…' : 'Save'}
        </button>

        {/* Records table */}
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : records.length > 0 && (
          <table className="w-full text-sm mt-2">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Session</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Term</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Total Days</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.map((r) => (
                <tr key={`${r.session}-${r.term}`} className="hover:bg-gray-50">
                  <td className="p-3 text-gray-900">{r.session}</td>
                  <td className="p-3 text-gray-600">{r.term}</td>
                  <td className="p-3 text-gray-600">{r.totalDays}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => setConfirmTarget({ session: r.session, term: r.term })} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirmTarget && (
        <ConfirmModal
          message={`Delete school days for ${confirmTarget.session} – ${confirmTarget.term}?`}
          onConfirm={() => { remove(confirmTarget.session, confirmTarget.term); setConfirmTarget(null); }}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  );
}
