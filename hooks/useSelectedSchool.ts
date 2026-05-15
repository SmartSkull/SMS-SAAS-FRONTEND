'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, endpoints, getImageUrl } from '@/lib/api';
import type { ApiResponse, SchoolProfile } from '@/types';

const STORAGE_KEY = 'selected_school';

export function normalizeSchoolLogo(logo?: string | null) {
  return getImageUrl(logo) ?? null;
}

export function readSelectedSchool(): SchoolProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as SchoolProfile : null;
  } catch {
    return null;
  }
}

export function saveSelectedSchool(school: SchoolProfile) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(school));
  window.dispatchEvent(new CustomEvent('school:selected', { detail: school }));
}

export function clearSelectedSchool() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('school:selected', { detail: null }));
}

export function useSelectedSchool() {
  const [school, setSchool] = useState<SchoolProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = readSelectedSchool();
    setSchool(stored);
    setLoading(false);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      setSchool((event as CustomEvent<SchoolProfile | null>).detail ?? readSelectedSchool());
    };

    window.addEventListener('school:selected', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('school:selected', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const selectSchool = useCallback((nextSchool: SchoolProfile) => {
    saveSelectedSchool(nextSchool);
    setSchool(nextSchool);
  }, []);

  return { school, loading, selectSchool, clearSchool: clearSelectedSchool };
}

export async function searchSchools(query: string) {
  const response = await api.get<ApiResponse<SchoolProfile[]>>(endpoints.public.schools, { q: query });
  return response.data ?? [];
}
