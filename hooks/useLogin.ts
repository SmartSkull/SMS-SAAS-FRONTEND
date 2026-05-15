'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api, endpoints } from '@/lib/api';
import { auth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { readSelectedSchool } from '@/hooks/useSelectedSchool';
import type { Role, ApiResponse } from '@/types';

export function useLogin() {
  const router = useRouter();
  const toast  = useToast();
  const [tab, setTab]         = useState<Role>('student');
  const [loading, setLoading] = useState(false);
  const [form, setForm]       = useState({ id: '', password: '' });
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSug, setShowSug]         = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const switchTab = (t: Role) => {
    setTab(t);
    setForm({ id: '', password: '' });
    setSuggestions([]);
    setShowSug(false);
  };

  const handleIdChange = (val: string) => {
    setForm((p) => ({ ...p, id: val }));
    if (tab !== 'student' || val.length < 2) { setSuggestions([]); setShowSug(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const school = readSelectedSchool();
        const r = await api.get<ApiResponse<any[]>>('/public/students/search', { q: val, school: school?.slug });
        setSuggestions(r.data.slice(0, 8));
        setShowSug(r.data.length > 0);
      } catch { setSuggestions([]); }
    }, 250);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = tab === 'student'
        ? { name: form.id, password: form.password, school_slug: readSelectedSchool()?.slug }
        : tab === 'staff'
        ? { staff_id: form.id, password: form.password, school_slug: readSelectedSchool()?.slug }
        : { admin_id: form.id, password: form.password, school_slug: readSelectedSchool()?.slug };

      const ep = tab === 'student' ? endpoints.auth.studentLogin
        : tab === 'staff' ? endpoints.auth.staffLogin
        : endpoints.auth.adminLogin;

      const res = await api.post<ApiResponse<{ token: string; refresh_token: string; user: any }>>(ep, body);
      if (res.success) {
        auth.setSession(res.data.token, res.data.refresh_token, res.data.user, tab);
        router.push(`/${tab}/dashboard`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return { tab, switchTab, loading, form, setForm, suggestions, showSug, setShowSug, handleIdChange, handleSubmit };
}
