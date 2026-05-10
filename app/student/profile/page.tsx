'use client';
import { useEffect, useRef, useState } from 'react';
import { api, endpoints, getImageUrl } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { User, Save, Mail, Phone, Hash, GraduationCap, Camera } from 'lucide-react';
import type { ApiResponse } from '@/types';

export default function StudentProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    api.get<ApiResponse<any>>(endpoints.student.profile)
      .then((r) => setProfile(r.data))
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(endpoints.student.profile, profile);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await api.upload<ApiResponse<{ image: string }>>(`${endpoints.student.profile}/image`, form);
      setProfile((p: any) => ({ ...p, image: res.data.image }));
      toast.success('Photo updated');
    } catch {
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="shimmer h-7 w-40 rounded-xl" />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="shimmer h-64 rounded-2xl" />
        <div className="lg:col-span-2 shimmer h-64 rounded-2xl" />
      </div>
    </div>
  );

  const fields = [
    { label: 'First Name', key: 'firstName',  type: 'text' },
    { label: 'Last Name',  key: 'lastName',   type: 'text' },
    { label: 'Email',      key: 'email',      type: 'email' },
    { label: 'Phone',      key: 'telephone',  type: 'tel' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      <div className="grid lg:grid-cols-3 gap-6 items-start">

        {/* Left — avatar card */}
        <div className="bg-white rounded-2xl card shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center gap-3">

          {/* Avatar with upload button */}
          <div className="relative">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
              {getImageUrl(profile?.image)
                ? <img src={getImageUrl(profile?.image)!} alt="avatar" className="w-full h-full object-cover" />
                : <User size={40} className="text-blue-600" />}
            </div>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="absolute bottom-0 right-0 w-8 h-8 btn-brand text-white rounded-full flex items-center justify-center shadow-lg transition-colors disabled:opacity-60">
              {uploading
                ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Camera size={14} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </div>

          <div>
            <p className="font-bold text-gray-900 text-lg">{profile?.firstName} {profile?.lastName}</p>
            <p className="text-sm text-blue-600 font-medium mt-0.5">{profile?.role ?? 'Student'}</p>
          </div>
          <div className="w-full border-t border-gray-100 pt-3 space-y-2 text-sm text-gray-500">
            <div className="flex items-center gap-2"><Hash size={14} className="text-gray-400" />{profile?.uniqueId}</div>
            <div className="flex items-center gap-2"><Mail size={14} className="text-gray-400" />{profile?.email}</div>
            <div className="flex items-center gap-2"><Phone size={14} className="text-gray-400" />{profile?.telephone || '—'}</div>
            {profile?.student?.classRoom?.name && (
              <div className="flex items-center gap-2"><GraduationCap size={14} className="text-gray-400" />{profile.student.classRoom.name}</div>
            )}
          </div>
        </div>

        {/* Right — edit form */}
        <div className="lg:col-span-2 bg-white rounded-2xl card shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-5">Edit Information</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {fields.map(({ label, key, type }) => (
                <div key={key}>
                  <label className="text-sm font-medium text-gray-700 block mb-1">{label}</label>
                  <input
                    type={type}
                    value={profile?.[key] ?? ''}
                    onChange={(e) => setProfile((p: any) => ({ ...p, [key]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              ))}
            </div>
            <div className="pt-2">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 btn-brand text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60 w-full sm:w-auto justify-center">
                <Save size={16} /> {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
