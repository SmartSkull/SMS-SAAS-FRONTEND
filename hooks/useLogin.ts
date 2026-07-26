'use client';
import { useToast } from '@/components/ui/Toast';
import { readSelectedSchool } from '@/hooks/useSelectedSchool';
import { api, endpoints } from '@/lib/api';
import { auth } from '@/lib/auth';
import type { ApiResponse, Role } from '@/types';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

export function useLogin() {
  const router = useRouter();
  const toast  = useToast();
  const [tab, setTab]         = useState<Role>('student');
  const [loading, setLoading] = useState(false);
  const [form, setForm]       = useState({ id: '', password: '' });
  const [loginId, setLoginId] = useState<string | null>(null);
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
    setLoginId(null);
    if ((tab !== 'student' && tab !== 'staff') || val.length < 2) { setSuggestions([]); setShowSug(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const school = readSelectedSchool();
        if (tab === 'student') {
          const r = await api.get<ApiResponse<any[]>>('/public/students/search', { q: val, school: school?.slug });
          setSuggestions(r.data.slice(0, 8));
          setShowSug(r.data.length > 0);
        } else {
          const r = await api.get<ApiResponse<any[]>>('/public/staff/search', { q: val, school: school?.slug });
          setSuggestions(r.data.slice(0, 8));
          setShowSug(r.data.length > 0);
        }
      } catch { setSuggestions([]); }
    }, 250);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = tab === 'student'
        ? { name: loginId || form.id, password: form.password, school_slug: readSelectedSchool()?.slug }
        : tab === 'staff'
        ? { staff_id: loginId || form.id, password: form.password, school_slug: readSelectedSchool()?.slug }
        : { admin_id: form.id, password: form.password, school_slug: readSelectedSchool()?.slug };

      const ep = tab === 'student' ? endpoints.auth.studentLogin
        : tab === 'staff' ? endpoints.auth.staffLogin
        : endpoints.auth.adminLogin;

      const res = await api.post<ApiResponse<{ token: string; refresh_token: string; user: any }>>(ep, body);
      if (res.success) {
        auth.setSession(res.data.token, res.data.refresh_token, res.data.user, tab);

        // Show a browser notification immediately after login (permission may already be granted).
        // iOS Safari and Android Chrome do not allow `new Notification()` from a page context —
        // they require ServiceWorkerRegistration.showNotification() instead.
        if ('Notification' in window && Notification.permission === 'granted') {
          const firstName = res.data.user?.firstname || res.data.user?.firstName || 'User';
          const notifOptions: NotificationOptions = {
            body: `Welcome back, ${firstName}! You've signed in to Smart Campus.`,
            icon: '/favicon.png',
          };
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready
              .then((reg) => reg.showNotification('Login Successful', notifOptions))
              .catch(() => {
                // Fallback for desktop browsers that still support direct construction
                try { new Notification('Login Successful', notifOptions); } catch { /* ignore */ }
              });
          } else {
            // Desktop-only fallback (no service worker available)
            try { new Notification('Login Successful', notifOptions); } catch { /* ignore */ }
          }
        }

        const destination = res.data.user?.isDriver ? '/staff/transport' : `/${tab}/dashboard`;
        router.push(destination);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return { tab, switchTab, loading, form, setForm, loginId, setLoginId, suggestions, showSug, setShowSug, handleIdChange, handleSubmit };
}
