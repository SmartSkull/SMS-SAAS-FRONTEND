'use client';
import { Save, Calendar } from 'lucide-react';
import { useAdminSettings } from '@/hooks/admin';

export default function SettingsPage() {
  const { days, setDays, loading, saving, save } = useAdminSettings();
  const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
  const toggle = (day: string) => setDays((p) => ({ ...p, [day]: !p[day] }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <div className="bg-white rounded-2xl card shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <Calendar size={20} className="text-purple-600" />
          <h2 className="font-semibold text-gray-900">School Days</h2>
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="space-y-3">
            {DAYS.map((day) => (
              <label key={day} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 cursor-pointer">
                <span className="font-medium text-gray-900 capitalize">{day}</span>
                <div className={`relative w-12 h-6 rounded-full transition-colors ${days[day] ? 'bg-purple-600' : 'bg-gray-200'}`}
                  onClick={() => toggle(day)}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${days[day] ? 'translate-x-7' : 'translate-x-1'}`} />
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-100">
          <button onClick={save} disabled={saving || loading}
            className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-60">
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
