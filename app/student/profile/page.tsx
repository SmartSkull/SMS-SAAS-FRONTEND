'use client';
import { useRef } from 'react';
import { getImageUrl } from '@/lib/api';
import { useProfile } from '@/hooks/student';
import { User, Save, Mail, Phone, Hash, GraduationCap, Camera } from 'lucide-react';

export default function StudentProfile() {
  const { profile, setProfile, loading, saving, uploading, save, uploadImage } = useProfile();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSave = (e: React.FormEvent) => { e.preventDefault(); save(); };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadImage(file);
    e.target.value = '';
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
    { label: 'First Name',    key: 'firstName',    type: 'text',  group: 'user' },
    { label: 'Last Name',     key: 'lastName',     type: 'text',  group: 'user' },
    { label: 'Email',         key: 'email',        type: 'email', group: 'user' },
    { label: 'Phone',         key: 'telephone',    type: 'tel',   group: 'user' },
    { label: 'Date of Birth', key: 'dateOfBirth',  type: 'date',  group: 'student' },
    { label: 'State of Origin', key: 'stateOfOrigin', type: 'text', group: 'student' },
    { label: 'Home Address',  key: 'homeAddress',  type: 'text',  group: 'student' },
    { label: "Father's Name", key: 'fatherName',   type: 'text',  group: 'student' },
    { label: "Mother's Name", key: 'motherName',   type: 'text',  group: 'student' },
    { label: 'Religion',      key: 'religion',     type: 'select', group: 'student', options: ['Christianity', 'Islam', 'Traditional', 'Other'] },
    { label: 'Blood Group',   key: 'bloodGroup',   type: 'select', group: 'student', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
  ];

  const getValue = (key: string, group: string) => {
    if (group === 'student') return profile?.student?.[key] ?? '';
    return profile?.[key] ?? '';
  };

  const setValue = (key: string, group: string, value: string) => {
    if (group === 'student') {
      setProfile((p: any) => ({ ...p, student: { ...p?.student, [key]: value } }));
    } else {
      setProfile((p: any) => ({ ...p, [key]: value }));
    }
  };

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
              {fields.map(({ label, key, type, group, options }: any) => (
                <div key={key} className={key === 'homeAddress' ? 'sm:col-span-2' : ''}>
                  <label className="text-sm font-medium text-gray-700 block mb-1">{label}</label>
                  {options ? (
                    <select
                      value={getValue(key, group)}
                      onChange={(e) => setValue(key, group, e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-white"
                    >
                      <option value="">Select {label}</option>
                      {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type={type}
                      value={getValue(key, group)}
                      onChange={(e) => setValue(key, group, e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  )}
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
