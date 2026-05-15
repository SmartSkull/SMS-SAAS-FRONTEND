'use client';
import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { saveSelectedSchool } from '@/hooks/useSelectedSchool';
import type { ApiResponse, SchoolProfile } from '@/types';

const FIELDS: { key: keyof SchoolProfile; label: string; type?: string; span?: boolean }[] = [
  { key: 'name', label: 'School Name' },
  { key: 'slug', label: 'School Slug' },
  { key: 'slogan', label: 'Slogan' },
  { key: 'motto', label: 'Motto' },
  { key: 'logo', label: 'Logo URL or Upload Filename' },
  { key: 'website', label: 'Website' },
  { key: 'email', label: 'Main Email', type: 'email' },
  { key: 'contactEmail', label: 'Contact Email', type: 'email' },
  { key: 'contactName', label: 'Contact Person' },
  { key: 'telephone', label: 'Phone' },
  { key: 'alternatePhone', label: 'Alternate Phone' },
  { key: 'address', label: 'Address', span: true },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'country', label: 'Country' },
  { key: 'primaryColor', label: 'Primary Color', type: 'color' },
  { key: 'secondaryColor', label: 'Secondary Color', type: 'color' },
  { key: 'accentColor', label: 'Accent Color', type: 'color' },
];

export default function AdminSchoolPage() {
  const toast = useToast();
  const [form, setForm] = useState<Partial<SchoolProfile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<ApiResponse<SchoolProfile>>(endpoints.admin.school)
      .then((response) => {
        setForm(response.data);
        saveSelectedSchool(response.data);
      })
      .catch(() => toast.error('Failed to load school information'))
      .finally(() => setLoading(false));
  }, [toast]);

  const setValue = (key: keyof SchoolProfile, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await api.put<ApiResponse<SchoolProfile>>(endpoints.admin.school, form);
      setForm(response.data);
      saveSelectedSchool(response.data);
      toast.success('School information saved');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save school information');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading school information...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">School Information</h1>
        <p className="mt-1 text-sm text-gray-500">This data powers the public pages, school search, login branding, and portal identity.</p>
      </div>

      <form onSubmit={save} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          {FIELDS.map(({ key, label, type = 'text', span }) => (
            <label key={key} className={span ? 'md:col-span-2' : ''}>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</span>
              <input
                type={type}
                value={(form[key] as string | null | undefined) ?? ''}
                onChange={(event) => setValue(key, event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>
          ))}

          <label className="md:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Description</span>
            <textarea
              value={form.description ?? ''}
              onChange={(event) => setValue('description', event.target.value)}
              rows={5}
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50">
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Information'}
          </button>
        </div>
      </form>
    </div>
  );
}
