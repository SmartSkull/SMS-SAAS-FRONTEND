'use client';
import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Building2, MessageSquare, Shield, Upload } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import type { ApiResponse, SchoolProfile } from '@/types';

const EMPTY = {
  name: '',
  slug: '',
  email: '',
  telephone: '',
  address: '',
  city: '',
  state: '',
  primaryColor: '#1a73e8',
  secondaryColor: '#ffffff',
  accentColor: '#84cc16',
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

export default function RegisterSchoolPage() {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [logo, setLogo] = useState<File | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const logoName = useMemo(() => logo?.name ?? 'Choose logo image', [logo]);

  const setValue = (key: keyof typeof EMPTY, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'name' && !prev.slug ? { slug: slugify(value) } : {}),
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!logo) {
      toast.error('School logo is required');
      return;
    }
    if (!acceptedTerms) {
      toast.error('Please accept the Terms & Conditions to continue');
      return;
    }

    const data = new FormData();
    Object.entries({ ...form, slug: slugify(form.slug || form.name) }).forEach(([key, value]) => {
      if (value) data.append(key, value);
    });
    data.append('logo', logo);

    setSubmitting(true);
    try {
      await api.upload<ApiResponse<SchoolProfile>>(endpoints.public.schoolRegister, data);
      toast.success('School registration submitted for approval');
      router.push('/school');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to register school');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left side - Registration form (50% width on desktop) */}
      <div className="w-full lg:w-1/2 min-h-screen bg-white flex flex-col p-4 lg:p-8 lg:overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto py-6 lg:py-10">
          <Link href="/school" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800">
            <ArrowLeft size={16} /> Back to school search
          </Link>

          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">School Portal</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">Register your school</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Submit your school profile for approval. Login access will be enabled after approval.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-sm font-semibold text-slate-700">School name</span>
                <input required value={form.name} onChange={(event) => setValue('name', event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Slug</span>
                <input required value={form.slug} onChange={(event) => setValue('slug', slugify(event.target.value))}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Email</span>
                <input type="email" value={form.email} onChange={(event) => setValue('email', event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Phone</span>
                <input value={form.telephone} onChange={(event) => setValue('telephone', event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">City</span>
                <input value={form.city} onChange={(event) => setValue('city', event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">State</span>
                <input value={form.state} onChange={(event) => setValue('state', event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-sm font-semibold text-slate-700">Address</span>
                <input value={form.address} onChange={(event) => setValue('address', event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              </label>

              <div className="sm:col-span-2 grid gap-4 sm:grid-cols-3">
                {(['primaryColor', 'secondaryColor', 'accentColor'] as const).map((key) => (
                  <label key={key} className="block">
                    <span className="text-sm font-semibold capitalize text-slate-700">{key.replace('Color', '')} color</span>
                    <input type="color" value={form[key]} onChange={(event) => setValue(key, event.target.value)}
                      className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white p-1" />
                  </label>
                ))}
              </div>

              <label className="sm:col-span-2 flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 hover:border-blue-300 hover:bg-blue-50">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-blue-700">
                  {logo ? <Building2 size={22} /> : <Upload size={22} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800">{logoName}</p>
                  <p className="text-xs text-slate-500">Required. PNG, JPG, or WEBP.</p>
                </div>
                <input required type="file" accept="image/*" onChange={(event) => setLogo(event.target.files?.[0] ?? null)} className="hidden" />
              </label>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <input
                type="checkbox"
                required
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
              />
              <span>
                I have read and agree to the{' '}
                <Link href="/terms" target="_blank" className="font-semibold text-blue-700 underline hover:text-blue-800">
                  Terms & Conditions
                </Link>{' '}
                governing the use of the Smart Campus platform.
              </span>
            </label>

            <button type="submit" disabled={submitting} className="mt-6 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50 transition-all shadow-lg shadow-blue-200">
              {submitting ? 'Submitting...' : 'Submit for approval'}
            </button>
          </form>
        </div>
      </div>

      {/* Right side - Background image (50% width on desktop, hidden on mobile) */}
      <div className="hidden lg:block lg:w-1/2 min-h-screen relative">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/images/studentgroup1.jpg')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="text-white max-w-md">
            <h2 className="text-3xl font-bold mb-4">Welcome to SmartCampus</h2>
            <p className="text-lg mb-8 text-gray-200">Join thousands of schools using our platform to manage academics, finances, and student life efficiently.</p>
            <div className="space-y-5">
              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mr-4 flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Comprehensive Academic Management</h3>
                  <p className="text-gray-300 text-sm">Manage grades, attendance, timetables, and curriculum all in one place.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mr-4 flex-shrink-0">
                  <Shield className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Secure Financial Transactions</h3>
                  <p className="text-gray-300 text-sm">Process payments, track expenses, and manage school finances securely.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mr-4 flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Real-time Communication Tools</h3>
                  <p className="text-gray-300 text-sm">Connect with parents, staff, and students through instant messaging and notifications.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
