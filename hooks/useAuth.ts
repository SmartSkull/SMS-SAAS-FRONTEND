'use client';
import { useState, useEffect } from 'react';
import { auth } from '@/lib/auth';
import type { User, Role } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    setUser(auth.getUser());
    setRole(auth.getRole());
  }, []);

  const logout = () => {
    auth.clear();
    setUser(null);
    setRole(null);
  };

  return { user, role, isAuthenticated: !!user, logout };
}
