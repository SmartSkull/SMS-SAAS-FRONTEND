import axios, { type AxiosRequestConfig } from 'axios';
import { auth } from './auth';

// Client always uses /api (proxied by Next.js rewrites to the backend)
// Server-side uses the backend URL directly via BACKEND_URL (no NEXT_PUBLIC_ = build-time safe)
const BASE_URL = typeof window !== 'undefined'
  ? '/api'
  : (process.env.BACKEND_URL ?? 'http://localhost:8080');

const UPLOADS_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080'}/uploads`;

export function getImageUrl(filename?: string | null): string | null {
  if (!filename || filename === 'null' || filename === 'image.png') return null;
  if (filename.startsWith('http')) return filename;
  // Route through /api/uploads proxy which adds ngrok-skip-browser-warning header
  return `/api/uploads/${filename}`;
}

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'ngrok-skip-browser-warning': '1' },
});

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
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
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
    onlineClasses: '/student/online-classes',
    attendanceClockIn: '/attendance/student/clock-in',
    attendanceClockOut: '/attendance/student/clock-out',
    attendanceToday: '/attendance/student/today',
    attendanceHistory: '/attendance/student/history',
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
    notifications: '/staff/notifications',
    notificationsRead: '/staff/notifications/read',
    classTimetable: '/staff/timetable/class',
    examTimetable: '/staff/timetable/exam',
    curriculumTopics: '/staff/curriculum/topics',
    curriculumLessonPlans: '/staff/curriculum/lesson-plans',
    curriculumWeeklySchemes: '/staff/curriculum/weekly-schemes',
    attendanceClockIn: '/attendance/clock-in',
    attendanceClockOut: '/attendance/clock-out',
    attendanceToday: '/attendance/today',
    attendanceHistory: '/attendance/history',
    attendanceStudents: '/attendance/staff/students',
    leaveRequest: '/leave/request',
    leaveMyLeaves: '/leave/my',
    leaveBalance: '/leave/balance',
    payrollPayslips: '/payroll/my-payslips',
    onlineClasses: '/staff/online-classes',
    onlineClass: (id: number) => `/staff/online-classes/${id}`,
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
    notifications: '/admin/notifications',
    notificationsRead: '/admin/notifications/read',
    schoolDaysDelete: (s: string, t: string) => `/admin/school-days/${s}/${t}`,
    settings: '/admin/settings',
    school: '/admin/school',
    attendanceLocation: '/attendance/admin/location',
    attendanceReport: '/attendance/admin/report',
    attendanceMarkAbsent: '/attendance/admin/mark-absent',
    attendanceStudentReport: '/attendance/admin/student-report',
    attendanceMarkStudentsAbsent: '/attendance/admin/mark-students-absent',
    cbtQuestions: '/admin/cbt/questions',
    cbtQuestion: (id: string) => `/admin/cbt/questions/${id}`,
    schoolFees: '/admin/school-fees',
    schoolFeesConfig: '/admin/school-fees/config',
    schoolFeesConfigItem: (id: number) => `/admin/school-fees/config/${id}`,
    schoolFeesPayments: '/admin/school-fees/payments',
    schoolFeesPaymentsSummary: '/admin/school-fees/payments/summary',
    schoolFeesStudentPayments: (id: string) => `/admin/school-fees/payments/${id}`,
    leaveAll: '/leave/admin/all',
    leaveReview: (id: string) => `/leave/admin/${id}/review`,
    leaveStaffBalance: (staffId: string) => `/leave/admin/balance/${staffId}`,
    leaveEntitlements: '/leave/admin/entitlements',
    promotionClasses: '/admin/promotions/classes',
    promotionPromote: '/admin/promotions/promote',
    promotionRepeat: '/admin/promotions/repeat',
    promotionTransfer: '/admin/promotions/transfer',
    payrollSalarySetups: '/payroll/admin/salary-setups',
    payrollSalarySetup: (staffId: string) => `/payroll/admin/salary-setups/${staffId}`,
    payrollDeductions: '/payroll/admin/deductions',
    payrollDeduction: (id: string) => `/payroll/admin/deductions/${id}`,
    payrollPayslips: '/payroll/admin/payslips',
    payrollRun: '/payroll/admin/payslips/run',
    payrollPayslipStatus: (id: string) => `/payroll/admin/payslips/${id}/status`,
  },
  public: {
    currentPeriod: '/public/current-period',
    sessions: '/public/sessions',
    terms: '/public/terms',
    classes: '/public/classes',
    courses: '/public/courses',
    schools: '/public/schools',
    school: (slug: string) => `/public/schools/${encodeURIComponent(slug)}`,
    schoolCheck: '/public/schools/check',
    schoolRegister: '/public/schools/register',
    posts: '/public/posts',
    searchStudents: '/public/students/search',
    approvedResultsMeta: '/public/approved-results-meta',
  },
};
