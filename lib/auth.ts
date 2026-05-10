import Cookies from 'js-cookie';
import type { User, Role } from '@/types';

const KEYS = {
  TOKEN: 'gka_token',
  REFRESH: 'gka_refresh_token',
  USER: 'gka_user',
  ROLE: 'gka_role',
} as const;

export const auth = {
  getToken: () => Cookies.get(KEYS.TOKEN) ?? null,
  getRefreshToken: () => Cookies.get(KEYS.REFRESH) ?? null,
  getRole: (): Role | null => (Cookies.get(KEYS.ROLE) as Role) ?? null,
  getUser: (): User | null => {
    const u = Cookies.get(KEYS.USER);
    return u ? JSON.parse(u) : null;
  },

  setSession(token: string, refreshToken: string, user: User, role: Role) {
    const opts = { expires: 1, sameSite: 'lax' as const };
    Cookies.set(KEYS.TOKEN, token, opts);
    Cookies.set(KEYS.REFRESH, refreshToken, opts);
    Cookies.set(KEYS.USER, JSON.stringify(user), opts);
    Cookies.set(KEYS.ROLE, role, opts);
  },

  clear() {
    Object.values(KEYS).forEach((k) => Cookies.remove(k));
  },

  isAuthenticated: () => !!Cookies.get(KEYS.TOKEN),

  getDashboardPath(role?: Role | null): string {
    switch (role ?? Cookies.get(KEYS.ROLE)) {
      case 'student': return '/student/dashboard';
      case 'staff': return '/staff/dashboard';
      case 'admin': return '/admin/dashboard';
      default: return '/login';
    }
  },
};
