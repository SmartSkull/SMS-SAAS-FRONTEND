'use client';
import { useRef, useState } from 'react';
import { User, Save, Camera } from 'lucide-react';
import { api, endpoints, getImageUrl } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

export default function StaffProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', telephone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useState(() => {
    api.get<any>(endpoints.staff.profile)
      .then(r => {
        setProfile(r.data);
        setForm({
          firstName: r.data.firstName ?? r.data.firstname ?? '',
          lastName: r.data.lastName ?? r.data.lastname ?? '',
          email: r.data.email ?? '',
          telephone: r.data.telephone ?? r.data.phone ?? '',
        });
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  });

  const save = async () => {
    setSaving(true);
    try { await api.put(endpoints.staff.profile, form); toast.success('Profile updated'); }
    catch { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.upload<any>(`${endpoints.staff.profile}/image`, fd);
      setProfile((p: any) => ({ ...p, image: res.data.image }));
      toast.success('Photo updated');
    } catch { toast.error('Failed to upload photo'); }
    finally { setUploading(false); }
  };

  if (loading) return <div className="h-64 bg-gray-200 rounded-2xl animate-pulse" />;

  return (
    <div className="max-w-2xl space-y-6 mx-auto">
      <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>

      <div className="bg-white rounded-2xl card shadow-sm p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
              {getImageUrl(profile?.image)
                ? <img src={getImageUrl(profile?.image)!} alt="avatar" className="w-full h-full object-cover" />
                : <User size={28} className="text-blue-600" />}
            </div>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="absolute bottom-0 right-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shadow disabled:opacity-60">
              {uploading ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera size={11} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-800">{form.firstName} {form.lastName}</p>
            <p className="text-sm text-gray-500">Staff</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {([
            { key: 'firstName', label: 'First Name' },
            { key: 'lastName', label: 'Last Name' },
            { key: 'email', label: 'Email', type: 'email' },
            { key: 'telephone', label: 'Phone' },
          ] as { key: string; label: string; type?: string }[]).map(({ key, label, type }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input type={type ?? 'text'} value={(form as any)[key]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}
        </div>

        <button onClick={save} disabled={saving}
          className="mt-6 flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          <Save size={16} /> {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
