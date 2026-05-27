'use client';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/StateDisplay';
import { useToast } from '@/components/ui/Toast';
import { useSchoolData } from '@/hooks/useSchoolData';
import { normalizeSchoolLogo, useSelectedSchool } from '@/hooks/useSelectedSchool';
import { api, endpoints, getImageUrl } from '@/lib/api';
import type { SchoolProfile } from '@/types';
import { Eye, FileBarChart2, Loader2, MessageSquare, Plus, Printer, Search, Upload, User, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const UPLOADS_BASE = typeof window !== 'undefined' ? `${window.location.origin}/api/uploads` : '/api/uploads';

async function toBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => resolve('');
      r.readAsDataURL(blob);
    });
  } catch { return ''; }
}

function gradeColorHex(g: string) {
  if (g === 'A1') return '#16a34a';
  if (g === 'B2') return '#22c55e';
  if (g === 'B3') return '#3b82f6';
  if (['C4','C5','C6'].includes(g)) return '#d97706';
  if (g === 'D7') return '#a855f7';
  if (g === 'E8') return '#6b7280';
  return '#dc2626';
}

async function printResultSheet(data: any, results: any[], session: string, term: string, student: any, school?: SchoolProfile | null) {
  const showFirst  = term.toLowerCase() === 'second' || term.toLowerCase() === 'third';
  const showSecond = term.toLowerCase() === 'third';
  const totalScore = results.reduce((s: number, r: any) => s + Number(r.totalScore ?? (Number(r.testScore ?? r.test_score) + Number(r.examScore ?? r.exam_score))), 0);
  const avg = results.length ? (totalScore / results.length).toFixed(1) : '0';

  const photoUrl = student?.image ? `${UPLOADS_BASE}/${student.image}` : '';
  const teacherPhotoUrl = data.teacher?.image ? `${UPLOADS_BASE}/${data.teacher.image}` : '';
  const principalPhotoUrl = data.principal?.image ? `${UPLOADS_BASE}/${data.principal.image}` : '';

  const logoUrl = normalizeSchoolLogo(school?.logo) || '';
  const primary = school?.primaryColor || '#1d4ed8';
  const schoolName = school?.name || 'School Portal';
  const schoolSlogan = school?.slogan || school?.motto || '';
  const [logoB64, photoB64, sigB64, teacherB64, principalB64] = await Promise.all([
    toBase64(logoUrl), toBase64(photoUrl), Promise.resolve(''),
    toBase64(teacherPhotoUrl), toBase64(principalPhotoUrl),
  ]);

  const present = Number(data.attendance?.present || 0);
  const absent  = Number(data.attendance?.absent  || 0);
  const totalDays = present + absent;
  const attendanceRate = totalDays > 0 ? ((present / totalDays) * 100).toFixed(1) : '0';

  const win = window.open('', '_blank');
  if (!win) return;

  win.document.write(`<!DOCTYPE html><html><head>
  <title>Result — ${student?.firstName} ${student?.lastName}</title>
  <style>
    @page{size:A4;margin:8mm}*{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:10px;background:#fff}
    .hdr{text-align:center;margin-bottom:6px;padding-bottom:4px;border-bottom:2px solid ${primary}}
    .info-bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;padding:6px 10px;background:#eff6ff;border-radius:4px;border:1px solid #bfdbfe}
    .stats{display:flex;gap:8px}.stat{text-align:center;padding:3px 8px;background:#fff;border-radius:4px;border:1px solid #e2e8f0}
    .stat .n{font-size:12px;font-weight:700;color:${primary}}.stat .l{font-size:6px;color:#666;text-transform:uppercase}
    table{width:100%;border-collapse:collapse;font-size:9px;margin-bottom:6px}
    th{background:${primary};color:#fff;padding:4px 3px;font-size:8px;text-transform:uppercase}
    td{padding:4px 3px;text-align:center;border-bottom:1px solid #e5e7eb}tr:nth-child(even){background:#f9fafb}
    .sn{text-align:left!important;font-weight:500}.badge{display:inline-block;padding:2px 6px;border-radius:4px;font-weight:700;font-size:8px;color:#fff}
    .att{display:flex;gap:20px;margin-bottom:6px;padding:6px 10px;background:#eff6ff;border-radius:4px;border:1px solid #bfdbfe}
    .att-item{text-align:center}.att-item .n{font-size:12px;font-weight:700}.att-item .l{font-size:7px;color:#666;text-transform:uppercase}
    .cmts{display:flex;gap:10px;margin-bottom:8px}.cmt{flex:1;padding:6px;border-radius:4px;border:1px solid #e5e7eb}
    .cmt.t{background:#fefce8;border-color:#fde047}.cmt.p{background:#eef2ff;border-color:#a5b4fc}
    .cmt .ttl{font-size:8px;font-weight:700;text-transform:uppercase;margin-bottom:3px}.cmt .txt{font-size:9px;color:#555;font-style:italic}
    .scale{display:flex;justify-content:center;gap:4px;margin-bottom:8px;padding:6px;background:#f9fafb;border-radius:4px;border:1px solid #e5e7eb}
    .sc-item{text-align:center}.sc-item .c{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;font-weight:700;font-size:6px;color:#fff}
    .sc-item .r{font-size:6px;color:#666;margin-top:1px}.sc-item .d{font-size:5px;color:#888}
    .foot{margin-top:10px;padding-top:8px;border-top:1px solid #e5e7eb;display:flex;justify-content:center;gap:60px}
    .sig .ttl{font-size:8px;color:#666;text-transform:uppercase;margin-top:3px;text-align:center}
    .sig-img{height:35px;width:auto;display:block;margin:0 auto}
    .date-val{font-size:11px;font-weight:600;color:#333;padding:5px 0;border-bottom:1px solid #333;min-width:120px;text-align:center}
    .sum td{font-weight:700;border-top:2px solid ${primary};background:#eff6ff!important}
    .traits-section{margin:8px 0;font-size:8px}
    .traits-title{font-weight:700;padding:4px 6px;background:#f3f4f6;border-radius:4px;margin-bottom:3px;text-transform:uppercase}
    .traits-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:2px}
    .trait-item{padding:3px;background:#fafafa;border:1px solid #e5e7eb;border-radius:2px;text-align:center}
    .trait-label{font-weight:600;color:#374151;font-size:6px;display:block;margin-bottom:1px}
    .trait-score{font-weight:700;color:${primary};font-size:9px}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body><div>
  <div class="hdr">
    <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:4px">
      ${logoB64 ? `<img src="${logoB64}" style="width:56px;height:56px;object-fit:contain">` : ''}
      <div style="text-align:left"><div style="color:${primary};font-size:17px;font-weight:700">${schoolName}</div><div style="color:#555;font-size:9px">${schoolSlogan}</div></div>
    </div>
    <div style="margin-top:5px;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;padding:3px 12px;display:inline-block"><p style="color:#374151;font-weight:500;font-size:10px">Comprehensive Analysis of Assessment</p></div>
    <div style="margin-top:5px;display:flex;justify-content:center;gap:15px;font-size:9px"><span><strong>Session:</strong> ${session}</span><span><strong>Term:</strong> ${term} Term</span></div>
  </div>
  <div class="info-bar">
    ${photoB64 ? `<img src="${photoB64}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid ${primary};margin-right:10px">` : ''}
    <div style="display:flex;gap:15px">
      <div><div style="color:#666;font-size:7px;text-transform:uppercase">Name</div><div style="font-weight:600;font-size:10px">${student?.firstName} ${student?.lastName}</div></div>
      <div><div style="color:#666;font-size:7px;text-transform:uppercase">Student ID</div><div style="font-weight:600;font-size:10px">${student?.uniqueId || ''}</div></div>
      <div><div style="color:#666;font-size:7px;text-transform:uppercase">Class</div><div style="font-weight:600;font-size:10px">${data.class || 'N/A'}</div></div>
    </div>
    <div class="stats">
      <div class="stat"><div class="n">${results.length}</div><div class="l">Subjects</div></div>
      <div class="stat"><div class="n">${totalScore}</div><div class="l">Total</div></div>
      <div class="stat"><div class="n">${avg}%</div><div class="l">Average</div></div>
    </div>
  </div>
  <div class="att">
    <div class="att-item"><div class="n" style="color:#16a34a">${present}</div><div class="l">Days Present</div></div>
    <div class="att-item"><div class="n" style="color:#dc2626">${absent}</div><div class="l">Days Absent</div></div>
    <div class="att-item"><div class="n" style="color:#2563eb">${totalDays}</div><div class="l">Total Days</div></div>
    <div class="att-item"><div class="n" style="color:#7c3aed">${attendanceRate}%</div><div class="l">Attendance</div></div>
  </div>
  <table><thead><tr>
    <th style="width:20px">S/N</th><th style="text-align:left">Subject</th>
    ${showFirst  ? '<th style="background:#3b82f6">1st Term</th>' : ''}
    ${showSecond ? '<th style="background:#22c55e">2nd Term</th>' : ''}
    <th>CA (40)</th><th>Exam (60)</th><th>Total</th>
    <th style="background:#7c3aed">Cumulative</th><th style="background:#d97706">Average</th>
    <th>Grade</th><th>Remark</th>
  </tr></thead><tbody>
    ${results.map((r: any, i: number) => {
      const total = Number(r.totalScore ?? (Number(r.testScore ?? r.test_score) + Number(r.examScore ?? r.exam_score)));
      const gc = gradeColorHex(r.grade);
      return `<tr>
        <td>${i + 1}</td><td class="sn">${r.subject?.name ?? r.course}</td>
        ${showFirst  ? `<td style="background:#eff6ff">${r.first_term_score ?? '-'}</td>` : ''}
        ${showSecond ? `<td style="background:#f0fdf4">${r.second_term_score ?? '-'}</td>` : ''}
        <td>${r.testScore ?? r.test_score}</td><td>${r.examScore ?? r.exam_score}</td>
        <td style="font-weight:700;color:${total >= 50 ? '#166534' : '#dc2626'}">${total}</td>
        <td style="background:#f5f3ff;font-weight:600">${r.cumulative ?? total}</td>
        <td style="background:#fffbeb;font-weight:600">${r.average ?? total}</td>
        <td><span class="badge" style="background:${gc}">${r.grade}</span></td>
        <td><span style="font-size:7px;padding:2px 5px;border-radius:6px;background:${r.grade==='F9'?'#fee2e2':'#dcfce7'};color:${r.grade==='F9'?'#dc2626':'#166534'}">${r.remark ?? ''}</span></td>
      </tr>`;
    }).join('')}
    <tr class="sum"><td colspan="2" style="text-align:left">TOTAL / AVG</td>
      ${showFirst ? '<td>-</td>' : ''}${showSecond ? '<td>-</td>' : ''}
      <td>-</td><td>-</td><td>${totalScore}/${results.length * 100}</td>
      <td>-</td><td style="font-weight:700">${avg}%</td><td>-</td><td>-</td>
    </tr>
  </tbody></table>
  <div class="scale">
    ${[['A1','75-100','Excellent','#16a34a'],['B2','70-74','V.Good','#22c55e'],['B3','65-69','Good','#3b82f6'],
       ['C4','60-64','Credit','#60a5fa'],['C5','55-59','Credit','#eab308'],['C6','50-54','Credit','#d97706'],
       ['D7','45-49','Pass','#a855f7'],['E8','40-44','Pass','#6b7280'],['F9','0-39','Fail','#dc2626']]
      .map(([g,r,d,c]) => `<div class="sc-item"><span class="c" style="background:${c}">${g}</span><div class="r">${r}</div><div class="d">${d}</div></div>`).join('')}
  </div>

  ${data.trait ? `
  <div class="traits-section">
    <div class="traits-title">Affective Traits</div>
    <div class="traits-grid">
      <div class="trait-item"><span class="trait-label">Punctuality</span><span class="trait-score">${data.trait.punctuality}/5</span></div>
      <div class="trait-item"><span class="trait-label">Perseverance</span><span class="trait-score">${data.trait.perseverance}/5</span></div>
      <div class="trait-item"><span class="trait-label">Responsibility</span><span class="trait-score">${data.trait.responsibility}/5</span></div>
      <div class="trait-item"><span class="trait-label">Diligence</span><span class="trait-score">${data.trait.diligence}/5</span></div>
      <div class="trait-item"><span class="trait-label">Self Control</span><span class="trait-score">${data.trait.selfControl}/5</span></div>
      <div class="trait-item"><span class="trait-label">Honesty</span><span class="trait-score">${data.trait.honesty}/5</span></div>
      <div class="trait-item"><span class="trait-label">Attendance</span><span class="trait-score">${data.trait.attendance}/5</span></div>
      <div class="trait-item"><span class="trait-label">Attentiveness</span><span class="trait-score">${data.trait.attentiveness}/5</span></div>
      <div class="trait-item"><span class="trait-label">Creativity</span><span class="trait-score">${data.trait.creativity}/5</span></div>
      <div class="trait-item"><span class="trait-label">Curiosity</span><span class="trait-score">${data.trait.curiosity}/5</span></div>
    </div>
  </div>

  <div class="traits-section">
    <div class="traits-title">Psychomotor Traits</div>
    <div class="traits-grid">
      <div class="trait-item"><span class="trait-label">Drawing</span><span class="trait-score">${data.trait.drawing}/5</span></div>
      <div class="trait-item"><span class="trait-label">Physical Activity</span><span class="trait-score">${data.trait.physicalActivity}/5</span></div>
      <div class="trait-item"><span class="trait-label">Accuracy</span><span class="trait-score">${data.trait.accuracy}/5</span></div>
      <div class="trait-item"><span class="trait-label">Handling of Tools</span><span class="trait-score">${data.trait.handlingOfTools}/5</span></div>
      <div class="trait-item"><span class="trait-label">Mental Skills</span><span class="trait-score">${data.trait.mentalSkills}/5</span></div>
    </div>
  </div>
  ` : ''}

  <div class="cmts">
    <div class="cmt t">
      <div class="ttl">Teacher's Comment</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;padding-bottom:5px;border-bottom:1px solid #fde047">
        ${teacherB64 ? `<img src="${teacherB64}" style="width:28px;height:28px;border-radius:50%;object-fit:cover">` : ''}
        <div><div style="font-size:9px;font-weight:700">${data.teacher?.name || 'Class Teacher'}</div><div style="font-size:6px;color:#666;text-transform:uppercase">Form Teacher</div></div>
      </div>
      <div class="txt">${data.attendance?.teacherComment || 'No comment provided'}</div>
    </div>
    <div class="cmt p">
      <div class="ttl">Principal's Comment</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;padding-bottom:5px;border-bottom:1px solid #a5b4fc">
        ${principalB64 ? `<img src="${principalB64}" style="width:28px;height:28px;border-radius:50%;object-fit:cover">` : ''}
        <div><div style="font-size:9px;font-weight:700">${data.principal?.name || 'The Principal'}</div><div style="font-size:6px;color:#666;text-transform:uppercase">School Head</div></div>
      </div>
      <div class="txt">${data.attendance?.principalComment || 'No comment provided'}</div>
    </div>
  </div>
  <div class="foot">
    <div class="sig">${sigB64 ? `<img src="${sigB64}" class="sig-img" alt="Signature">` : '<div style="height:35px"></div>'}<div class="ttl">Principal</div></div>
    <div class="sig"><div class="date-val">${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</div><div class="ttl">Date Approved</div></div>
  </div>
</div></body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

export default function StaffResults() {
  const { school } = useSelectedSchool();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  const [termFilter, setTermFilter] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadCourse, setUploadCourse] = useState('');
  const [uploadClass, setUploadClass] = useState('');
  const [uploadStudents, setUploadStudents] = useState<any[]>([]);
  const [loadingUploadStudents, setLoadingUploadStudents] = useState(false);
  const [rows, setRows] = useState<Record<string, { test_score: string; exam_score: string }>>({});
  const [uploadSession, setUploadSession] = useState('');
  const [uploadTerm, setUploadTerm]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [commentModal, setCommentModal] = useState<{ student_id: string; comment: string } | null>(null);
  const [attendanceModal, setAttendanceModal] = useState(false);
  const [attendanceClass, setAttendanceClass] = useState('');
  const [attendanceStudents, setAttendanceStudents] = useState<any[]>([]);
  const [loadingAttStudents, setLoadingAttStudents] = useState(false);
  const [attendanceRows, setAttendanceRows] = useState<Record<string, { present: string; absent: string }>>({});
  const [totalSchoolDays, setTotalSchoolDays] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [viewingStudent, setViewingStudent] = useState<string | null>(null);
  const [rowLoading, setRowLoading] = useState<Record<string, string>>({});
  const [traitsModal, setTraitsModal] = useState(false);
  const [traitsClass, setTraitsClass] = useState('');
  const [traitsStudents, setTraitsStudents] = useState<any[]>([]);
  const [traitsRows, setTraitsRows] = useState<Record<string, Record<string, number>>>({});
  const [loadingTraits, setLoadingTraits] = useState(false);
  const [submittingTraits, setSubmittingTraits] = useState(false);
  const { classes, subjects, sessions, terms } = useSchoolData();
  const toast = useToast();

  // Fetch current session/term for upload modal
  useEffect(() => {
    api.get<any>(endpoints.public.currentPeriod)
      .then(async r => {
        const session = r.data?.session ?? '';
        const term = r.data?.term ?? '';
        setUploadSession(session);
        setUploadTerm(term);
        // Fetch admin-configured school days for this session/term
        if (session && term) {
          try {
            const sd = await api.get<any>(endpoints.staff.schoolDays);
            const days = (sd.data ?? []).find((d: any) =>
              d.session === session && d.term?.toUpperCase() === term?.toUpperCase()
            );
            setTotalSchoolDays(days?.totalDays ?? null);
          } catch { setTotalSchoolDays(null); }
        }
      })
      .catch(() => {});
  }, []);

  // Load students + pre-fill existing attendance when class changes
  useEffect(() => {
    if (!attendanceClass) { setAttendanceStudents([]); setAttendanceRows({}); return; }
    setLoadingAttStudents(true);
    const fetchData = async () => {
      try {
        const studentsRes = await api.get<any>(endpoints.staff.students, { class: attendanceClass });
        const students = studentsRes.data ?? [];
        setAttendanceStudents(students);
        const initial: Record<string, { present: string; absent: string }> = {};
        students.forEach((s: any) => { initial[s.student_id] = { present: '', absent: '' }; });
        // Pre-fill existing attendance using uniqueId from backend
        try {
          const attRes = await api.get<any>(endpoints.staff.attendance, {
            class: attendanceClass,
            session: uploadSession || undefined,
            term: uploadTerm || undefined,
          });
          const existing: any[] = Array.isArray(attRes.data) ? attRes.data : [];
          existing.forEach((a: any) => {
            const uid = a.uniqueId;
            if (uid && initial[uid]) {
              initial[uid] = { present: String(a.present ?? ''), absent: String(a.absent ?? '') };
            }
          });
        } catch { /* no existing attendance */ }
        setAttendanceRows(initial);
      } catch {
        toast.error('Failed to load students');
      } finally {
        setLoadingAttStudents(false);
      }
    };
    fetchData();
  }, [attendanceClass, uploadSession, uploadTerm]);


  useEffect(() => {
    if (!uploadClass) { setUploadStudents([]); setRows({}); return; }
    setLoadingUploadStudents(true);
    const fetchData = async () => {
      try {
        const studentsRes = await api.get<any>(endpoints.staff.students, { class: uploadClass });
        const students = studentsRes.data ?? [];
        setUploadStudents(students);

        // Initialize empty rows
        const initial: Record<string, { test_score: string; exam_score: string }> = {};
        students.forEach((s: any) => { initial[s.student_id] = { test_score: '', exam_score: '' }; });

        // Pre-fill existing scores if subject is selected
        if (uploadCourse && uploadSession && uploadTerm) {
          try {
            const resultsRes = await api.get<any>(endpoints.staff.results, {
              class: uploadClass,
              course: uploadCourse,
              session: uploadSession,
              term: uploadTerm,
            });
            const existing: any[] = resultsRes.data ?? [];
            existing.forEach((r: any) => {
              if (initial[r.student_id]) {
                initial[r.student_id] = {
                  test_score: String(r.test_score ?? r.testScore ?? ''),
                  exam_score: String(r.exam_score ?? r.examScore ?? ''),
                };
              }
            });
          } catch { /* no existing results, leave empty */ }
        }
        setRows(initial);
      } catch {
        toast.error('Failed to load students');
      } finally {
        setLoadingUploadStudents(false);
      }
    };
    fetchData();
  }, [uploadClass, uploadCourse, uploadSession, uploadTerm]);

  const openCommentModal = async (student_id: string) => {
    setRowLoading(p => ({ ...p, [student_id]: 'comment' }));
    try {
      const r = await api.get<any>(endpoints.staff.attendance, { student_id, session: sessionFilter, term: termFilter });
      setCommentModal({ student_id, comment: r.data?.teacherComment || '' });
    } catch {
      setCommentModal({ student_id, comment: '' });
    } finally {
      setRowLoading(p => { const n = { ...p }; delete n[student_id]; return n; });
    }
  };

  // Auto-select session/term/class that has approved results
  useEffect(() => {
    api.get<any>(endpoints.public.approvedResultsMeta).then(r => {
      const meta = r.data;
      if (!sessionFilter && meta.sessions?.[0]) setSessionFilter(meta.sessions[0]);
      if (!termFilter && meta.terms?.[0]) setTermFilter(meta.terms[0]);
      if (!classFilter && meta.classes?.[0]) setClassFilter(meta.classes[0]);
    }).catch(() => {});
  }, []);

  const load = useCallback(() => {
    if (!classFilter) return;
    setLoading(true);
    api.get<any>(endpoints.staff.results, {
      class: classFilter,
      course: courseFilter || undefined,
      session: sessionFilter || undefined,
      term: termFilter || undefined,
      approved: approvalFilter || undefined,
    })
      .then(r => setResults(r.data ?? []))
      .catch(() => toast.error('Failed to load results'))
      .finally(() => setLoading(false));
  }, [classFilter, courseFilter, sessionFilter, termFilter, approvalFilter]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadCourse) return toast.error('Select a subject');
    if (!uploadClass) return toast.error('Select a class');
    const validRows = Object.entries(rows)
      .filter(([, v]) => v.test_score !== '' && v.exam_score !== '')
      .map(([student_id, v]) => ({ student_id, test_score: Number(v.test_score), exam_score: Number(v.exam_score) }));
    if (!validRows.length) return toast.error('Enter scores for at least one student');
    setSubmitting(true);
    try {
      await api.post(endpoints.staff.results, {
        course: uploadCourse,
        results: validRows,
      });
      toast.success('Results uploaded');
      setClassFilter(uploadClass);
      setShowUpload(false);
      setRows({});
      setUploadCourse('');
      setUploadClass('');
      setUploadStudents([]);
      load();
    } catch (e: any) { toast.error(e?.message ?? 'Failed to upload'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.post(`${endpoints.staff.results}/delete`, {
        course: confirmDelete.course,
        session: sessionFilter || undefined,
        term: termFilter || undefined,
        student_ids: [confirmDelete.student_id],
      });
      toast.success('Result deleted'); load();
    } catch { toast.error('Failed to delete'); }
    finally { setConfirmDelete(null); }
  };

  const handleComment = async () => {
    if (!commentModal) return;
    try {
      await api.post(endpoints.staff.comment, {
        student_id: commentModal.student_id,
        comment: commentModal.comment,
        session: sessionFilter,
        term: termFilter,
      });
      toast.success('Comment saved'); setCommentModal(null);
    } catch { toast.error('Failed to save comment'); }
  };

  const handleAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = Object.entries(attendanceRows)
      .filter(([, v]) => v.present !== '' || v.absent !== '')
      .map(([student_id, v]) => ({ student_id, present: Number(v.present) || 0, absent: Number(v.absent) || 0 }));
    if (!validRows.length) return toast.error('Enter attendance for at least one student');
    try {
      await api.post(endpoints.staff.attendance, {
        students: validRows,
        session: uploadSession || undefined,
        term: uploadTerm || undefined,
      });
      toast.success('Attendance updated');
      setAttendanceModal(false);
      setAttendanceClass('');
      setAttendanceStudents([]);
      setAttendanceRows({});
    } catch { toast.error('Failed to update attendance'); }
  };

  const AFFECTIVE_TRAITS = [
    { key: 'punctuality', label: 'Punctuality' },
    { key: 'perseverance', label: 'Perseverance' },
    { key: 'responsibility', label: 'Responsibility' },
    { key: 'diligence', label: 'Diligence' },
    { key: 'selfControl', label: 'Self Control' },
    { key: 'honesty', label: 'Honesty' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'attentiveness', label: 'Attentiveness' },
    { key: 'creativity', label: 'Creativity' },
    { key: 'curiosity', label: 'Curiosity' },
  ];
  const PSYCHOMOTOR_TRAITS = [
    { key: 'drawing', label: 'Drawing' },
    { key: 'physicalActivity', label: 'Physical Activity' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'handlingOfTools', label: 'Handling of Tools' },
    { key: 'mentalSkills', label: 'Mental Skills' },
  ];
  const ALL_TRAITS = [...AFFECTIVE_TRAITS, ...PSYCHOMOTOR_TRAITS];

  useEffect(() => {
    if (!traitsClass) { setTraitsStudents([]); setTraitsRows({}); return; }
    setLoadingTraits(true);
    api.get<any>(endpoints.staff.traits, { class: traitsClass, session: uploadSession || undefined, term: uploadTerm || undefined })
      .then(r => {
        const students: any[] = r.data ?? [];
        setTraitsStudents(students);
        const initial: Record<string, Record<string, number>> = {};
        students.forEach((s: any) => {
          const row: Record<string, number> = {};
          ALL_TRAITS.forEach(t => { row[t.key] = s[t.key] ?? 0; });
          initial[s.student_id] = row;
        });
        setTraitsRows(initial);
      })
      .catch(() => toast.error('Failed to load traits'))
      .finally(() => setLoadingTraits(false));
  }, [traitsClass, uploadSession, uploadTerm]);

  const handleSaveTraits = async (e: React.FormEvent) => {
    e.preventDefault();
    const traits = Object.entries(traitsRows).map(([student_id, vals]) => ({ student_id, ...vals }));
    if (!traits.length) return toast.error('No students loaded');
    setSubmittingTraits(true);
    try {
      await api.post(endpoints.staff.traits, { traits, session: uploadSession || undefined, term: uploadTerm || undefined });
      toast.success('Traits saved');
      setTraitsModal(false);
      setTraitsClass('');
      setTraitsStudents([]);
      setTraitsRows({});
    } catch { toast.error('Failed to save traits'); }
    finally { setSubmittingTraits(false); }
  };

  const getGrade = (total: number) => {
    if (total >= 70) return { g: 'A', cls: 'bg-green-100 text-green-700' };
    if (total >= 60) return { g: 'B', cls: 'bg-blue-100 text-blue-700' };
    if (total >= 50) return { g: 'C', cls: 'bg-yellow-100 text-yellow-700' };
    if (total >= 40) return { g: 'D', cls: 'bg-orange-100 text-orange-700' };
    return { g: 'F', cls: 'bg-red-100 text-red-700' };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Results</h1>
        <div className="flex gap-2">
          <button onClick={() => setAttendanceModal(true)}
            className="flex items-center gap-2 border border-blue-600 text-blue-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-50">
            <Upload size={16} /> Attendance
          </button>
          <button onClick={() => setTraitsModal(true)}
            className="flex items-center gap-2 border border-purple-600 text-purple-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-50">
            <Plus size={16} /> Traits
          </button>
          <button onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
            <Plus size={16} /> Upload Results
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl card shadow-sm p-4 flex flex-wrap gap-3">
        <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white">
          <option value="">Select Class</option>
          {classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white">
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={sessionFilter} onChange={e => setSessionFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white">
          <option value="">Current Session</option>
          {sessions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={termFilter} onChange={e => setTermFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white">
          <option value="">Current Term</option>
          {terms.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={approvalFilter} onChange={e => setApprovalFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white">
          <option value="">All Results</option>
          <option value="approved">Approved</option>
          <option value="pending">Not Verified</option>
        </select>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-2xl card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Student</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Subjects</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Average</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!classFilter ? (
                <tr><td colSpan={5}><EmptyState icon={Search} message="Select a class to view results." card={false} /></td></tr>
              ) : loading ? (
                [...Array(5)].map((_, i) => <tr key={i}><td colSpan={5} className="p-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>)
              ) : results.length === 0 ? (
                <tr><td colSpan={5}><EmptyState icon={FileBarChart2} message="No results found." card={false} /></td></tr>
              ) : (() => {
                // Group by student_id
                const grouped = new Map<string, any>();
                for (const r of results) {
                  if (!grouped.has(r.student_id)) {
                    grouped.set(r.student_id, { ...r, _rows: [] });
                  }
                  grouped.get(r.student_id)._rows.push(r);
                }
                return [...grouped.values()].map((s) => {
                  const avg = s._rows.length
                    ? Math.round(s._rows.reduce((sum: number, r: any) => sum + Number(r.test_score) + Number(r.exam_score), 0) / s._rows.length)
                    : 0;
                  const { g, cls } = getGrade(avg);
                  const approved = s._rows.every((r: any) => r.approvedAt);
                  return (
                    <tr key={s.student_id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <p className="font-medium text-gray-900">{s.firstname} {s.lastname}</p>
                        <p className="text-xs text-gray-400 font-mono">{s.student_id}</p>
                      </td>
                      <td className="p-3 text-gray-500 text-xs">{s._rows.length} subject{s._rows.length !== 1 ? 's' : ''}</td>
                      <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{avg}% · {g}</span></td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${approved ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {approved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setViewingStudent(s.student_id); }}
                            disabled={!!rowLoading[s.student_id]}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50" title="View Result">
                            {viewingStudent === s.student_id ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}
                          </button>
                          <button onClick={() => openCommentModal(s.student_id)}
                            disabled={!!rowLoading[s.student_id]}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50" title="Comment">
                            {rowLoading[s.student_id] === 'comment' ? <Loader2 size={15} className="animate-spin text-blue-600" /> : <MessageSquare size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl card shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">Upload Results</h2>
                {uploadSession && <p className="text-xs text-gray-400 mt-0.5">{uploadSession} — {uploadTerm} Term</p>}
              </div>
              <button onClick={() => { setShowUpload(false); setUploadClass(''); setUploadCourse(''); setUploadStudents([]); setRows({}); }}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleUpload} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
                  <select value={uploadClass} onChange={e => setUploadClass(e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white">
                    <option value="">Select class</option>
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                  <select value={uploadCourse} onChange={e => setUploadCourse(e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white">
                    <option value="">Select subject</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {!uploadClass ? (
                <p className="text-sm text-gray-400 text-center py-6">Select a class to load students.</p>
              ) : loadingUploadStudents ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
              ) : uploadStudents.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No students found in this class.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Student</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
                        <th className="p-3 text-center text-xs font-semibold text-gray-500 uppercase">CA (40)</th>
                        <th className="p-3 text-center text-xs font-semibold text-gray-500 uppercase">Exam (60)</th>
                        <th className="p-3 text-center text-xs font-semibold text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {uploadStudents.map((s: any) => {
                        const r = rows[s.student_id] ?? { test_score: '', exam_score: '' };
                        const ca = Number(r.test_score) || 0;
                        const exam = Number(r.exam_score) || 0;
                        const total = ca + exam;
                        return (
                          <tr key={s.student_id} className="hover:bg-gray-50">
                            <td className="p-3 font-medium text-gray-900">{s.firstname} {s.lastname}</td>
                            <td className="p-3 text-xs text-gray-400 font-mono">{s.student_id}</td>
                            <td className="p-2">
                              <input type="number" min={0} max={40} value={r.test_score}
                                onChange={e => setRows(prev => ({ ...prev, [s.student_id]: { ...prev[s.student_id], test_score: e.target.value } }))}
                                className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:border-blue-500" />
                            </td>
                            <td className="p-2">
                              <input type="number" min={0} max={60} value={r.exam_score}
                                onChange={e => setRows(prev => ({ ...prev, [s.student_id]: { ...prev[s.student_id], exam_score: e.target.value } }))}
                                className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:border-blue-500" />
                            </td>
                            <td className="p-3 text-center font-semibold text-gray-700">
                              {r.test_score || r.exam_score ? total : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting || !uploadClass || !uploadCourse}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                  {submitting ? 'Uploading…' : `Upload Results (${Object.values(rows).filter(r => r.test_score !== '' && r.exam_score !== '').length} students)`}
                </button>
                <button type="button" onClick={() => { setShowUpload(false); setUploadClass(''); setUploadCourse(''); setUploadStudents([]); setRows({}); }}
                  className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {commentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl card p-6 w-full max-w-md space-y-4">
            <h3 className="font-semibold text-gray-900">Teacher Comment</h3>
            <textarea value={commentModal.comment} onChange={e => setCommentModal(p => p ? { ...p, comment: e.target.value } : null)}
              rows={4} placeholder="Enter comment…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-3">
              <button onClick={handleComment} className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Save</button>
              <button onClick={() => setCommentModal(null)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {attendanceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl card shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">Update Attendance</h2>
                <div className="flex items-center gap-3 mt-0.5">
                  {uploadSession && <p className="text-xs text-gray-400">{uploadSession} — {uploadTerm} Term</p>}
                  {totalSchoolDays !== null
                    ? <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Total school days: {totalSchoolDays}</span>
                    : <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">No school days set by admin</span>}
                </div>
              </div>
              <button onClick={() => { setAttendanceModal(false); setAttendanceClass(''); setAttendanceStudents([]); setAttendanceRows({}); }}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleAttendance} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
                <select value={attendanceClass} onChange={e => setAttendanceClass(e.target.value)} required
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white">
                  <option value="">Select class</option>
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {!attendanceClass ? (
                <p className="text-sm text-gray-400 text-center py-6">Select a class to load students.</p>
              ) : loadingAttStudents ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
              ) : attendanceStudents.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No students found in this class.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Student</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
                        <th className="p-3 text-center text-xs font-semibold text-green-600 uppercase">Present</th>
                        <th className="p-3 text-center text-xs font-semibold text-red-500 uppercase">Absent (auto)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {attendanceStudents.map((s: any) => {
                        const r = attendanceRows[s.student_id] ?? { present: '', absent: '' };
                        const present = Number(r.present) || 0;
                        const absent = totalSchoolDays !== null && r.present !== ''
                          ? Math.max(0, totalSchoolDays - present)
                          : r.absent;
                        return (
                          <tr key={s.student_id} className="hover:bg-gray-50">
                            <td className="p-3 font-medium text-gray-900">{s.firstname} {s.lastname}</td>
                            <td className="p-3 text-xs text-gray-400 font-mono">{s.student_id}</td>
                            <td className="p-2">
                              <input type="number" min={0} max={totalSchoolDays ?? undefined} value={r.present}
                                onChange={e => {
                                  const val = e.target.value;
                                  const absentCalc = totalSchoolDays !== null && val !== ''
                                    ? String(Math.max(0, totalSchoolDays - Number(val)))
                                    : '';
                                  setAttendanceRows(prev => ({ ...prev, [s.student_id]: { present: val, absent: absentCalc } }));
                                }}
                                className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:border-green-500" />
                            </td>
                            <td className="p-3 text-center font-semibold text-red-500">
                              {r.present !== '' && totalSchoolDays !== null ? absent : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={!attendanceClass}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                  Save Attendance
                </button>
                <button type="button" onClick={() => { setAttendanceModal(false); setAttendanceClass(''); setAttendanceStudents([]); setAttendanceRows({}); }}
                  className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && <ConfirmModal onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />}

      {/* Traits Modal */}
      {traitsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl card shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">Affective &amp; Psychomotor Traits</h2>
                {uploadSession && <p className="text-xs text-gray-400 mt-0.5">{uploadSession} — {uploadTerm} Term · Score: 0–5</p>}
              </div>
              <button onClick={() => { setTraitsModal(false); setTraitsClass(''); setTraitsStudents([]); setTraitsRows({}); }}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSaveTraits} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
                <select value={traitsClass} onChange={e => setTraitsClass(e.target.value)} required
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 bg-white">
                  <option value="">Select class</option>
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {!traitsClass ? (
                <p className="text-sm text-gray-400 text-center py-6">Select a class to load students.</p>
              ) : loadingTraits ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
              ) : traitsStudents.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No students found.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="p-2 text-left font-semibold text-gray-600 min-w-[140px]">Student</th>
                        <th colSpan={AFFECTIVE_TRAITS.length} className="p-2 text-center font-semibold text-amber-700 bg-amber-50 border-x border-amber-100">
                          Affective Traits
                        </th>
                        <th colSpan={PSYCHOMOTOR_TRAITS.length} className="p-2 text-center font-semibold text-purple-700 bg-purple-50 border-x border-purple-100">
                          Psychomotor Traits
                        </th>
                      </tr>
                      <tr>
                        <th className="p-2 text-left font-semibold text-gray-500 uppercase">Name</th>
                        {AFFECTIVE_TRAITS.map(t => (
                          <th key={t.key} className="p-2 text-center font-semibold text-gray-500 uppercase bg-amber-50 whitespace-nowrap">{t.label}</th>
                        ))}
                        {PSYCHOMOTOR_TRAITS.map(t => (
                          <th key={t.key} className="p-2 text-center font-semibold text-gray-500 uppercase bg-purple-50 whitespace-nowrap">{t.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {traitsStudents.map((s: any) => {
                        const row = traitsRows[s.student_id] ?? {};
                        return (
                          <tr key={s.student_id} className="hover:bg-gray-50">
                            <td className="p-2 font-medium text-gray-900 whitespace-nowrap">{s.firstname} {s.lastname}</td>
                            {AFFECTIVE_TRAITS.map(t => (
                              <td key={t.key} className="p-1 bg-amber-50/40">
                                <input type="number" min={0} max={5} value={row[t.key] ?? 0}
                                  onChange={e => setTraitsRows(prev => ({ ...prev, [s.student_id]: { ...prev[s.student_id], [t.key]: Number(e.target.value) } }))}
                                  className="w-12 px-1 py-1 border border-gray-200 rounded-lg text-xs text-center focus:outline-none focus:border-amber-500" />
                              </td>
                            ))}
                            {PSYCHOMOTOR_TRAITS.map(t => (
                              <td key={t.key} className="p-1 bg-purple-50/40">
                                <input type="number" min={0} max={5} value={row[t.key] ?? 0}
                                  onChange={e => setTraitsRows(prev => ({ ...prev, [s.student_id]: { ...prev[s.student_id], [t.key]: Number(e.target.value) } }))}
                                  className="w-12 px-1 py-1 border border-gray-200 rounded-lg text-xs text-center focus:outline-none focus:border-purple-500" />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submittingTraits || !traitsClass || traitsStudents.length === 0}
                  className="flex-1 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-60">
                  {submittingTraits ? 'Saving…' : 'Save Traits'}
                </button>
                <button type="button" onClick={() => { setTraitsModal(false); setTraitsClass(''); setTraitsStudents([]); setTraitsRows({}); }}
                  className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Result View Modal */}
      {viewingStudent && (
        <StudentResultModal
          studentId={viewingStudent}
          session={sessionFilter}
          term={termFilter}
          school={school}
          onClose={() => setViewingStudent(null)}
        />
      )}
    </div>
  );
}

function StudentResultModal({ studentId, session, term, school, onClose }: { studentId: string; session: string; term: string; school?: SchoolProfile | null; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) { setLoading(false); return; }
    setLoading(true);
    api.get<any>(endpoints.staff.results, { 
      student_id: studentId, 
      session: session || undefined, 
      term: term || undefined 
    })
      .then(r => {
        if (Array.isArray(r.data)) {
          const filtered = r.data.filter((row: any) => row.student_id === studentId);
          setData({ results: filtered, student: filtered[0] ? {
            firstName: filtered[0].firstname,
            lastName: filtered[0].lastname,
            image: filtered[0].student?.user?.image,
            uniqueId: filtered[0].student_id,
          } : null });
        } else {
          setData(r.data);
        }
      })
      .finally(() => setLoading(false));
  }, [studentId, session, term]);

  const results: any[] = data?.results ?? [];
  const termLower = term.toLowerCase();
  const showFirst  = termLower === 'second' || termLower === 'third';
  const showSecond = termLower === 'third';
  const avg = results.length
    ? (results.reduce((s: number, r: any) => s + Number(r.testScore) + Number(r.examScore), 0) / results.length).toFixed(1)
    : '0';

  const gradeColor = (total: number) => {
    if (total >= 70) return 'bg-green-100 text-green-700';
    if (total >= 60) return 'bg-blue-100 text-blue-700';
    if (total >= 50) return 'bg-yellow-100 text-yellow-700';
    if (total >= 40) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-semibold text-gray-900">Result Sheet</h2>
            <p className="text-xs text-gray-500 font-mono">{studentId} — {session} · {term} Term</p>
          </div>
          <div className="flex items-center gap-2">
            {data && results.length > 0 && (
              <button onClick={() => printResultSheet(data, results, session, term, data.student, school)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-700">
                <Printer size={14} /> Print
              </button>
            )}
            <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="space-y-4 skeleton-stagger">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                  <div className="shimmer h-5 w-3/4" />
                  <div className="shimmer h-4 w-1/2" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="shimmer h-10 w-full" />
                    <div className="shimmer h-10 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : !results.length ? (
            <p className="text-center text-gray-500 py-12">No results found for this student.</p>
          ) : (
            <>
              {/* Student info  */}
              {data.student && (
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border-2 border-blue-200">
                    {getImageUrl(data.student.image)
                      ? <img src={getImageUrl(data.student.image)!} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-gray-400"><User size={22} /></div>}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{data.student.firstName} {data.student.lastName}</p>
                    <p className="text-xs text-gray-500 font-mono">{data.student.uniqueId}</p>
                    {data.class && <p className="text-xs text-blue-600 font-medium mt-0.5">{data.class}</p>}
                  </div>
                </div>
              )}
              {/* Results table */}
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase min-w-[140px]">Subject</th>
                      {showFirst  && <th className="px-3 py-3 text-center text-xs font-semibold bg-blue-700">1st</th>}
                      {showSecond && <th className="px-3 py-3 text-center text-xs font-semibold bg-green-700">2nd</th>}
                      <th className="px-3 py-3 text-center text-xs font-semibold uppercase">CA</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold uppercase">Exam</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold uppercase">Total</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold uppercase bg-purple-700">Cumul.</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold uppercase bg-amber-600">Avg</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold uppercase">Grade</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold uppercase">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {results.map((r: any, i: number) => {
                      const total = Number(r.testScore ?? r.test_score) + Number(r.examScore ?? r.exam_score);
                      return (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-bold text-gray-900 min-w-[140px]">{r.course ?? r.subject?.name}</td>
                          {showFirst  && <td className="px-3 py-2.5 text-center text-blue-700 bg-blue-50">{r.first_term_score ?? '-'}</td>}
                          {showSecond && <td className="px-3 py-2.5 text-center text-green-700 bg-green-50">{r.second_term_score ?? '-'}</td>}
                          <td className="px-3 py-2.5 text-center text-gray-600">{Number(r.testScore ?? r.test_score)}</td>
                          <td className="px-3 py-2.5 text-center text-gray-600">{Number(r.examScore ?? r.exam_score)}</td>
                          <td className="px-3 py-2.5 text-center font-semibold text-gray-900">{total}</td>
                          <td className="px-3 py-2.5 text-center text-purple-700 bg-purple-50">{r.cumulative ?? total}</td>
                          <td className="px-3 py-2.5 text-center text-amber-700 bg-amber-50">{r.average ?? total}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${gradeColor(total)}`}>{r.grade}</span>
                          </td>
                          <td className="px-3 py-2.5 text-center text-gray-500 text-xs">{r.remark}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-200 bg-blue-50">
                    <tr>
                      <td colSpan={showFirst && showSecond ? 4 : showFirst || showSecond ? 3 : 2} className="px-4 py-2.5 font-bold text-gray-700">Average</td>
                      <td className="px-3 py-2.5 text-center font-bold text-gray-900">{avg}%</td>
                      <td colSpan={4} />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Traits Display - Table Format */}
              {data?.trait && (
                <div className="grid sm:grid-cols-2 gap-6">
                  {/* Affective Traits */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-blue-600 text-white px-4 py-2.5">
                      <h3 className="text-sm font-bold uppercase tracking-wider">Affective Traits</h3>
                    </div>
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-gray-100">
                        {[
                          { label: 'Punctuality', value: data.trait.punctuality },
                          { label: 'Perseverance', value: data.trait.perseverance },
                          { label: 'Responsibility', value: data.trait.responsibility },
                          { label: 'Diligence', value: data.trait.diligence },
                          { label: 'Self Control', value: data.trait.selfControl },
                          { label: 'Honesty', value: data.trait.honesty },
                          { label: 'Attendance', value: data.trait.attendance },
                          { label: 'Attentiveness', value: data.trait.attentiveness },
                          { label: 'Creativity', value: data.trait.creativity },
                          { label: 'Curiosity', value: data.trait.curiosity },
                        ].map((trait) => (
                          <tr key={trait.label} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2 font-medium text-gray-700">{trait.label}</td>
                            <td className="px-4 py-2 text-right">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">{trait.value}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Psychomotor Traits */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-purple-600 text-white px-4 py-2.5">
                      <h3 className="text-sm font-bold uppercase tracking-wider">Psychomotor Traits</h3>
                    </div>
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-gray-100">
                        {[
                          { label: 'Drawing', value: data.trait.drawing },
                          { label: 'Physical Activity', value: data.trait.physicalActivity },
                          { label: 'Accuracy', value: data.trait.accuracy },
                          { label: 'Handling of Tools', value: data.trait.handlingOfTools },
                          { label: 'Mental Skills', value: data.trait.mentalSkills },
                        ].map((trait) => (
                          <tr key={trait.label} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2 font-medium text-gray-700">{trait.label}</td>
                            <td className="px-4 py-2 text-right">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-bold text-xs">{trait.value}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Teacher & Principal Comments */}
              {(data.teacher || data.principal) && (
                <div className="grid sm:grid-cols-2 gap-4">
                  {([
                    { key: 'teacherComment',   person: data.teacher,   title: "Teacher's Comment",  border: 'border-yellow-200', bg: 'bg-yellow-50' },
                    { key: 'principalComment', person: data.principal, title: "Principal's Comment", border: 'border-indigo-200', bg: 'bg-indigo-50' },
                  ] as const).map(({ key, person, title, border, bg }) => (
                    <div key={key} className={`rounded-xl border ${border} ${bg} p-4`}>
                      <div className="flex items-center gap-3 mb-2 pb-2 border-b border-black/10">
                        <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                          {getImageUrl(person?.image)
                            ? <img src={getImageUrl(person.image)!} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-gray-400"><User size={16} /></div>}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{person?.name ?? '—'}</p>
                          <p className="text-xs text-gray-500">{title.split("'")[0]}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 italic">
                        {data.attendance?.[key] ? `"${data.attendance[key]}"` : 'No comment entered yet.'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
