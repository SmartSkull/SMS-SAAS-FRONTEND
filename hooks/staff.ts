'use client';
import { useEffect, useState, useCallback } from 'react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import type { ApiResponse, Assignment, LibraryItem, Result, Staff, Student, Conversation, Message, Post } from '@/types';

/* ── Dashboard ─────────────────────────────────────────────────────────── */
interface StaffDashboardData {
  user?: { firstname: string; lastname: string; image?: string };
  total_students?: number; total_results?: number; total_assignments?: number;
  total_library?: number; pending_results?: number; student_count?: number;
  current_session?: string; current_term?: string;
  analytics?: { assignments?: { total?: number }; library?: { total?: number } };
  recent_results?: { student_name: string; course: string; total: number; grade: string }[];
}

export function useStaffDashboard() {
  const [data, setData] = useState<StaffDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  useEffect(() => {
    api.get<ApiResponse<StaffDashboardData>>(endpoints.staff.dashboard)
      .then((r) => setData(r.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);
  return { data, loading };
}

/* ── Results ───────────────────────────────────────────────────────────── */
interface ResultsData { results: Result[]; total: number; }

export function useStaffResults(limit = 20) {
  const [results, setResults] = useState<Result[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = useCallback((page = 1) => {
    setLoading(true);
    api.get<ApiResponse<ResultsData>>(endpoints.staff.results, { page, limit })
      .then((r) => { setResults(r.data.results ?? []); setTotal(r.data.total ?? 0); })
      .catch(() => toast.error('Failed to load results'))
      .finally(() => setLoading(false));
  }, [limit]);

  useEffect(() => { load(1); }, [load]);

  const submit = async (form: any) => {
    await api.post(endpoints.staff.results, { ...form, ca: Number(form.ca), exam: Number(form.exam) });
  };

  const remove = async (id: string) => {
    await api.delete(endpoints.staff.results, { id });
  };

  const saveComment = async (resultId: string, comment: string) => {
    await api.post(endpoints.staff.comment, { result_id: resultId, comment });
  };

  const saveAttendance = async (data: { student_id: string; days_present: number; total_days: number }) => {
    await api.post(endpoints.staff.attendance, data);
  };

  return { results, total, loading, load, submit, remove, saveComment, saveAttendance };
}

/* ── Assignments ───────────────────────────────────────────────────────── */
export function useStaffAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    api.get<ApiResponse<{ assignments: Assignment[] }>>(endpoints.staff.assignments)
      .then((r) => setAssignments(r.data.assignments ?? []))
      .catch(() => toast.error('Failed to load assignments'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (form: any, file: File | null, editingId?: number) => {
    if (file) {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v as string));
      fd.append('file', file);
      if (editingId) await api.upload(`${endpoints.staff.assignments}/${editingId}`, fd, 'PUT');
      else await api.upload(endpoints.staff.assignments, fd);
    } else if (editingId) {
      await api.put(`${endpoints.staff.assignments}/${editingId}`, form);
    } else {
      await api.post(endpoints.staff.assignments, form);
    }
  };

  const remove = async (id: number) => {
    await api.delete(`${endpoints.staff.assignments}/${id}`);
  };

  return { assignments, loading, load, save, remove };
}

/* ── Library ───────────────────────────────────────────────────────────── */
export function useStaffLibrary() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    api.get<ApiResponse<{ library: LibraryItem[] }>>(endpoints.staff.library)
      .then((r) => setItems(r.data.library ?? []))
      .catch(() => toast.error('Failed to load library'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const upload = async (form: any, file: File) => {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v as string));
    fd.append('file', file);
    await api.upload(endpoints.staff.library, fd);
  };

  const remove = async (id: number) => {
    await api.delete(`${endpoints.staff.library}/${id}`);
  };

  return { items, loading, load, upload, remove };
}

/* ── Students ──────────────────────────────────────────────────────────── */
interface StudentsData { students: Student[]; total: number; classes?: string[]; }

export function useStaffStudents(limit = 20) {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = useCallback((page = 1, classFilter = '', search = '') => {
    setLoading(true);
    api.get<ApiResponse<StudentsData>>(endpoints.staff.students, {
      page, limit, class: classFilter || undefined, search: search || undefined,
    })
      .then((r) => {
        setStudents(r.data.students ?? []);
        setTotal(r.data.total ?? 0);
        if (r.data.classes) setClasses(r.data.classes);
      })
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false));
  }, [limit]);

  useEffect(() => { load(); }, [load]);

  return { students, classes, total, loading, load };
}

/* ── Profile ───────────────────────────────────────────────────────────── */
export function useStaffProfile() {
  const [profile, setProfile] = useState<Staff | null>(null);
  const [form, setForm] = useState({ firstname: '', lastname: '', email: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.get<ApiResponse<Staff>>(endpoints.staff.profile)
      .then((r) => {
        setProfile(r.data);
        setForm({ firstname: r.data.firstname ?? '', lastname: r.data.lastname ?? '', email: r.data.email ?? '', phone: r.data.phone ?? '' });
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put<ApiResponse<Staff>>(endpoints.staff.profile, form);
      toast.success('Profile updated');
    } catch { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  };

  return { profile, form, setForm, loading, saving, save };
}

/* ── Messages ──────────────────────────────────────────────────────────── */
export function useStaffMessages() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    api.get<ApiResponse<{ conversations: Conversation[] }>>(endpoints.staff.messages)
      .then((r) => setConversations(r.data.conversations ?? []))
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoading(false));
  }, []);

  const openConversation = async (conv: Conversation) => {
    setSelected(conv);
    try {
      const r = await api.get<ApiResponse<{ messages: Message[] }>>(endpoints.staff.messages, { user_id: conv.user_id });
      setMessages(r.data.messages ?? []);
    } catch { toast.error('Failed to load conversation'); }
  };

  const send = async (text: string, file: File | null) => {
    if (!selected || (!text.trim() && !file)) return;
    if (file) {
      const fd = new FormData();
      fd.append('receiver_id', selected.user_id);
      if (text.trim()) fd.append('message', text.trim());
      fd.append('file', file);
      await api.upload(endpoints.staff.messages, fd);
    } else {
      await api.post(endpoints.staff.messages, { receiver_id: selected.user_id, message: text.trim() });
    }
    await openConversation(selected);
  };

  return { conversations, messages, selected, loading, openConversation, send };
}

/* ── Posts ─────────────────────────────────────────────────────────────── */
export function useStaffPosts(limit = 10) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const toast = useToast();

  const load = useCallback((p = 1, append = false) => {
    if (p === 1) setLoading(true);
    api.get<any>(endpoints.staff.posts, { page: p, limit })
      .then((r) => {
        const newPosts = r.data ?? [];
        setPosts((prev) => append ? [...prev, ...newPosts] : newPosts);
        setHasMore(newPosts.length === limit);
      })
      .catch(() => toast.error('Failed to load posts'))
      .finally(() => setLoading(false));
  }, [limit]);

  useEffect(() => { load(1); }, [load]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    load(next, true);
  };

  return { posts, setPosts, loading, hasMore, loadMore };
}
