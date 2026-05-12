import { useEffect, useState } from 'react';
import { api, endpoints } from '@/lib/api';

export interface SchoolData {
  classes: string[];
  sessions: string[];
  terms: string[];
  subjects: string[];
}

export function useSchoolData(): SchoolData {
  const [classes, setClasses] = useState<string[]>([]);
  const [sessions, setSessions] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const TERMS = ['FIRST', 'SECOND', 'THIRD'];

  useEffect(() => {
    api.get<{ data: { name: string }[] }>(endpoints.public.classes)
      .then(r => setClasses((r.data ?? []).map((c: any) => c.name).filter(Boolean)))
      .catch(() => {});
    api.get<{ data: { name: string }[] }>(endpoints.public.sessions)
      .then(r => setSessions((r.data ?? []).map((s: any) => s.name).filter(Boolean)))
      .catch(() => {});
    api.get<{ data: { course?: string; name?: string }[] }>(endpoints.public.courses)
      .then(r => setSubjects([...new Set((r.data ?? []).map((c: any) => c.course ?? c.name).filter(Boolean))]))
      .catch(() => {});
  }, []);

  return { classes, sessions, terms: TERMS, subjects };
}
