'use client';
import { useEffect, useState } from 'react';
import { User, Save } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import type { ApiResponse, Staff } from '@/types';

export default function StaffProfile() {
  const [profile, setProfile] = useState<Staff | null>(null);
  const [form, setForm] = useState({ firstname: '', lastname: '', email: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.get<ApiResponse<Staff>>(endpoints.staff.profile)
      .then((r) => {
        setProfile(r.data);
        setForm({
          firstname: r.data.firstname ?? '',
          lastname: r.data.lastname ?? '',
          email: r.data.email ?? '',
          phone: r.data.phone ?? '',
        });
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put<ApiResponse<Staff>>(endpoints.staff.profile, form);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>

      <div className="bg-white rounded-2xl card shadow-sm p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
            {profile?.image
              ? <img src={profile.image} alt="avatar" className="w-full h-full object-cover" />
              : <User size={28} className="text-blue-600" />}
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-800">{profile?.firstname} {profile?.lastname}</p>
            <p className="text-sm text-gray-500 capitalize">Staff · {(profile as Staff)?.staff_id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(['firstname', 'lastname', 'email', 'phone'] as const).map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{field}</label>
              <input
                type={field === 'email' ? 'email' : 'text'}
                value={form[field]}
                onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 flex items-center gap-2 btn-brand text-white px-5 py-2.5 rounded-xl text-sm font-medium  disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
