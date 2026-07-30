'use client';
import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Check, CheckCircle, Eye, FileBarChart2, Loader2, Printer, Search, User, X, XCircle } from 'lucide-react';
import { api, endpoints, getImageUrl } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/StateDisplay';
import { normalizeSchoolLogo, useSelectedSchool } from '@/hooks/useSelectedSchool';
import type { SchoolProfile } from '@/types';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

async function toBase64(url: string): Promise<string> {
  if (!url) return '';
  try {
    const absUrl = url.startsWith('http') ? url : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
    const res = await fetch(absUrl, { headers: { 'ngrok-skip-browser-warning': '1' } });
    if (!res.ok) return '';
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => resolve('');
      r.readAsDataURL(blob);
    });
  } catch { return ''; }
}

function gradeColorHex(g?: string) {
  if (g === 'A1') return '#16a34a';
  if (g === 'B2') return '#22c55e';
  if (g === 'B3') return '#3b82f6';
  if (g && ['C4', 'C5', 'C6'].includes(g)) return '#d97706';
  if (g === 'D7') return '#a855f7';
  if (g === 'E8') return '#6b7280';
  return '#dc2626';
}

async function printResultSheet(data: any, results: any[], session: string, term: string, school?: SchoolProfile | null) {
  const showFirst  = term.toLowerCase() === 'second' || term.toLowerCase() === 'third';
  const showSecond = term.toLowerCase() === 'third';

  const traitsHtml = data.trait ? (
    '<div class="traits-section"><div class="traits-title">Affective Traits</div><div class="traits-grid">' +
      ['Punctuality','Perseverance','Responsibility','Diligence','Self Control','Honesty','Attendance','Attentiveness','Creativity','Curiosity']
        .map(k => '<div class="trait-item"><span class="trait-label">' + k + '</span><span class="trait-score">' + (data.trait[k.replace(/ ./g, c => c.trim().toUpperCase())[0].toLowerCase() + k.slice(1).replace(/ ./g, c => c.trim().toUpperCase())] ?? data.trait[k.toLowerCase().replace(/ /g,'')]) + '/5</span></div>').join('') +
    '</div></div>' +
    '<div class="traits-section"><div class="traits-title">Psychomotor Traits</div><div class="traits-grid">' +
      [['Drawing', data.trait.drawing],['Physical Activity', data.trait.physicalActivity],['Accuracy', data.trait.accuracy],['Handling of Tools', data.trait.handlingOfTools],['Mental Skills', data.trait.mentalSkills]]
        .map(([l,v]) => '<div class="trait-item"><span class="trait-label">' + l + '</span><span class="trait-score">' + v + '/5</span></div>').join('') +
    '</div></div>'
  ) : '';

  const totalScore = results.reduce((s: number, r: any) => s + Number(r.totalScore ?? (Number(r.testScore ?? r.test_score) + Number(r.examScore ?? r.exam_score))), 0);
  const avg = results.length ? (totalScore / results.length).toFixed(1) : '0';

  const photoUrl          = getImageUrl(data.student?.image) ?? '';
  const teacherPhotoUrl   = getImageUrl(data.teacher?.image) ?? '';
  const principalPhotoUrl = getImageUrl(data.principal?.image) ?? '';
  const signatureUrl      = getImageUrl(data.signature) ?? '';
  const logoUrl = normalizeSchoolLogo(school?.logo) || '';
  const primary = school?.primaryColor || '#1d4ed8';
  const schoolName = school?.name || 'School Portal';
  const schoolSlogan = school?.slogan || school?.motto || '';

  const [logoB64, photoB64, sigB64, teacherB64, principalB64] = await Promise.all([
    toBase64(logoUrl), toBase64(photoUrl), toBase64(signatureUrl),
    toBase64(teacherPhotoUrl), toBase64(principalPhotoUrl),
  ]);

  const present = Number(data.attendance?.present || 0);
  const absent  = Number(data.attendance?.absent  || 0);
  const totalDays = present + absent;
  const attendanceRate = totalDays > 0 ? ((present / totalDays) * 100).toFixed(1) : '0';

  const win = window.open('', '_blank');
  if (!win) { alert('Pop-up blocked. Please allow pop-ups and try again.'); return; }

  const html = `<!DOCTYPE html><html><head>
  <title>Result — ${data.student?.firstName} ${data.student?.lastName}</title>
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
      <div><div style="color:#666;font-size:7px;text-transform:uppercase">Name</div><div style="font-weight:600;font-size:10px">${data.student?.firstName} ${data.student?.lastName}</div></div>
      <div><div style="color:#666;font-size:7px;text-transform:uppercase">Student ID</div><div style="font-weight:600;font-size:10px">${data.student?.uniqueId || ''}</div></div>
      <div><div style="color:#666;font-size:7px;text-transform:uppercase">Class</div><div style="font-weight:600;font-size:10px">${data.class || 'N/A'}</div></div>
      <div><div style="color:#666;font-size:7px;text-transform:uppercase">Class Size</div><div style="font-weight:600;font-size:10px">${data.class_size || 'N/A'}</div></div>
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
        <td>${i + 1}</td><td class="sn">${r.course ?? r.subject?.name}</td>
        ${showFirst  ? `<td style="background:#eff6ff">${r.first_term_score ?? '-'}</td>` : ''}
        ${showSecond ? `<td style="background:#f0fdf4">${r.second_term_score ?? '-'}</td>` : ''}
        <td>${r.testScore ?? r.test_score}</td><td>${r.examScore ?? r.exam_score}</td>
        <td style="font-weight:700;color:${total >= 40 ? '#166534' : '#dc2626'}">${total}</td>
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
  ${traitsHtml}
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
    <div class="sig"><div class="date-val">${data.teacher?.name || '___________________________'}</div><div class="ttl">Class Teacher</div></div>
    <div class="sig">
      ${sigB64 ? `<img src="${sigB64}" class="sig-img" alt="Signature">` : ''}
      <div class="date-val">${data.principal?.name || '___________________________'}</div>
      <div class="ttl">Principal</div>
    </div>
  </div>
</div></body></html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

interface ClassItem { id: string; class: string; }
interface SessionItem { id: string; session: string; current: boolean; }
interface StudentResult { student_id: string; firstname: string; lastname: string; [key: string]: any; }
interface ClassResultStat {
  className: string;
  students: number;
  average: number;
  approved: number;
  pending: number;
  subjects: number;
}

interface InitData {
  students: StudentResult[];
  classes: ClassItem[];
  sessions: SessionItem[];
  current_session: string;
  current_term: string;
}

export default function AdminResults() {
  const [init, setInit] = useState<InitData | null>(null);
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [approving, setApproving] = useState<Record<string, boolean>>({});
  const [bulkApproving, setBulkApproving] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<Array<{ id: string; status: 'pending' | 'approved' | 'failed' }>>([]);
  const [viewingStudent, setViewingStudent] = useState<string | null>(null);
  const toast = useToast();

  const TERMS = ['FIRST', 'SECOND', 'THIRD'];
  const chartColors = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#dc2626'];

  useEffect(() => {
    api.get<{ success: boolean; data: InitData }>(endpoints.admin.results)
      .then((r) => {
        setInit(r.data);
        setStudents(r.data.students ?? []);
        setSelectedSession(r.data.current_session);
        setSelectedTerm(r.data.current_term);
      })
      .catch(() => toast.error('Failed to load results'))
      .finally(() => setLoading(false));
  }, []);

  const fetchResults = async () => {
    setFetching(true);
    try {
      const r = await api.get<{ success: boolean; data: any }>(endpoints.admin.results, {
        ...(selectedClass ? { class: selectedClass } : {}),
        session: selectedSession,
        term: selectedTerm,
      });
      setStudents(r.data?.students ?? []);
      setSelected([]);
    } catch { toast.error('Failed to fetch results'); }
    finally { setFetching(false); }
  };

  const approve = async (studentId: string) => {
    setApproving(p => ({ ...p, [studentId]: true }));
    try {
      await api.put(endpoints.admin.resultApprove(studentId), { session: selectedSession, term: selectedTerm });
      toast.success('Approved');
      fetchResults();
    } catch { toast.error('Failed to approve'); }
    finally { setApproving(p => { const n = { ...p }; delete n[studentId]; return n; }); }
  };

  const bulkApprove = async () => {
    if (!selected.length) return;
    setBulkApproving(true);
    setBulkProgress(selected.map(id => ({ id, status: 'pending' as const })));
    let approved = 0;
    for (const id of [...selected]) {
      try {
        await api.put(endpoints.admin.resultApprove(id), { session: selectedSession, term: selectedTerm });
        setBulkProgress(p => p.map(x => x.id === id ? { ...x, status: 'approved' } : x));
        approved++;
      } catch {
        setBulkProgress(p => p.map(x => x.id === id ? { ...x, status: 'failed' } : x));
      }
    }
    setBulkApproving(false);
    setSelected([]);
    toast.success(`${approved} of ${selected.length} approved`);
    fetchResults();
  };

  const toggleSelect = (id: string) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const classStats = useMemo<ClassResultStat[]>(() => {
    const grouped = new Map<string, { students: number; totalAverage: number; approved: number; pending: number; subjects: number }>();
    students.forEach((student) => {
      const className = student.class || 'Unassigned';
      const current = grouped.get(className) ?? { students: 0, totalAverage: 0, approved: 0, pending: 0, subjects: 0 };
      const isApproved = student.approved == 1 || student.approved === true || student.approved === '1';
      current.students += 1;
      current.totalAverage += Number(student.average) || 0;
      current.subjects += Number(student.subject_count) || 0;
      if (isApproved) current.approved += 1;
      else current.pending += 1;
      grouped.set(className, current);
    });
    return Array.from(grouped.entries())
      .map(([className, stat]) => ({
        className,
        students: stat.students,
        average: stat.students ? Math.round((stat.totalAverage / stat.students) * 10) / 10 : 0,
        approved: stat.approved,
        pending: stat.pending,
        subjects: stat.subjects,
      }))
      .sort((a, b) => a.className.localeCompare(b.className));
  }, [students]);

  const approvedTotal = classStats.reduce((sum, item) => sum + item.approved, 0);
  const pendingTotal = classStats.reduce((sum, item) => sum + item.pending, 0);
  const overallAverage = classStats.length
    ? Math.round((classStats.reduce((sum, item) => sum + item.average * item.students, 0) / students.length) * 10) / 10
    : 0;
  const performanceBands = useMemo(() => {
    const bands = [
      { name: 'Excellent (A1)', value: 0 }, { name: 'Good (B)', value: 0 }, { name: 'Credit (C)', value: 0 },
      { name: 'Pass (D7/E8)', value: 0 }, { name: 'Fail (F9)', value: 0 },
    ];
    students.forEach((student) => {
      const avg = Number(student.average) || 0;
      if (avg >= 75) bands[0].value += 1;
      else if (avg >= 65) bands[1].value += 1;
      else if (avg >= 50) bands[2].value += 1;
      else if (avg >= 40) bands[3].value += 1;
      else bands[4].value += 1;
    });
    return bands;
  }, [students]);

  if (loading) return <div className="h-64 bg-gray-200 rounded-2xl animate-pulse" />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Results</h1>

      {/* Filters */}
      <div className="bg-white rounded-2xl card shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-36">
          <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500">
            <option value="">All classes</option>
            {(init?.classes ?? []).filter(c => c.class !== 'none').map(c => (
              <option key={c.id} value={c.class}>{c.class}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-36">
          <label className="block text-xs font-medium text-gray-600 mb-1">Session</label>
          <select value={selectedSession} onChange={e => setSelectedSession(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500">
            {(init?.sessions ?? []).map(s => (
              <option key={s.id} value={s.session}>{s.session}{s.current ? ' (current)' : ''}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-32">
          <label className="block text-xs font-medium text-gray-600 mb-1">Term</label>
          <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500">
            {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button onClick={fetchResults} disabled={fetching}
          className="px-5 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-60">
          {fetching ? 'Loading…' : 'Search'}
        </button>
        {selected.length > 0 && (
          <button onClick={bulkApprove}
            className="flex items-center gap-2 px-4 py-2 btn-brand text-white rounded-xl text-sm font-medium ">
            <CheckCircle size={16} /> Approve {selected.length}
          </button>
        )}
      </div>

      {bulkApproving && bulkProgress.length > 0 && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-5 border-b">
              <h2 className="font-semibold text-gray-900">Approving Results</h2>
              <p className="text-xs text-gray-500">Please wait while results are being approved...</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {bulkProgress.map(({ id, status }) => {
                const student = students.find(s => s.student_id === id) || init?.students.find(s => s.student_id === id);
                const name = student ? `${student.firstname} ${student.lastname}` : id;
                return (
                  <div key={id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <span className="text-sm font-medium text-gray-800 truncate">{name}</span>
                    <span className="ml-3 flex-shrink-0">
                      {status === 'pending' && <Loader2 size={18} className="animate-spin text-purple-500" />}
                      {status === 'approved' && <CheckCircle size={18} className="text-green-600" />}
                      {status === 'failed' && <XCircle size={18} className="text-red-600" />}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t bg-gray-50 rounded-b-2xl">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(bulkProgress.filter(x => x.status !== 'pending').length / bulkProgress.length) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 text-right">
                {bulkProgress.filter(x => x.status === 'approved').length} / {bulkProgress.length} approved
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl card shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-3 w-10"><input type="checkbox"
                checked={selected.length === students.length && students.length > 0}
                onChange={() => setSelected(selected.length === students.length ? [] : students.map(s => s.student_id))} /></th>
              <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Student</th>
              <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
              <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {students.length === 0 ? (
              <tr><td colSpan={5}>
                <EmptyState
                  icon={selectedClass ? FileBarChart2 : Search}
                  message={selectedClass ? 'No results found for this filter.' : 'Select a class and click Search.'}
                  card={false}
                />
              </td></tr>
            ) : students.map((s) => (
              <tr key={s.student_id} className="hover:bg-gray-50">
                <td className="p-3"><input type="checkbox" checked={selected.includes(s.student_id)} onChange={() => toggleSelect(s.student_id)} /></td>
                <td className="p-3 font-medium text-gray-900">{s.firstname} {s.lastname}</td>
                <td className="p-3 text-gray-500 font-mono text-xs">{s.student_id}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.approved == 1 || s.approved === true || s.approved === '1' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {s.approved == 1 || s.approved === true || s.approved === '1' ? 'Approved' : 'Pending'}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setViewingStudent(s.student_id)}
                      className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="View Result">
                      <Eye size={18} />
                    </button>
                    {s.approved == 1 || s.approved === true || s.approved === '1' ? (
                      <span className="text-green-500" title="Verified"><BadgeCheck size={18} /></span>
                    ) : (
                      <button onClick={() => approve(s.student_id)} disabled={approving[s.student_id]} className="text-blue-600 hover:text-blue-800 disabled:opacity-50" title="Verify">
                        {approving[s.student_id] ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {students.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase">Classes</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{classStats.length}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase">Students</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{students.length}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase">Overall Average</p>
              <p className="mt-1 text-2xl font-bold text-blue-700">{overallAverage}%</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase">Approval</p>
              <p className="mt-1 text-2xl font-bold text-green-700">{approvedTotal}/{students.length}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="mb-3">
                <h2 className="font-semibold text-gray-900">Class Average Performance</h2>
                <p className="text-xs text-gray-500">{selectedSession} · {selectedTerm} Term</p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classStats} margin={{ top: 8, right: 12, left: -18, bottom: 42 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="className" interval={0} angle={-30} textAnchor="end" height={58} tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => [`${value}%`, 'Average']} />
                    <Bar dataKey="average" radius={[6, 6, 0, 0]} fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="mb-3">
                <h2 className="font-semibold text-gray-900">Approval Status</h2>
                <p className="text-xs text-gray-500">Approved vs pending result sets</p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Approved', value: approvedTotal },
                        { name: 'Pending', value: pendingTotal },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={92}
                      paddingAngle={4}
                    >
                      <Cell fill="#16a34a" />
                      <Cell fill="#d97706" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-green-50 px-3 py-2 text-green-700">Approved: <strong>{approvedTotal}</strong></div>
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-amber-700">Pending: <strong>{pendingTotal}</strong></div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="mb-3">
                <h2 className="font-semibold text-gray-900">Performance Bands</h2>
                <p className="text-xs text-gray-500">Student averages grouped by range</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceBands} margin={{ top: 8, right: 12, left: -18, bottom: 42 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" interval={0} angle={-25} textAnchor="end" height={58} tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {performanceBands.map((_, index) => <Cell key={index} fill={chartColors[index]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm overflow-hidden">
              <div className="mb-3">
                <h2 className="font-semibold text-gray-900">Class Snapshot</h2>
                <p className="text-xs text-gray-500">A quick scan of every class with uploaded results</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-gray-500 border-b">
                    <tr>
                      <th className="py-2 font-semibold">Class</th>
                      <th className="py-2 font-semibold">Students</th>
                      <th className="py-2 font-semibold">Average</th>
                      <th className="py-2 font-semibold">Approved</th>
                      <th className="py-2 font-semibold">Pending</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {classStats.map((item) => (
                      <tr key={item.className}>
                        <td className="py-2 font-medium text-gray-900">{item.className}</td>
                        <td className="py-2 text-gray-600">{item.students}</td>
                        <td className="py-2 font-semibold text-blue-700">{item.average}%</td>
                        <td className="py-2 text-green-700">{item.approved}</td>
                        <td className="py-2 text-amber-700">{item.pending}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingStudent && (
        <StudentResultModal
          studentId={viewingStudent}
          session={selectedSession}
          term={selectedTerm}
          onClose={() => setViewingStudent(null)}
        />
      )}
    </div>
  );
}

function StudentResultModal({ studentId, session, term, onClose }: { studentId: string; session: string; term: string; onClose: () => void }) {
  const { school } = useSelectedSchool();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingComment, setSavingComment] = useState(false);
  const [principalComment, setPrincipalComment] = useState('');
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    setPrincipalComment('');
    api.get<any>(endpoints.admin.resultStudent(studentId), {
      session: session || undefined,
      term: term || undefined,
    })
      .then(r => {
        setData(r.data);
        setPrincipalComment(r.data?.attendance?.principalComment || '');
      })
      .finally(() => setLoading(false));
  }, [studentId, session, term]);

  const savePrincipalComment = async () => {
    setSavingComment(true);
    try {
      await api.put(endpoints.admin.resultPrincipalComment(studentId), { session, term, principal_comment: principalComment });
      setData((prev: any) => ({ ...prev, attendance: { ...prev?.attendance, principalComment: principalComment } }));
    } catch { toast.error('Failed to save comment'); }
    finally { setSavingComment(false); }
  };

  const results: any[] = data?.results ?? [];
  const termLower = term.toLowerCase();
  const showFirst = termLower === 'second' || termLower === 'third';
  const showSecond = termLower === 'third';
  const avg = results.length
    ? (results.reduce((sum: number, r: any) => sum + Number(r.average ?? Number(r.testScore ?? r.test_score) + Number(r.examScore ?? r.exam_score)), 0) / results.length).toFixed(1)
    : '0';

  const gradeColor = (grade: string) => {
    if (grade === 'A1') return 'bg-green-100 text-green-700';
    if (grade === 'B2') return 'bg-green-100 text-green-600';
    if (grade === 'B3') return 'bg-blue-100 text-blue-700';
    if (['C4','C5','C6'].includes(grade)) return 'bg-yellow-100 text-yellow-700';
    if (grade === 'D7') return 'bg-purple-100 text-purple-700';
    if (grade === 'E8') return 'bg-gray-100 text-gray-600';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-semibold text-gray-900">Result Sheet</h2>
            <p className="text-xs text-gray-500 font-mono">{studentId} - {session} · {term} Term</p>
          </div>
          <div className="flex items-center gap-2">
            {data && results.length > 0 && (
              <button
                onClick={() => printResultSheet(data, results, session, term, school)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-700 transition-colors"
              >
                <Printer size={14} /> Print
              </button>
            )}
            <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />)}
            </div>
          ) : !results.length ? (
            <p className="text-center text-gray-500 py-12">No results found for this student.</p>
          ) : (
            <>
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

              {data.attendance && (
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Days Present', value: data.attendance.present ?? 0, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
                    { label: 'Days Absent',  value: data.attendance.absent  ?? 0, color: 'text-red-700',   bg: 'bg-red-50 border-red-200' },
                    { label: 'Total Days',   value: Number(data.attendance.present ?? 0) + Number(data.attendance.absent ?? 0), color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
                    { label: 'Attendance %', value: (Number(data.attendance.present ?? 0) + Number(data.attendance.absent ?? 0)) > 0
                        ? `${((Number(data.attendance.present ?? 0) / (Number(data.attendance.present ?? 0) + Number(data.attendance.absent ?? 0))) * 100).toFixed(1)}%`
                        : '0%', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} className={`rounded-xl border p-3 text-center ${bg}`}>
                      <p className={`text-xl font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              )}


              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase min-w-[140px]">Subject</th>
                      {showFirst && <th className="px-3 py-3 text-center text-xs font-semibold bg-blue-700">1st</th>}
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
                      const cumulative = Number(r.cumulative ?? total);
                      const average = Number(r.average ?? cumulative);
                      return (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-bold text-gray-900 min-w-[140px]">{r.course ?? r.subject?.name}</td>
                          {showFirst && <td className="px-3 py-2.5 text-center text-blue-700 bg-blue-50">{r.first_term_score ?? '-'}</td>}
                          {showSecond && <td className="px-3 py-2.5 text-center text-green-700 bg-green-50">{r.second_term_score ?? '-'}</td>}
                          <td className="px-3 py-2.5 text-center text-gray-600">{Number(r.testScore ?? r.test_score)}</td>
                          <td className="px-3 py-2.5 text-center text-gray-600">{Number(r.examScore ?? r.exam_score)}</td>
                          <td className="px-3 py-2.5 text-center font-semibold text-gray-900">{total}</td>
                          <td className="px-3 py-2.5 text-center text-purple-700 bg-purple-50">{cumulative}</td>
                          <td className="px-3 py-2.5 text-center text-amber-700 bg-amber-50">{average}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${gradeColor(r.grade)}`}>{r.grade}</span>
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

              {data?.trait && (
                <div className="grid sm:grid-cols-2 gap-6">
                  <TraitTable title="Affective Traits" color="blue" items={[
                    ['Punctuality', data.trait.punctuality], ['Perseverance', data.trait.perseverance],
                    ['Responsibility', data.trait.responsibility], ['Diligence', data.trait.diligence],
                    ['Self Control', data.trait.selfControl], ['Honesty', data.trait.honesty],
                    ['Attendance', data.trait.attendance], ['Attentiveness', data.trait.attentiveness],
                    ['Creativity', data.trait.creativity], ['Curiosity', data.trait.curiosity],
                  ]} />
                  <TraitTable title="Psychomotor Traits" color="purple" items={[
                    ['Drawing', data.trait.drawing], ['Physical Activity', data.trait.physicalActivity],
                    ['Accuracy', data.trait.accuracy], ['Handling of Tools', data.trait.handlingOfTools],
                    ['Mental Skills', data.trait.mentalSkills],
                  ]} />
                </div>
              )}

              {(data.teacher || data.principal) && (
                <div className="grid sm:grid-cols-2 gap-4">
                  {([
                    { key: 'teacherComment', person: data.teacher, title: "Teacher's Comment", border: 'border-yellow-200', bg: 'bg-yellow-50' },
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
                          <p className="text-sm font-bold text-gray-900">{person?.name ?? '-'}</p>
                          <p className="text-xs text-gray-500">{title.split("'")[0]}</p>
                        </div>
                      </div>
                      {key === 'principalComment' ? (
                        <textarea
                          value={principalComment}
                          onChange={(e) => setPrincipalComment(e.target.value)}
                          className="w-full rounded border border-gray-200 p-2 text-sm focus:outline-none focus:border-purple-500"
                          rows={3}
                          placeholder="Enter principal's comment"
                        />
                      ) : (
                        <p className="text-sm text-gray-700 italic">
                          {data.attendance?.[key] ? `"${data.attendance[key]}""` : 'No comment entered yet.'}
                        </p>
                      )}
                      {key === 'principalComment' && (
                        <div className="mt-2 flex items-end justify-between gap-4">
                          {getImageUrl(data.signature) ? (
                            <div className="flex flex-col items-center gap-1">
                              <img
                                src={getImageUrl(data.signature)!}
                                alt="Principal Signature"
                                className="h-10 w-auto object-contain border-b border-gray-400 pb-1"
                              />
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Signature</p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <div className="h-10 w-32 border-b border-gray-400" />
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Signature</p>
                            </div>
                          )}
                          <button
                            onClick={savePrincipalComment}
                            disabled={savingComment}
                            className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-60"
                          >
                            {savingComment ? 'Saving…' : 'Save Comment'}
                          </button>
                        </div>
                      )}
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

function TraitTable({ title, color, items }: { title: string; color: 'blue' | 'purple'; items: [string, any][] }) {
  const header = color === 'blue' ? 'bg-blue-600' : 'bg-purple-600';
  const badge = color === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700';
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className={`${header} text-white px-4 py-2.5`}>
        <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>
      </div>
      <table className="w-full text-xs">
        <tbody className="divide-y divide-gray-100">
          {items.map(([label, value]) => (
            <tr key={label} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-2 font-medium text-gray-700">{label}</td>
              <td className="px-4 py-2 text-right">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${badge} font-bold text-xs`}>{value}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
