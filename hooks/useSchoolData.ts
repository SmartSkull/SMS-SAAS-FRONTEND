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
    api.get<{ data: { name: string }[] }>(endpoints.admin.classes)
      .then(r => setClasses((r.data ?? []).map((c: any) => c.name).filter(Boolean)))
      .catch(() => {});
    api.get<{ data: { name: string }[] }>(endpoints.admin.sessions)
      .then(r => setSessions((r.data ?? []).map((s: any) => s.name).filter(Boolean)))
      .catch(() => {});
    api.get<{ data: { course: string }[] }>(endpoints.admin.courses)
      .then(r => setSubjects([...new Set((r.data ?? []).map((c: any) => c.course).filter(Boolean))]))
      .catch(() => {});
  }, []);

  return { classes, sessions, terms: TERMS, subjects };
}
