export const FEATURES = [
  { label:'Academic Management', desc:'Results, CBT exams, assignments, timetables and curriculum.', ic:'#2563eb', bg:'#dbeafe',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> },
  { label:'Smart Transport', desc:'Live GPS, route management, driver app and parent alerts.', ic:'#4f46e5', bg:'#e0e7ff',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
  { label:'Online Payments', desc:'Collect fees via Paystack. Instant QR receipts.', ic:'#7c3aed', bg:'#ede9fe',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
  { label:'Staff & HR', desc:'Attendance, leave management, payroll and performance.', ic:'#0369a1', bg:'#e0f2fe',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { label:'Library & Hostel', desc:'Book borrowing, fines, hostel beds and room management.', ic:'#1d4ed8', bg:'#bfdbfe',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
  { label:'Finance Reports', desc:'Track income, expenses, debts and payment summaries.', ic:'#0891b2', bg:'#cffafe',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
];

export const STATS = [
  {n:'1,200+',l:'Students enrolled'},
  {n:'95%',   l:'Reduction in paperwork'},
  {n:'24/7',  l:'Portal uptime'},
];

export const FAQS = [
  {q:'How do I get my school on Smart Campus?',a:"Click \"Register Your School\" and fill in your details. We'll activate your portal within 24 hours."},
  {q:'Can parents track the school bus in real time?',a:'Yes. Parents get live GPS updates, ETA to their stop, and automatic pickup confirmation when their child boards.'},
  {q:"How do students pay school fees?",a:"Students log in and click Pay Now. They're redirected to Paystack's secure checkout and get a QR receipt instantly."},
  {q:'Does it work on mobile phones?',a:'Yes — the portal is fully responsive and works on any device, any browser. No app download required.'},
  {q:'How is student data protected?',a:'All data is encrypted in transit and at rest. Role-based access ensures staff only see what they need.'},
];

export const TICKER = ['Academic management','Live GPS tracking','Online fee payments','Staff & payroll','Library system','Hostel management','CBT exams','Finance reports','Smart transport'];

export type DemoForm = { name: string; school: string; email: string; phone: string };
