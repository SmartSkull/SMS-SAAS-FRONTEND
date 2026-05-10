import axios, { type AxiosRequestConfig } from 'axios';
import { auth } from './auth';

const BASE_URL = typeof window === 'undefined'
  ? 'https://www.florierenparklaneis.com.ng/api'  // server-side: direct
  : '/api';                                         // client-side: proxied through Next.js

const UPLOADS_URL = typeof window === 'undefined'
  ? `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'}/uploads`
  : '/uploads';

export function getImageUrl(filename?: string | null): string | null {
  if (!filename || filename === 'null' || filename === 'image.png') return null;
  if (filename.startsWith('http')) return filename;
  return `${UPLOADS_URL}/${filename}`;
}

const client = axios.create({ baseURL: BASE_URL });

// Attach token
client.interceptors.request.use((config) => {
  const token = auth.getToken();
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// Handle 401 → refresh → retry once
client.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const isLoginEndpoint = original.url?.includes('/auth/') && original.url?.includes('/login');

    if (error.response?.status === 401 && !isLoginEndpoint && !original._retry) {
      original._retry = true;
      const refreshToken = auth.getRefreshToken();
      if (refreshToken) {
        try {
          const { data } = await axios.post(`/api/auth/refresh`, { refresh_token: refreshToken });
          auth.setSession(
            data.data.token,
            data.data.refresh_token,
            auth.getUser()!,
            auth.getRole()!,
          );
          original.headers = { ...original.headers, 'Authorization': `Bearer ${data.data.token}` };
          return client(original);
        } catch {
          // fall through to logout
        }
      }
      auth.clear();
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    return Promise.reject(error.response?.data ?? error);
  },
);

export const api = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    client.get<T>(url, { params }).then((r) => r.data),

  post: <T>(url: string, data?: unknown) =>
    client.post<T>(url, data).then((r) => r.data),

  put: <T>(url: string, data?: unknown) =>
    client.put<T>(url, data).then((r) => r.data),

  delete: <T>(url: string, data?: unknown) =>
    client.delete<T>(url, { data }).then((r) => r.data),

  upload: <T>(url: string, formData: FormData, method: 'POST' | 'PUT' = 'POST') =>
    client.request<T>({ method, url, data: formData }).then((r) => r.data),
};

