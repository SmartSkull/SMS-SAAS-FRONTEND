'use client';
import { useEffect, useState, useCallback } from 'react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import type { ApiResponse, Assignment, LibraryItem, CbtTest, Conversation, Message, Post } from '@/types';

/* ── Dashboard ─────────────────────────────────────────────────────────── */
interface DashboardData {
  user: { firstname: string; lastname: string; class: string };
  current_session: string;
  current_term: string;
  unread_notifications: number;
  recent_assignments: { id: string; title: string; dueAt?: string }[];
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  useEffect(() => {
    api.get<ApiResponse<DashboardData>>(endpoints.student.dashboard)
      .then((r) => setData(r.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);
  return { data, loading };
}

/* ── Results ───────────────────────────────────────────────────────────── */
export function useResults() {
  const [data, setData] = useState<any>(null);
  const [sessions, setSessions] = useState<{ name: string }[]>([]);
  const [session, setSession] = useState('');
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    Promise.all([
      api.get<ApiResponse<any[]>>(endpoints.public.sessions),
      api.get<ApiResponse<{ session: string; term: string }>>(endpoints.public.currentPeriod),
    ]).then(([s, p]) => {
      setSessions(s.data);
      setSession(p.data.session);
      setTerm(p.data.term);
    }).catch(() => toast.error('Failed to load filters'));
  }, []);

  useEffect(() => {
    if (!session || !term) return;
    setLoading(true);
    setData(null);
    api.get<ApiResponse<any>>(endpoints.student.results, { session, term })
      .then((r) => setData(r.data))
      .catch((e) => toast.error(e?.message || 'No results found'))
      .finally(() => setLoading(false));
  }, [session, term]);

  return { data, sessions, session, setSession, term, setTerm, loading };
}

/* ── Assignments ───────────────────────────────────────────────────────── */
export function useAssignments() {
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  useEffect(() => {
    api.get<ApiResponse<Assignment[]>>(endpoints.student.assignments)
      .then((r) => setItems(r.data))
      .catch(() => toast.error('Failed to load assignments'))
      .finally(() => setLoading(false));
  }, []);
  return { items, loading };
}

/* ── Library ───────────────────────────────────────────────────────────── */
export function useLibrary() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  useEffect(() => {
    api.get<ApiResponse<LibraryItem[]>>(endpoints.student.library)
      .then((r) => setItems(r.data))
      .catch(() => toast.error('Failed to load library'))
      .finally(() => setLoading(false));
  }, []);
  return { items, loading };
}

/* ── Posts ─────────────────────────────────────────────────────────────── */
export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  useEffect(() => {
    api.get<ApiResponse<Post[]>>(endpoints.student.posts)
      .then((r) => setPosts(r.data))
      .catch(() => toast.error('Failed to load posts'))
      .finally(() => setLoading(false));
  }, []);

  const like = async (id: number) => {
    try {
      await api.post(`/student/posts/${id}/like`);
      setPosts((p) => p.map((post) =>
        String(post.id) === String(id)
          ? { ...post, likes: (post.likes ?? 0) + (post.liked ? -1 : 1), liked: !post.liked }
          : post));
    } catch { toast.error('Failed to like post'); }
  };

  const comment = async (id: number, text: string) => {
    try {
      await api.post(`/student/posts/${id}/comment`, { comment: text });
      setPosts((p) => p.map((post) => String(post.id) === String(id) ? { ...post, comments: (post.comments ?? 0) + 1 } : post));
    } catch { toast.error('Failed to post comment'); }
  };

  const decrementComments = (id: number) => {
    setPosts((p) => p.map((post) => String(post.id) === String(id) ? { ...post, comments: Math.max(0, (post.comments ?? 1) - 1) } : post));
  };

  const incrementComments = (id: number) => {
    setPosts((p) => p.map((post) => String(post.id) === String(id) ? { ...post, comments: (post.comments ?? 0) + 1 } : post));
  };

  return { posts, loading, like, comment, decrementComments, incrementComments };
}

/* ── Messages ──────────────────────────────────────────────────────────── */
export function useMessages() {
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [partnerLastLogin, setPartnerLastLogin] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    api.get<ApiResponse<Conversation[]>>(endpoints.student.messages)
      .then((r) => setConvos(r.data))
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoading(false));
  }, []);

  const openConvo = async (userId: string) => {
    setActive(userId);
    try {
      const r = await api.get<ApiResponse<any>>(`${endpoints.student.messages}/thread`, { uid: userId });
      setMessages(r.data?.messages ?? r.data);
      setPartnerLastLogin(r.data?.partner_last_login_at ?? null);
    } catch { toast.error('Failed to load conversation'); }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || !active) return;
    try {
      await api.post(endpoints.student.messages, { receiver_id: active, message: text });
      openConvo(active);
    } catch { toast.error('Failed to send message'); }
  };

  return { convos, messages, active, loading, openConvo, sendMessage, clearActive: () => setActive(null), partnerLastLogin };
}

/* ── Timetable ─────────────────────────────────────────────────────────── */
export function useTimetable(tab: 'class' | 'exam') {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  useEffect(() => {
    const ep = tab === 'class' ? endpoints.student.classTimetable : endpoints.student.examTimetable;
    setLoading(true);
    api.get<ApiResponse<any>>(ep)
      .then((r) => setData(r.data))
      .catch(() => toast.error('Failed to load timetable'))
      .finally(() => setLoading(false));
  }, [tab]);
  return { data, loading };
}

/* ── Profile ───────────────────────────────────────────────────────────── */
export function useProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.get<ApiResponse<any>>(endpoints.student.profile)
      .then((r) => setProfile(r.data))
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(endpoints.student.profile, profile);
      toast.success('Profile updated');
    } catch { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await api.upload<ApiResponse<{ image: string }>>(`${endpoints.student.profile}/image`, form);
      setProfile((p: any) => ({ ...p, image: res.data.image }));
      toast.success('Photo updated');
    } catch { toast.error('Failed to upload photo'); }
    finally { setUploading(false); }
  };

  return { profile, setProfile, loading, saving, uploading, save, uploadImage };
}

/* ── CBT Tests ─────────────────────────────────────────────────────────── */
export function useCbtTests() {
  const [tests, setTests] = useState<CbtTest[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  useEffect(() => {
    api.get<ApiResponse<CbtTest[]>>(endpoints.student.cbtTests)
      .then((r) => setTests(r.data))
      .catch(() => toast.error('Failed to load tests'))
      .finally(() => setLoading(false));
  }, []);
  return { tests, loading };
}
