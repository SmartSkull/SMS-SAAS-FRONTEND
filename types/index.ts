export type Role = 'student' | 'staff' | 'admin';

export interface User {
  id: string;
  firstname: string;
  lastname: string;
  email?: string;
  phone?: string;
  image?: string;
  role: Role;
}

export interface Student extends User {
  student_id: string;
  class: string;
  session?: string;
}

export interface Staff extends User {
  staff_id: string;
  subject?: string;
  class?: string;
}

export interface Admin extends User {
  admin_id: string;
}

export interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  role: Role | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data: T;
}

export interface SchoolProfile {
  id: string;
  name: string;
  slug: string;
  slogan?: string | null;
  motto?: string | null;
  description?: string | null;
  email?: string | null;
  contactEmail?: string | null;
  contactName?: string | null;
  telephone?: string | null;
  alternatePhone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  website?: string | null;
  logo?: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  location?: string;
  contact?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    alternatePhone?: string | null;
  };
  colors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface DashboardStats {
  current_session: string;
  current_term: string;
  [key: string]: unknown;
}

export interface Result {
  id: string;
  student_id: string;
  course: string;
  ca: number;
  exam: number;
  total: number;
  grade: string;
  remark: string;
  session: string;
  term: string;
  approved: boolean;
}

export interface Assignment {
  id: number;
  title: string;
  description: string;
  course: string;
  class: string;
  due_date: string;
  file_url?: string;
  created_at: string;
  // backend aliases
  subject?: string;
  assignment?: string;
  deadline?: string;
  file?: string;
  createdAt?: string;
}

export interface LibraryItem {
  id: number;
  title: string;
  description?: string;
  file_url: string;
  course?: string;
  class?: string;
  uploaded_by: string;
  created_at: string;
  createdAt?: string;
}

export interface Message {
  id: number;
  sender_id: string;
  receiver_id: string;
  message: string;
  file_url?: string;
  read: boolean;
  created_at: string;
}

export interface Conversation {
  user_id: string;
  name: string;
  image?: string;
  last_message: string;
  unread: number;
  created_at: string;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  image?: string;
  author_name: string;
  likes: number;
  comments: number;
  liked: boolean;
  created_at: string;
}

export interface CbtTest {
  id: string;
  course: string;
  title?: string;
  class: string;
  question_count: number;
  duration?: number;
  completed?: boolean;
  score?: number;
  percentage?: number;
}

export interface CbtQuestion {
  id: number;
  question: string;
  options: string[];
  answer?: string;
}

export interface Payment {
  id: number;
  amount: number;
  status: 'pending' | 'verified' | 'failed';
  reference: string;
  description: string;
  created_at: string;
}

export interface SchoolClass {
  id: number;
  name: string;
}

export interface Course {
  course_id: string;
  course: string;
}

export interface Session {
  id: number;
  name: string;
  isCurrent: boolean;
}

export interface Term {
  id: number;
  name: string;
  isCurrent: boolean;
}


export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT';

export interface AttendanceLocation {
  id: string;
  schoolId: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  resumptionTime: string;
  isActive: boolean;
}

export interface StaffAttendanceRecord {
  id: string;
  staffId: string;
  locationId: string | null;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  status: AttendanceStatus;
  lateMinutes: number;
  note: string | null;
}

export interface StaffAttendanceReportItem extends StaffAttendanceRecord {
  staff: {
    id: string;
    name: string;
    staffNo: string;
    image: string | null;
  };
}

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type LeaveType = 'ANNUAL' | 'SICK' | 'MATERNITY' | 'PATERNITY' | 'UNPAID' | 'OTHER';

export interface LeaveRequest {
  id: string;
  staffId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  proofFile: string | null;
  status: LeaveStatus;
  adminNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface LeaveRequestWithStaff extends LeaveRequest {
  staff: {
    id: string;
    name: string;
    staffNo: string;
    image: string | null;
  };
}

export interface LeaveBalance {
  type: LeaveType;
  entitled: number;
  used: number;
  remaining: number;
}

export type PayrollStatus = 'DRAFT' | 'ISSUED' | 'PAID';

export interface SalarySetup {
  id: string;
  staffId: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowance: number;
  taxRate: number;
  pensionRate: number;
  effectiveFrom: string;
}

export interface StaffSalarySetup {
  staffId: string;
  staffNo: string;
  name: string;
  image: string | null;
  setup: SalarySetup | null;
}

export interface PayrollDeduction {
  id: string;
  schoolId: string;
  staffId: string | null;
  staffName: string;
  title: string;
  amount: number;
  recurring: boolean;
  month: number | null;
  year: number | null;
  note: string | null;
  createdAt: string;
}

export interface Payslip {
  id: string;
  staffId: string;
  staffName: string;
  staffNo: string;
  image: string | null;
  month: number;
  year: number;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowance: number;
  grossPay: number;
  taxAmount: number;
  pensionAmount: number;
  deductions: number;
  netPay: number;
  status: PayrollStatus;
  generatedAt: string;
  createdAt: string;
}