export const endpoints = {
  auth: {
    studentLogin: '/auth/student/login',
    staffLogin: '/auth/staff/login',
    adminLogin: '/auth/admin/login',
    refresh: '/auth/refresh',
    me: '/auth/me',
    logout: '/auth/logout',
  },
  student: {
    dashboard: '/student/dashboard',
    profile: '/student/profile',
    results: '/student/results',
    assignments: '/student/assignments',
    library: '/student/library',
    classTimetable: '/student/timetable/class',
    examTimetable: '/student/timetable/exam',
    notifications: '/student/notifications',
    notificationsRead: '/student/notifications/read',
    payments: '/student/payments',
    paymentsInit: '/student/payments/initialize',
    scratchCards: '/student/scratch-cards',
    cbtTests: '/student/cbt/tests',
    cbtStart: (course: string) => `/student/cbt/start/${encodeURIComponent(course)}`,
    cbtAnswer: '/student/cbt/answer',
    cbtSubmit: '/student/cbt/submit',
    cbtResults: '/student/cbt/results',
    messages: '/student/messages',
    messagesUpload: '/student/messages/upload',
    messagesUnread: '/student/messages/unread/count',
    users: '/student/users',
    posts: '/student/posts',
    bookgameUpload: '/student/bookgame/upload',
    bookgameGenerate: '/student/bookgame/generate',
    bookgameCheck: '/student/bookgame/check',
    schoolFees: '/student/school-fees',
    schoolFeesInit: '/student/school-fees/initialize',
    schoolFeesVerify: (ref: string) => `/student/school-fees/verify/${ref}`,
    schoolFeesHistory: '/student/school-fees/history',
  },
  staff: {
    dashboard: '/staff/dashboard',
    profile: '/staff/profile',
    students: '/staff/students',
    student: (id: string) => `/staff/students/${id}`,
    results: '/staff/results',
    attendance: '/staff/attendance',
    comment: '/staff/comment',
    assignments: '/staff/assignments',
    assignment: (id: number) => `/staff/assignments/${id}`,
    library: '/staff/library',
    libraryItem: (id: number) => `/staff/library/${id}`,
    classes: '/staff/classes',
    courses: '/staff/courses',
    cbt: '/staff/cbt',
    cbtQuestions: '/staff/cbt/questions',
    cbtQuestion: (id: string) => `/staff/cbt/questions/${id}`,
    cbtResults: '/staff/cbt/results',
    cbtExtract: '/staff/cbt/extract-questions',
    cbtBulkCreate: '/staff/cbt/bulk-create',
    messages: '/staff/messages',
    messagesUpload: '/staff/messages/upload',
    messagesUnread: '/staff/messages/unread/count',
    users: '/staff/users',
    posts: '/staff/posts',
    schoolDays: '/staff/school-days',
  },
  admin: {
    dashboard: '/admin/dashboard',
    students: '/admin/students',
    student: (id: string) => `/admin/students/${id}`,
    studentVerify: (id: string) => `/admin/students/${id}/verify`,
    studentsVerify: '/admin/students/verify',
    studentsBulkVerify: '/admin/students/bulk-verify',
    staff: '/admin/staff',
    staffMember: (id: string) => `/admin/staff/${id}`,
    staffVerify: (id: string) => `/admin/staff/${id}/verify`,
    sessions: '/admin/sessions',
    sessionCurrent: (s: string) => `/admin/sessions/${s}/current`,
    terms: '/admin/terms',
    termCurrent: (t: string) => `/admin/terms/${t}/current`,
    payments: '/admin/payments',
    paymentsPending: '/admin/payments/pending',
    paymentVerify: (id: string) => `/admin/payments/${id}/verify`,
    library: '/admin/library',
    libraryApprove: (id: string) => `/admin/library/${id}/approve`,
    libraryItem: (id: string) => `/admin/library/${id}`,
    classes: '/admin/classes',
    classItem: (c: string) => `/admin/classes/${c}`,
    courses: '/admin/courses',
    courseItem: (c: string) => `/admin/courses/${c}`,
    posts: '/admin/posts',
    post: (id: number) => `/admin/posts/${id}`,
    messages: '/admin/messages',
    messagesUpload: '/admin/messages/upload',
    messagesUnread: '/admin/messages/unread/count',
    users: '/admin/users',
    results: '/admin/results',
    resultStudent: (id: string) => `/admin/results/${id}`,
    resultApprove: (id: string) => `/admin/results/${id}/approve`,
    resultUnapprove: (id: string) => `/admin/results/${id}/unapprove`,
    resultPrincipalComment: (id: string) => `/admin/results/${id}/principal-comment`,
    resultsBulkApprove: '/admin/results/bulk-approve',
    resultsBulkUnapprove: '/admin/results/bulk-unapprove',
    schoolDays: '/admin/school-days',
    schoolDaysDelete: (s: string, t: string) => `/admin/school-days/${s}/${t}`,
    settings: '/admin/settings',
    cbtQuestions: '/admin/cbt/questions',
    cbtQuestion: (id: string) => `/admin/cbt/questions/${id}`,
    schoolFees: '/admin/school-fees',
    schoolFeesConfig: '/admin/school-fees/config',
    schoolFeesConfigItem: (id: number) => `/admin/school-fees/config/${id}`,
    schoolFeesPayments: '/admin/school-fees/payments',
    schoolFeesPaymentsSummary: '/admin/school-fees/payments/summary',
    schoolFeesStudentPayments: (id: string) => `/admin/school-fees/payments/${id}`,
  },
  public: {
    currentPeriod: '/public/current-period',
    sessions: '/public/sessions',
    terms: '/public/terms',
    classes: '/public/classes',
    courses: '/public/courses',
    posts: '/public/posts',
    searchStudents: '/public/students/search',
  },
};
