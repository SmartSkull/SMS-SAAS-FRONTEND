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
