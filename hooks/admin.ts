'use client';
import { useEffect, useState, useCallback } from 'react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import type { ApiResponse } from '@/types';

/* ── Dashboard ─────────────────────────────────────────────────────────── */
interface AdminDashboardData {
  students: { total: number; verified: number; pending: number };
  staff: { total: number; verified: number };
  studentsByClass: { class: string; count: number }[];
  recentStudents: { firstname: string; lastname: string; date: string }[];
  recentPayments: unknown[];
  current_session: string;
  current_term: string;
}

export function useAdminDashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  useEffect(() => {
    api.get<ApiResponse<AdminDashboardData>>(endpoints.admin.dashboard)
      .then((r) => setData(r.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);
  return { data, loading };
}

/* ── Students ──────────────────────────────────────────────────────────── */
interface AdminStudent {
  student_id: string; firstname: string; lastname: string;
  email: string; class: string; image: string; admin_verify: string;
}
interface Meta { total: number; page: number; per_page: number; last_page: number; }

export function useAdminStudents() {
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, per_page: 20, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = useCallback((page = 1, search = '') => {
    setLoading(true);
    api.get<{ success: boolean; data: AdminStudent[]; meta: Meta }>(endpoints.admin.students, { page, search: search || undefined })
      .then((r) => { setStudents(r.data ?? []); setMeta(r.meta); })
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (form: any, studentId?: string) => {
    if (studentId) await api.put(endpoints.admin.student(studentId), form);
    else await api.post(endpoints.admin.students, form);
  };

  const remove = async (id: string) => { await api.delete(endpoints.admin.student(id)); };
  const verify = async (id: string) => { await api.post(endpoints.admin.studentsVerify, { student_id: id }); };
  const bulkVerify = async (ids: string[]) => { await api.post(endpoints.admin.studentsBulkVerify, { student_ids: ids }); };

  return { students, meta, loading, load, save, remove, verify, bulkVerify };
}

/* ── Staff ─────────────────────────────────────────────────────────────── */
interface AdminStaff {
  staff_id: string; unique_id: string; firstname: string; lastname: string;
  email: string; telephone: string; image: string; admin_verify: string; role: string;
}
interface StaffMeta { total: number; page: number; per_page: number; }

export function useAdminStaff() {
  const [staff, setStaff] = useState<AdminStaff[]>([]);
  const [meta, setMeta] = useState<StaffMeta>({ total: 0, page: 1, per_page: 20 });
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = useCallback((page = 1, search = '') => {
    setLoading(true);
    api.get<{ success: boolean; data: AdminStaff[]; meta: StaffMeta }>(endpoints.admin.staff, { page, search: search || undefined })
      .then((r) => { setStaff(r.data ?? []); setMeta(r.meta); })
      .catch(() => toast.error('Failed to load staff'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (form: any, staffId?: string) => {
    if (staffId) await api.put(endpoints.admin.staffMember(staffId), form);
    else await api.post(endpoints.admin.staff, form);
  };

  const remove = async (id: string) => { await api.delete(endpoints.admin.staffMember(id)); };
  const verify = async (id: string) => { await api.post(endpoints.admin.staffVerify(id)); };

  return { staff, meta, loading, load, save, remove, verify };
}

/* ── Results ───────────────────────────────────────────────────────────── */
interface AdminResultsInit {
  students: any[]; classes: { id: string; name: string }[];
  sessions: { id: string; name: string; isCurrent: boolean }[];
  current_session: string; current_term: string;
}

export function useAdminResults() {
  const [init, setInit] = useState<AdminResultsInit | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.get<{ success: boolean; data: AdminResultsInit }>(endpoints.admin.results)
      .then((r) => { setInit(r.data); setStudents(r.data.students ?? []); })
      .catch(() => toast.error('Failed to load results'))
      .finally(() => setLoading(false));
  }, []);

  const fetch = async (cls: string, session: string, term: string) => {
    if (!cls) return toast.info('Select a class first');
    setFetching(true);
    try {
      const r = await api.get<{ success: boolean; data: any }>(endpoints.admin.results, { class: cls, session, term });
      setStudents(r.data?.students ?? []);
    } catch { toast.error('Failed to fetch results'); }
    finally { setFetching(false); }
  };

  const approve = async (studentId: string, session: string, term: string) => {
    await api.put(endpoints.admin.resultApprove(studentId), { session, term });
  };

  const bulkApprove = async (ids: string[], session: string, term: string) => {
    await api.post(endpoints.admin.resultsBulkApprove, { student_ids: ids, session, term });
  };

  return { init, students, setStudents, loading, fetching, fetch, approve, bulkApprove };
}

/* ── Library ───────────────────────────────────────────────────────────── */
interface AdminLibraryItem {
  id: number; title: string; description?: string; file_url: string;
  course?: string; class?: string; uploaded_by: string; approved: boolean; created_at: string;
}

export function useAdminLibrary() {
  const [items, setItems] = useState<AdminLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    api.get<ApiResponse<{ library: AdminLibraryItem[] }>>(endpoints.admin.library)
      .then((r) => setItems(r.data.library ?? []))
      .catch(() => toast.error('Failed to load library'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: number) => { await api.put(`${endpoints.admin.library}/${id}/approve`, {}); };
  const remove = async (id: number) => { await api.delete(`${endpoints.admin.library}/${id}`); };

  return { items, loading, load, approve, remove };
}

/* ── Messages ──────────────────────────────────────────────────────────── */
interface AdminConversation { user_id: string; name: string; image?: string; last_message: string; unread: number; created_at: string; }
interface AdminMessage { id: number; sender_id: string; receiver_id: string; message: string; read: boolean; created_at: string; }

export function useAdminMessages() {
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [activeUser, setActiveUser] = useState<AdminConversation | null>(null);
  const [myId, setMyId] = useState('');
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    api.get<ApiResponse<{ conversations?: AdminConversation[]; user_id?: string }>>(endpoints.admin.messages)
      .then((r) => { setConversations(r.data.conversations ?? []); if (r.data.user_id) setMyId(r.data.user_id); })
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoading(false));
  }, []);

  const openConversation = async (conv: AdminConversation) => {
    setActiveUser(conv);
    try {
      const r = await api.get<ApiResponse<{ messages?: AdminMessage[] }>>(endpoints.admin.messages, { user_id: conv.user_id });
      setMessages(r.data.messages ?? []);
    } catch { toast.error('Failed to load conversation'); }
  };

  const send = async (text: string) => {
    if (!text.trim() || !activeUser) return;
    await api.post(endpoints.admin.messages, { receiver_id: activeUser.user_id, message: text });
    await openConversation(activeUser);
  };

  return { conversations, messages, activeUser, myId, loading, openConversation, send };
}

/* ── Posts ─────────────────────────────────────────────────────────────── */
interface AdminPost { id: number; title: string; content: string; image?: string; author_name: string; likes: number; comments: number; created_at: string; }

export function useAdminPosts() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    api.get<ApiResponse<{ posts: AdminPost[] }>>(endpoints.admin.posts)
      .then((r) => setPosts(r.data.posts ?? []))
      .catch(() => toast.error('Failed to load posts'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (form: { title: string; content: string; image?: File | null }, postId?: number) => {
    if (form.image) {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('content', form.content);
      fd.append('image', form.image);
      if (postId) await api.upload(`${endpoints.admin.posts}/${postId}`, fd, 'PUT');
      else await api.upload(endpoints.admin.posts, fd);
    } else {
      if (postId) await api.put(`${endpoints.admin.posts}/${postId}`, { title: form.title, content: form.content });
      else await api.post(endpoints.admin.posts, { title: form.title, content: form.content });
    }
  };

  const remove = async (id: number) => { await api.delete(`${endpoints.admin.posts}/${id}`); };

  return { posts, loading, load, save, remove };
}

/* ── Sessions & Terms ──────────────────────────────────────────────────── */
interface Session { id: number; name: string; isCurrent: boolean; }
interface Term { id: number; name: string; isCurrent: boolean; session?: string; }

export function useAdminSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<ApiResponse<{ sessions: Session[] }>>(endpoints.admin.sessions),
      api.get<ApiResponse<{ terms: Term[] }>>(endpoints.admin.terms),
    ])
      .then(([s, t]) => { setSessions(s.data.sessions ?? []); setTerms(t.data.terms ?? []); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const createSession = async (name: string) => { await api.post(endpoints.admin.sessions, { name }); };
  const deleteSession = async (id: number) => { await api.delete(`${endpoints.admin.sessions}/${id}`); };
  const setCurrentSession = async (name: string) => { await api.put(`${endpoints.admin.sessions}/${name}/current`, {}); };
  const setCurrentTerm = async (id: number, isCurrent: boolean) => { await api.put(`${endpoints.admin.terms}/${id}`, { isCurrent }); };

  return { sessions, terms, loading, load, createSession, deleteSession, setCurrentSession, setCurrentTerm };
}

/* ── Classes ───────────────────────────────────────────────────────────── */
interface SchoolClass { id: string; name: string; teacher_name: string | null; student_count: number; }

export function useAdminClasses() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    api.get<{ success: boolean; data: SchoolClass[] }>(endpoints.admin.classes)
      .then((r) => setClasses(r.data ?? []))
      .catch(() => toast.error('Failed to load classes'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (name: string, existingName?: string) => {
    if (existingName) await api.put(endpoints.admin.classItem(existingName), { name });
    else await api.post(endpoints.admin.classes, { name });
  };

  const remove = async (name: string) => { await api.delete(endpoints.admin.classItem(name)); };

  return { classes, loading, load, save, remove };
}

/* ── Courses ───────────────────────────────────────────────────────────── */
interface Course { id: number; course_id: string; course: string; class?: string; }

export function useAdminCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    api.get<ApiResponse<{ courses: Course[] }>>(endpoints.admin.courses)
      .then((r) => setCourses(r.data.courses ?? []))
      .catch(() => toast.error('Failed to load courses'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (form: { course_id: string; course: string; class: string }, courseId?: number) => {
    if (courseId) await api.put(`${endpoints.admin.courses}/${courseId}`, form);
    else await api.post(endpoints.admin.courses, form);
  };

  const remove = async (id: number) => { await api.delete(`${endpoints.admin.courses}/${id}`); };

  return { courses, loading, load, save, remove };
}

/* ── Payments ──────────────────────────────────────────────────────────── */
interface Payment {
  id: number; student_id: string; student_name: string; amount: number;
  status: string; reference: string; description: string; created_at: string;
}

export function useAdminPayments(limit = 20) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [schoolFees, setSchoolFees] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = useCallback((tab: 'pending' | 'fees', page = 1) => {
    setLoading(true);
    const ep = tab === 'pending' ? `${endpoints.admin.payments}/pending` : endpoints.admin.schoolFeesPayments;
    api.get<ApiResponse<{ payments: Payment[]; total: number }>>(ep, { page, limit })
      .then((r) => {
        if (tab === 'pending') setPayments(r.data.payments ?? []);
        else setSchoolFees(r.data.payments ?? []);
        setTotal(r.data.total ?? 0);
      })
      .catch(() => toast.error('Failed to load payments'))
      .finally(() => setLoading(false));
  }, [limit]);

  const verify = async (id: number) => { await api.post(`${endpoints.admin.payments}/${id}/verify`, {}); };

  return { payments, schoolFees, total, loading, load, verify };
}

/* ── Settings ──────────────────────────────────────────────────────────── */
interface SchoolDayRecord { session: string; term: string; totalDays: number; }

export function useAdminSettings() {
  const [records, setRecords] = useState<SchoolDayRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ session: '', term: '', total_days: '' });
  const toast = useToast();

  const load = () => {
    setLoading(true);
    api.get<ApiResponse<SchoolDayRecord[]>>(endpoints.admin.schoolDays)
      .then((r) => setRecords(r.data ?? []))
      .catch(() => toast.error('Failed to load school days'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.session || !form.term || !form.total_days) return toast.error('All fields are required');
    setSaving(true);
    try {
      await api.post(endpoints.admin.schoolDays, { session: form.session, term: form.term, total_days: Number(form.total_days) });
      toast.success('School days saved');
      setForm({ session: '', term: '', total_days: '' });
      load();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const remove = async (session: string, term: string) => {
    try {
      await api.delete(`${endpoints.admin.schoolDays}/${encodeURIComponent(session)}/${term}`);
      toast.success('Deleted'); load();
    } catch { toast.error('Failed to delete'); }
  };

  return { records, form, setForm, loading, saving, save, remove };
}
