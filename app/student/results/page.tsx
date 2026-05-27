'use client';
import { EmptyState, LoadingState } from '@/components/ui/StateDisplay';
import { useToast } from '@/components/ui/Toast';
import { normalizeSchoolLogo, useSelectedSchool } from '@/hooks/useSelectedSchool';
import { api, endpoints, getImageUrl } from '@/lib/api';
import { auth } from '@/lib/auth';
import type { ApiResponse, SchoolProfile } from '@/types';
import clsx from 'clsx';
import { BarChart2, BookOpen, CheckCircle2, Clock, FileBarChart2, Printer, Search, User, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

const UPLOADS = typeof window !== 'undefined' ? `${window.location.origin}/api/uploads` : '/api/uploads';

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

function gradeColor(g: string) {
  if (g === 'A1') return '#16a34a';
  if (g === 'B2') return '#22c55e';
  if (g === 'B3') return '#3b82f6';
  if (['C4','C5','C6'].includes(g)) return '#d97706';
  if (g === 'D7') return '#a855f7';
  if (g === 'E8') return '#6b7280';
  return '#dc2626';
}

async function printResultSheet(data: any, results: any[], session: string, term: string, user: any, school?: SchoolProfile | null) {
  const showFirst  = term.toLowerCase() === 'second' || term.toLowerCase() === 'third';
  const showSecond = term.toLowerCase() === 'third';

  const totalScore = results.reduce((s: number, r: any) => s + Number(r.totalScore), 0);
  const avg = results.length ? (totalScore / results.length).toFixed(1) : '0';

  const photoUrl = user?.image ? `${UPLOADS}/${user.image}` : '';
  const teacherPhotoUrl = data.teacher?.image ? `${UPLOADS}/${data.teacher.image}` : '';
  const principalPhotoUrl = data.principal?.image ? `${UPLOADS}/${data.principal.image}` : '';

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
  <title>Result — ${user?.firstName} ${user?.lastName}</title>
  <style>
    @page{size:A4;margin:8mm}*{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:10px;background:#fff}
    .hdr{text-align:center;margin-bottom:6px;padding-bottom:4px;border-bottom:2px solid ${primary}}
    .hdr h1{color:${primary};font-size:16px;margin-bottom:2px}
    .info-bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;padding:6px 10px;background:#eff6ff;border-radius:4px;border:1px solid #bfdbfe}
    .stats{display:flex;gap:8px}
    .stat{text-align:center;padding:3px 8px;background:#fff;border-radius:4px;border:1px solid #e2e8f0}
    .stat .n{font-size:12px;font-weight:700;color:${primary}}.stat .l{font-size:6px;color:#666;text-transform:uppercase}
    table{width:100%;border-collapse:collapse;font-size:9px;margin-bottom:6px}
    th{background:${primary};color:#fff;padding:4px 3px;font-size:8px;text-transform:uppercase}
    td{padding:4px 3px;text-align:center;border-bottom:1px solid #e5e7eb}
    tr:nth-child(even){background:#f9fafb}
    .sn{text-align:left!important;font-weight:500}
    .badge{display:inline-block;padding:2px 6px;border-radius:4px;font-weight:700;font-size:8px;color:#fff}
    .att{display:flex;gap:20px;margin-bottom:6px;padding:6px 10px;background:#eff6ff;border-radius:4px;border:1px solid #bfdbfe}
    .att-item{text-align:center}.att-item .n{font-size:12px;font-weight:700}.att-item .l{font-size:7px;color:#666;text-transform:uppercase}
    .cmts{display:flex;gap:10px;margin-bottom:8px}
    .cmt{flex:1;padding:6px;border-radius:4px;border:1px solid #e5e7eb}
    .cmt.t{background:#fefce8;border-color:#fde047}.cmt.p{background:#eef2ff;border-color:#a5b4fc}
    .cmt .ttl{font-size:8px;font-weight:700;text-transform:uppercase;margin-bottom:3px}
    .cmt .txt{font-size:9px;color:#555;font-style:italic}
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
      <div style="text-align:left">
        <div style="color:${primary};font-size:17px;font-weight:700">${schoolName}</div>
        <div style="color:#555;font-size:9px">${schoolSlogan}</div>
      </div>
    </div>
    <div style="margin-top:5px;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;padding:3px 12px;display:inline-block">
      <p style="color:#374151;font-weight:500;font-size:10px">Comprehensive Analysis of Assessment</p>
    </div>
    <div style="margin-top:5px;display:flex;justify-content:center;gap:15px;font-size:9px">
      <span><strong>Session:</strong> ${session}</span>
      <span><strong>Term:</strong> ${term} Term</span>
    </div>
  </div>

  <div class="info-bar">
    ${photoB64 ? `<img src="${photoB64}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid ${primary};margin-right:10px">` : ''}
    <div style="display:flex;gap:15px">
      <div><div style="color:#666;font-size:7px;text-transform:uppercase">Name</div><div style="font-weight:600;font-size:10px">${user?.firstName} ${user?.lastName}</div></div>
      <div><div style="color:#666;font-size:7px;text-transform:uppercase">Student ID</div><div style="font-weight:600;font-size:10px">${user?.uniqueId || ''}</div></div>
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

  <table>
    <thead><tr>
      <th style="width:20px">S/N</th><th style="text-align:left">Subject</th>
      ${showFirst  ? '<th style="background:#3b82f6">1st Term</th>' : ''}
      ${showSecond ? '<th style="background:#22c55e">2nd Term</th>' : ''}
      <th>CA (40)</th><th>Exam (60)</th><th>Total</th>
      <th style="background:#7c3aed">Cumulative</th><th style="background:#d97706">Average</th>
      <th>Grade</th><th>Remark</th>
    </tr></thead>
    <tbody>
      ${results.map((r: any, i: number) => {
        const total = Number(r.totalScore);
        const gc = gradeColor(r.grade);
        return `<tr>
          <td>${i + 1}</td><td class="sn">${r.course}</td>
          ${showFirst  ? `<td style="background:#eff6ff">${r.first_term_score ?? '-'}</td>` : ''}
          ${showSecond ? `<td style="background:#f0fdf4">${r.second_term_score ?? '-'}</td>` : ''}
          <td>${r.testScore}</td><td>${r.examScore}</td>
          <td style="font-weight:700;color:${total >= 50 ? '#166534' : '#dc2626'}">${total}</td>
          <td style="background:#f5f3ff;font-weight:600">${r.cumulative ?? total}</td>
          <td style="background:#fffbeb;font-weight:600">${r.average ?? total}</td>
          <td><span class="badge" style="background:${gc}">${r.grade}</span></td>
          <td><span style="font-size:7px;padding:2px 5px;border-radius:6px;background:${r.grade==='F9'?'#fee2e2':'#dcfce7'};color:${r.grade==='F9'?'#dc2626':'#166534'}">${r.remark}</span></td>
        </tr>`;
      }).join('')}
      <tr class="sum">
        <td colspan="2" style="text-align:left">TOTAL / AVG</td>
        ${showFirst ? '<td>-</td>' : ''}${showSecond ? '<td>-</td>' : ''}
        <td>-</td><td>-</td><td>${totalScore}/${results.length * 100}</td>
        <td>-</td><td style="font-weight:700">${avg}%</td><td>-</td><td>-</td>
      </tr>
    </tbody>
  </table>

  <div class="scale">
    ${[['A1','75-100','Excellent','#16a34a'],['B2','70-74','V.Good','#22c55e'],['B3','65-69','Good','#3b82f6'],
       ['C4','60-64','Credit','#60a5fa'],['C5','55-59','Credit','#eab308'],['C6','50-54','Credit','#d97706'],
       ['D7','45-49','Pass','#a855f7'],['E8','40-44','Pass','#6b7280'],['F9','0-39','Fail','#dc2626']]
      .map(([g,r,d,c]) => '<div class="sc-item"><span class="c" style="background:' + c + '">' + g + '</span><div class="r">' + r + '</div><div class="d">' + d + '</div></div>').join('')}
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
    ${data.teacher ? `<div class="cmt t"><div class="ttl">Teacher's Comment</div><div class="txt">"${data.teacher.comment || '—'}"</div></div>` : ''}
    ${data.principal ? `<div class="cmt p"><div class="ttl">Principal's Comment</div><div class="txt">"${data.principal.comment || '—'}"</div></div>` : ''}
  </div>

  <div class="foot">
    <div class="sig">
      ${teacherB64 ? `<img src="${teacherB64}" class="sig-img">` : ''}
      <div class="ttl">Teacher</div>
      <div class="date-val"></div>
    </div>
    <div class="sig">
      ${principalB64 ? `<img src="${principalB64}" class="sig-img">` : ''}
      <div class="ttl">Principal</div>
      <div class="date-val"></div>
    </div>
  </div>
</div></body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

const TERMS = ['FIRST', 'SECOND', 'THIRD'];

export default function StudentResults() {
  const { school } = useSelectedSchool();
  const [data, setData]       = useState<any>(null);
  const [sessions, setSessions] = useState<{ name: string }[]>([]);
  const [session, setSession] = useState('');
  const [term, setTerm]       = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    Promise.all([
      api.get<ApiResponse<any[]>>(endpoints.public.sessions),
      api.get<ApiResponse<{ session: string; term: string }>>(endpoints.public.currentPeriod),
    ]).then(([s, p]) => {
      setSessions(s.data);
      setSession(p.data.session);
      setTerm(p.data.term);
    }).catch(() => toast.error('Failed to load filters'));
  }, []);

  useEffect(() => {
    if (!session || !term) return;
    setLoading(true);
    setData(null);
    api.get<ApiResponse<any>>(endpoints.student.results, { session, term })
      .then((r) => setData(r.data))
      .catch((e) => toast.error(e?.message || 'No results found'))
      .finally(() => setLoading(false));
  }, [session, term]);

  const gradeColor = (grade: string) => {
    if (grade === 'A1') return 'text-green-700 bg-green-50';
    if (grade === 'B2') return 'text-green-600 bg-green-50';
    if (grade === 'B3') return 'text-blue-700 bg-blue-50';
    if (['C4', 'C5', 'C6'].includes(grade)) return 'text-amber-700 bg-amber-50';
    if (grade === 'D7') return 'text-purple-700 bg-purple-50';
    if (grade === 'E8') return 'text-gray-600 bg-gray-100';
    return 'text-red-700 bg-red-50'; // F9
  };

  const results: any[]   = data?.results ?? [];
  const termLower        = term.toLowerCase();
  const showFirst        = termLower === 'second' || termLower === 'third';
  const showSecond       = termLower === 'third';
  const avg = results.length
    ? Math.round(results.reduce((s: number, r: any) => s + Number(r.totalScore), 0) / results.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Results</h1>
        {data && results.length > 0 && (
          <button onClick={() => printResultSheet(data, results, session, term, auth.getUser(), school)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors print:hidden">
            <Printer size={16} /> Print
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 print:hidden">
        <select value={session} onChange={(e) => setSession(e.target.value)}
          className="border border-gray-300 rounded-xl px-4 py-2 text-sm text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white shadow-sm">
          {sessions.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
        </select>
        <select value={term} onChange={(e) => setTerm(e.target.value)}
          className="border border-gray-300 rounded-xl px-4 py-2 text-sm text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white shadow-sm">
          {TERMS.map((t) => <option key={t} value={t}>{t} Term</option>)}
        </select>
      </div>

      {/* Summary */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:hidden">
          {([
            { 
              label: 'Subjects', 
              value: results.length, 
              icon: BookOpen, 
              color: 'text-blue-600', 
              bg: 'bg-blue-50', 
              border: 'border-blue-100' 
            },
            { 
              label: 'Average', 
              value: String(avg) + '%', 
              icon: BarChart2, 
              color: 'text-blue-600', 
              bg: 'bg-blue-50', 
              border: 'border-blue-100' 
            },
            { 
              label: 'Class Size', 
              value: data.class_size, 
              icon: Users, 
              color: 'text-purple-600', 
              bg: 'bg-purple-50', 
              border: 'border-purple-100' 
            },
            { 
              label: 'Status', 
              value: data.approved ? 'Approved' : 'Pending', 
              icon: data.approved ? CheckCircle2 : Clock, 
              color: data.approved ? 'text-emerald-600' : 'text-amber-600', 
              bg: data.approved ? 'bg-emerald-50' : 'bg-amber-50', 
              border: data.approved ? 'border-emerald-100' : 'border-amber-100' 
            },
          ] as const).map(({ label, value, icon: Icon, color, bg, border }) => (
            <div key={label} className={'bg-white rounded-2xl card border ' + border + ' shadow-sm p-5 flex items-center gap-4'}>
              <div className={'w-11 h-11 rounded-xl ' + bg + ' flex items-center justify-center flex-shrink-0'}>
                <Icon size={20} className={color} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl card shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <LoadingState message="Loading results…" />
        ) : !data ? (
          <EmptyState icon={Search} message="Select a session and term to view results." card={false} />
        ) : results.length === 0 ? (
          <EmptyState icon={FileBarChart2} message={'No results for ' + term + ' Term, ' + session + '.'} card={false} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Subject</th>
                  {showFirst  && <th className="px-3 py-3 text-center text-xs font-semibold btn-brand">1st Term</th>}
                  {showSecond && <th className="px-3 py-3 text-center text-xs font-semibold btn-brand">2nd Term</th>}
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase">CA (40)</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase">Exam (60)</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase">Total</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase bg-purple-700">Cumul.</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase bg-amber-600">Avg</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase">Grade</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {results.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.course}</td>
                    {showFirst  && <td className="px-3 py-3 text-center text-blue-700 bg-blue-50">{r.first_term_score ?? '-'}</td>}
                    {showSecond && <td className="px-3 py-3 text-center text-blue-700 bg-blue-50">{r.second_term_score ?? '-'}</td>}
                    <td className="px-3 py-3 text-center text-gray-600">{r.testScore}</td>
                    <td className="px-3 py-3 text-center text-gray-600">{r.examScore}</td>
                    <td className="px-3 py-3 text-center font-semibold text-gray-900">{r.totalScore}</td>
                    <td className="px-3 py-3 text-center font-medium text-purple-700 bg-purple-50">{r.cumulative ?? r.totalScore}</td>
                    <td className="px-3 py-3 text-center font-medium text-amber-700 bg-amber-50">{r.average ?? r.totalScore}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={clsx('px-2 py-0.5 rounded-lg text-xs font-bold', gradeColor(r.grade))}>{r.grade}</span>
                    </td>
                    <td className="px-3 py-3 text-center text-gray-500 text-xs">{r.remark}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Traits Display - Table Format */}
      {data?.trait && (
        <div className="grid lg:grid-cols-2 gap-6 print:hidden">
          {/* Affective Traits */}
          <div className="bg-white rounded-2xl card shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-blue-600 text-white px-6 py-4">
              <h3 className="text-lg font-bold">PART B: AFFECTIVE TRAITS</h3>
            </div>
            <table className="w-full">
              <tbody className="divide-y divide-gray-200">
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
                  <tr key={trait.label} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-700">{trait.label}</td>
                    <td className="px-6 py-3 text-right">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">{trait.value}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Psychomotor Traits */}
          <div className="bg-white rounded-2xl card shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-purple-600 text-white px-6 py-4">
              <h3 className="text-lg font-bold">PART C: PSYCHOMOTOR TRAITS</h3>
            </div>
            <table className="w-full">
              <tbody className="divide-y divide-gray-200">
                {[
                  { label: 'Drawing', value: data.trait.drawing },
                  { label: 'Physical Activity', value: data.trait.physicalActivity },
                  { label: 'Accuracy', value: data.trait.accuracy },
                  { label: 'Handling of Tools', value: data.trait.handlingOfTools },
                  { label: 'Mental Skills', value: data.trait.mentalSkills },
                ].map((trait) => (
                  <tr key={trait.label} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-700">{trait.label}</td>
                    <td className="px-6 py-3 text-right">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">{trait.value}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Teacher & Principal Comments */}
      {data && (data.teacher || data.principal) && (
        <div className="grid md:grid-cols-2 gap-4 print:hidden">
          {([
            { key: 'teacherComment',   person: data.teacher,   title: "Teacher's Comment",  border: 'border-yellow-200', bg: 'bg-yellow-50' },
            { key: 'principalComment', person: data.principal, title: "Principal's Comment", border: 'border-indigo-200', bg: 'bg-indigo-50' },
          ] as const).map(({ key, person, title, border, bg }) => (
            <div key={key} className={'rounded-2xl border ' + border + ' ' + bg + ' p-5'}>
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-black/10">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                  {getImageUrl(person?.image)
                    ? <img src={getImageUrl(person.image)!} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-gray-400"><User size={18} /></div>}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{person?.name ?? '—'}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{title.split("'")[0]}</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 italic">
                {data.attendance?.[key] ? '"' + data.attendance[key] + '"' : 'No comment provided yet.'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
