export const FEATURES = [
  { slug: 'academic-management', label:'Academic Management', desc:'Results, CBT exams, assignments, timetables and curriculum.', ic:'#2563eb', bg:'#dbeafe',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> },
  { slug: 'smart-transport', label:'Smart Transport', desc:'Live GPS, route management, driver app and parent alerts.', ic:'#4f46e5', bg:'#e0e7ff',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
  { slug: 'online-payments', label:'Online Payments', desc:'Collect fees via Paystack. Instant QR receipts.', ic:'#7c3aed', bg:'#ede9fe',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
  { slug: 'staff-hr', label:'Staff & HR', desc:'Attendance, leave management, payroll and performance.', ic:'#0369a1', bg:'#e0f2fe',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { slug: 'library-hostel', label:'Library & Hostel', desc:'Book borrowing, fines, hostel beds and room management.', ic:'#1d4ed8', bg:'#bfdbfe',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
  { slug: 'finance-reports', label:'Finance Reports', desc:'Track income, expenses, debts and payment summaries.', ic:'#0891b2', bg:'#cffafe',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
];

export const FEATURE_DETAILS: Record<string, { intro: string; highlights: { title: string; body: string }[]; outcome: string }> = {
  'academic-management': {
    intro: 'Academic Management puts everything your school does in the classroom in one place. Teachers enter scores and set assignments, students see their results and tasks instantly, and report cards are generated automatically — no more paper records.',
    highlights: [
      { title: 'Digital result sheets', body: 'Enter test and exam scores once. Smart Campus computes totals, grades and remarks automatically, and cumulative averages across first, second and third terms — just like a printed result sheet.' },
      { title: 'Online CBT exams', body: 'Staff create multiple-choice tests per subject. Students take them on any device and receive instant scores. Every attempt is stored and exportable for review.' },
      { title: 'Assignments & timetables', body: 'Distribute assignments with deadlines, collect submissions and grade them online. Keep class and exam timetables in sync so everyone knows what is happening when.' },
    ],
    outcome: 'No more hand-written records or chasing lost papers — results, grades and report cards are generated automatically and available to staff, students and parents in real time.',
  },
  'smart-transport': {
    intro: 'Smart Transport lets you see exactly where every school bus is at all times. The driver simply uses their phone to share the bus location, so parents always know how close the bus is and when their child has been picked up — from the start of the journey to the final drop-off.',
    highlights: [
      { title: 'Live GPS tracking', body: 'The bus location is broadcast from the driver\'s phone in real time. Open the portal and see exactly where the bus is on the map at any moment.' },
      { title: 'Parent alerts', body: 'Parents receive an alert when the bus is 500 metres away from their stop, and a confirmation the moment their child boards — no more waiting at the gate wondering.' },
      { title: 'Route management', body: 'Admins assign buses to routes, manage drivers and monitor trip logs. The driver app keeps the journey status updated end to end.' },
    ],
    outcome: 'Parents always know where the bus is, drivers stay accountable, and the daily school run becomes calm, predictable and safe.',
  },
  'online-payments': {
    intro: 'Online Payments gets rid of cash queues and handwritten fee records. Students pay their school fees directly from their own portal using a secure payment page, and the payment is recorded automatically — no chasing receipts or bank confirmations.',
    highlights: [
      { title: 'Paystack checkout', body: 'Students click Pay Now and are taken to a secure Paystack checkout. Payments are verified instantly — no bank confirmations or chasing receipts.' },
      { title: 'Instant QR receipts', body: 'Every successful payment generates a QR-code receipt that can be scanned to verify the transaction. Students and parents keep a complete payment history.' },
      { title: 'Automatic reconciliation', body: 'The finance office sees payments recorded automatically against each student, term and session — reducing manual record keeping to zero.' },
    ],
    outcome: 'Fees are collected faster, records are always accurate, and your accounts team can see exactly who has paid and who is outstanding.',
  },
  'staff-hr': {
    intro: 'Staff & HR keeps all your staff information in one place. Attendance, leave requests, salaries and performance are managed from a single dashboard — no spreadsheets, no entering the same information twice.',
    highlights: [
      { title: 'Attendance tracking', body: 'Clock-ins and clock-outs are captured digitally, giving you an accurate daily record of every staff member\'s presence.' },
      { title: 'Leave management', body: 'Staff request leave, admins approve or reject, and balances are tracked automatically. Everyone can see their remaining days at a glance.' },
      { title: 'Payroll & performance', body: 'Configure salary structures, run monthly payroll and review performance — all from the same HR dashboard that holds their records.' },
    ],
    outcome: 'HR tasks that took days now take minutes, and your staff records are complete, accurate and audit-ready at all times.',
  },
  'library-hostel': {
    intro: 'Library & Hostel helps you manage your school library and boarding house without the usual paperwork. Books are checked in and out with a quick scan, and hostel beds and rooms are tracked digitally.',
    highlights: [
      { title: 'Barcode scanning', body: 'Check books in and out with a quick barcode scan. The system tracks who has what, when it is due, and calculates fines automatically for late returns.' },
      { title: 'Borrowing records', body: 'Every borrow and return is logged against the student\'s record — no more paper registers or lost books that vanish without a trace.' },
      { title: 'Hostel management', body: 'Assign beds to rooms, track occupancy and take hostel attendance — a complete view of your boarding house at all times.' },
    ],
    outcome: 'Books stop disappearing, fines are collected fairly, and hostel management becomes a simple, organised routine.',
  },
  'finance-reports': {
    intro: 'Finance Reports gives you a clear, up-to-date picture of your school\'s money. Income, spending, unpaid fees and payment summaries are all shown by term or session, so you always know how the school is doing financially.',
    highlights: [
      { title: 'Income tracking', body: 'Every fee payment flows into your reports automatically. See total collections, verified payments and pending amounts in one place.' },
      { title: 'Expenses & debts', body: 'Record expenses and track outstanding debts per student. The report surfaces who owes what, making follow-up simple and data-driven.' },
      { title: 'Term & session views', body: 'Filter any report by term or session to compare performance, spot trends and plan ahead with confidence.' },
    ],
    outcome: 'Your bursar gets accurate, timely financial insight without manual spreadsheets — and the principal always has the numbers to make decisions.',
  },
};

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
