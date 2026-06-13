'use client';
import { useState, useRef, useEffect } from 'react';
import { X, MessageCircle, Send } from 'lucide-react';

type Msg = { role: 'bot' | 'user'; text: string };

/* ─── Knowledge base ─────────────────────────────────────────────────────── */
const KB: { patterns: RegExp[]; answer: string; chips?: string[] }[] = [
  {
    patterns: [/\bhello\b|\bhi\b|\bhey\b|\bhelp\b|\bstart\b|\bwhat can you do\b/i],
    answer: "Hello! 👋 I'm the Smart Campus assistant. I can answer questions about fees, transport, academics, staff management, and more. What would you like to know?",
    chips: ['How do I register?', 'How do students pay fees?', 'Does it work on mobile?', 'What features are included?'],
  },
  {
    patterns: [/register|sign.?up|get started|onboard|create.?school|new school/i],
    answer: "Getting started is easy! Click **Register Your School** on the homepage, fill in your school details and upload your logo. Your portal will be reviewed and activated **within 24 hours**. You'll receive a confirmation email once it's live.",
    chips: ['What features are included?', 'How do students pay fees?', 'Is my data secure?'],
  },
  {
    patterns: [/fee|pay(?:ment|stack|ing)?|invoice|receipt|qr|scratch.?card/i],
    answer: "Students log in to their portal, click **Pay Now**, and are redirected to Paystack's secure checkout. After payment a **QR-code receipt** is generated instantly — no queues, no manual records. Admins can track all payments and generate summaries in real time.",
    chips: ['What is Paystack?', 'Can admins see payment history?', 'How are fees configured?'],
  },
  {
    patterns: [/paystack|payment gateway|online payment method/i],
    answer: "**Paystack** is Nigeria's leading payment gateway. It supports cards, bank transfers, and USSD. Smart Campus integrates directly with Paystack so fees are collected securely with instant confirmation.",
    chips: ['How do students pay fees?', 'Can admins see payment history?'],
  },
  {
    patterns: [/payment history|fee record|who paid|track payment/i],
    answer: "Admins have a full **Payments dashboard** showing every transaction — amount, date, student name, and status. You can filter by term, session, or class and export summaries.",
    chips: ['How are fees configured?', 'What finance reports are available?'],
  },
  {
    patterns: [/fee config|set fee|fee amount|school fee setup/i],
    answer: "Admins go to **School Fees → Configuration** to create fee items per class and term. Students only see fees relevant to their class, and payment progress is tracked automatically.",
    chips: ['How do students pay fees?', 'What finance reports are available?'],
  },
  {
    patterns: [/gps|transport|bus|track.?bus|driver|route|pickup|parent.?alert/i],
    answer: "Smart Campus has a full **Live Transport** module:\n• Real-time GPS tracking for every school bus\n• Parents receive alerts when the bus is nearby\n• Automatic pickup confirmation when a child boards\n• Route and driver management for admins\n• A dedicated **Driver App** for on-the-go updates",
    chips: ['How do parents access tracking?', 'Can admins manage routes?', 'Is there a driver app?'],
  },
  {
    patterns: [/parent.?access|parent.?track|parent.?portal/i],
    answer: "Parents receive **push notifications and SMS alerts** about bus location and ETA. No app download is needed — everything works through the responsive web portal on any device.",
    chips: ['Does it work on mobile?', 'How do students pay fees?'],
  },
  {
    patterns: [/driver.?app|driver portal/i],
    answer: "Drivers have their own login on the **Driver Portal** where they can view assigned routes, mark student pickups, and have their GPS location broadcast live to parents and admin.",
    chips: ['How does transport tracking work?', 'Can admins manage routes?'],
  },
  {
    patterns: [/result|grade|report.?card|academic|cbt|exam|timetable|curriculum|assignment|lesson.?plan/i],
    answer: "The **Academic Management** module covers:\n• CBT (Computer-Based Tests) for students\n• Result entry, approval, and parent-visible report cards\n• Class and exam timetables\n• Assignment creation and submission\n• Curriculum topics, weekly schemes, and lesson plans",
    chips: ['How do CBT exams work?', 'Who approves results?', 'Can staff set assignments?'],
  },
  {
    patterns: [/cbt|computer.?based.?test|online.?exam/i],
    answer: "Staff upload or create CBT questions per subject. Students see their assigned tests in the portal, answer in real time, and get **instant scores** upon submission. Admins and staff can review all results.",
    chips: ['Who approves results?', 'What academic features exist?'],
  },
  {
    patterns: [/approv.* result|principal|comment/i],
    answer: "Staff enter and submit results. **Admins (or Principal)** then review and approve them before they become visible to students and parents. The principal can also add a personal comment to each report card.",
    chips: ['Can staff set assignments?', 'How does CBT work?'],
  },
  {
    patterns: [/staff|hr|human.?resource|payroll|salary|leave|performance/i],
    answer: "The **Staff & HR** module handles:\n• Staff clock-in/clock-out attendance\n• Leave requests and approvals\n• Salary setup, deductions, and payslip generation\n• Performance tracking\n• Internal messaging",
    chips: ['How does payroll work?', 'How does leave management work?'],
  },
  {
    patterns: [/payroll|salary|payslip|deduction/i],
    answer: "Admins configure each staff member's **salary setup** including allowances and deductions. Payroll can be run per month to generate payslips that staff can view and download from their portal.",
    chips: ['How does leave management work?', 'What staff features exist?'],
  },
  {
    patterns: [/leave|day.?off|absence/i],
    answer: "Staff submit leave requests through their portal. Admins review and approve or reject them. Leave balances are tracked automatically per staff member and entitlement type.",
    chips: ['How does payroll work?', 'How does attendance work?'],
  },
  {
    patterns: [/attendance|clock.?in|clock.?out|present|absent/i],
    answer: "Smart Campus tracks attendance for both **staff and students**:\n• Staff clock in/out via the portal (location-based)\n• Admins set the school's GPS location for validation\n• Student attendance is marked by class teachers\n• Admins can bulk-mark absent students and view detailed reports",
    chips: ['How does leave management work?', 'What staff features exist?'],
  },
  {
    patterns: [/library|book|borrow|fine|return book/i],
    answer: "The **Library module** lets staff add books with barcodes, manage borrowing records, set return deadlines, and track fines for overdue books. Students can see available titles and their borrowing history.",
    chips: ['What about hostel management?', 'What features are included?'],
  },
  {
    patterns: [/hostel|boarding|bed|room|dormitor/i],
    answer: "The **Hostel module** manages boarding facilities — add hostels, define rooms and beds, assign students to specific beds, and run hostel attendance. Admins can unassign and reassign beds at any time.",
    chips: ['What about the library?', 'What features are included?'],
  },
  {
    patterns: [/finance|report|income|expense|debt|budget/i],
    answer: "The **Finance Reports** section gives admins a complete financial overview:\n• Total income collected\n• Logged expenses\n• Outstanding debts per student\n• Payment summaries by term or session\n• Export-ready reports",
    chips: ['How are fees configured?', 'Can admins see payment history?'],
  },
  {
    patterns: [/message|chat|communicat|notif|announcement/i],
    answer: "Smart Campus has an **internal messaging system** — students, staff, and admins can send messages and share files within the platform. Admins can also broadcast notifications to all users or specific groups.",
    chips: ['What features are included?', 'How does transport work?'],
  },
  {
    patterns: [/online.?class|virtual.?class|live.?class|zoom/i],
    answer: "Admins and staff can schedule **Online Classes** directly from the portal. Students see upcoming sessions, join with a link, and class history is logged for reference.",
    chips: ['How does the academic module work?', 'What features are included?'],
  },
  {
    patterns: [/mobile|phone|app|download|responsive|browser|device/i],
    answer: "Yes — Smart Campus is **fully responsive** and works on any phone, tablet, or computer in any modern browser. No app download is required. Everything is accessible via your portal URL.",
    chips: ['How do I register?', 'What features are included?'],
  },
  {
    patterns: [/secure|security|data|protect|encrypt|privacy|safe/i],
    answer: "Security is built in at every layer:\n• All data is **encrypted in transit and at rest**\n• **Role-based access** — staff only see what their role permits\n• JWT authentication with automatic token refresh\n• Passwords are hashed using bcrypt\n• No sensitive data is exposed publicly",
    chips: ['How do I register?', 'Is student data shared?'],
  },
  {
    patterns: [/data.?shar|third.?party|share.?data|gdpr/i],
    answer: "Student and school data is **never sold or shared with third parties**. It is used solely to operate your school portal. You retain full ownership of your data.",
    chips: ['How is data secured?', 'How do I register?'],
  },
  {
    patterns: [/price|cost|plan|subscri|how much|fee.*plan/i],
    answer: "Pricing is tailored to your school size and the modules you need. Use the **Contact / Free Demo** section on this page to reach our team and we'll send a personalised quote within 24 hours.",
    chips: ['Request a demo', 'What features are included?'],
  },
  {
    patterns: [/demo|trial|walkthrough|show me/i],
    answer: "We'd love to show you around! Scroll down to the **Free Demo** section, fill in your name, school, email, and phone number, and our team will arrange a live walkthrough — **free, no commitment**.",
    chips: ['What features are included?', 'How do I register?'],
  },
  {
    patterns: [/feature|what.*(do|can|include|offer)|module|capabilit/i],
    answer: "Smart Campus covers:\n📚 **Academic** — CBT exams, results, timetables, assignments, curriculum\n🚌 **Transport** — Live GPS, driver app, parent alerts\n💳 **Payments** — Paystack integration, QR receipts\n👥 **Staff & HR** — Attendance, leave, payroll\n📖 **Library** — Borrowing, fines, barcodes\n🏠 **Hostel** — Beds, rooms, attendance\n💰 **Finance** — Reports, income, expenses\n💬 **Messaging** — Internal chat & notifications\n🎓 **Online Classes** — Scheduled virtual sessions",
    chips: ['How do I register?', 'How do students pay fees?', 'Tell me about transport'],
  },
  {
    patterns: [/contact|reach|support|team|email|phone.*(smart|campus)/i],
    answer: "You can reach the Smart Campus team via the **Contact section** on this page, or request a free demo. We typically respond within **24 hours**.",
    chips: ['Request a demo', 'What features are included?'],
  },
];

const CHIPS_INITIAL = ['How do I register?', 'How do students pay fees?', 'Tell me about transport', 'What features are included?'];

function getReply(input: string): { answer: string; chips?: string[] } {
  const lower = input.toLowerCase();
  for (const item of KB) {
    if (item.patterns.some(p => p.test(lower))) return { answer: item.answer, chips: item.chips };
  }
  return { answer: "I'm not sure about that yet 🤔. Please use the **Contact** section on this page and our team will be happy to help!", chips: ['What features are included?', 'Request a demo'] };
}

/* ─── Components ─────────────────────────────────────────────────────────── */
function BotText({ text }: { text: string }) {
  return (
    <p className="text-[13px] leading-[1.6] whitespace-pre-line">
      {text.split(/\*\*(.+?)\*\*/g).map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p)}
    </p>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 150, 300].map(d => (
        <span key={d} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
      ))}
    </div>
  );
}

/* ─── Main chatbot ───────────────────────────────────────────────────────── */
export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'bot', text: "Hi! 👋 I'm the Smart Campus assistant. How can I help you today?" }]);
  const [chips, setChips] = useState<string[]>(CHIPS_INITIAL);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, typing]);

  function reply(text: string) {
    setMsgs(m => [...m, { role: 'user', text }]);
    setChips([]);
    setTyping(true);
    setTimeout(() => {
      const res = getReply(text);
      setMsgs(m => [...m, { role: 'bot', text: res.answer }]);
      setChips(res.chips ?? []);
      setTyping(false);
    }, 600 + Math.random() * 400);
  }

  function send() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    reply(text);
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100" style={{ maxHeight: '80vh' }}>

          {/* Header */}
          <div className="bg-blue-600 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-white font-semibold text-sm">Smart Campus Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white"><X size={16} /></button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-[13px] ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                  {m.role === 'bot' ? <BotText text={m.text} /> : m.text}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm"><TypingDots /></div>
              </div>
            )}

            {/* Quick-reply chips */}
            {!typing && chips.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {chips.map(c => (
                  <button key={c} onClick={() => reply(c)}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors">
                    {c}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 flex gap-2 shrink-0">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Type a message…"
              className="flex-1 text-base bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400"
            />
            <button onClick={send} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-2 transition-colors">
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Toggle */}
      <div className="relative">
        {!open && <>
          <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-30" />
          <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20" style={{ animationDelay: '0.4s' }} />
        </>}
        <button
          onClick={() => setOpen(o => !o)}
          className="relative w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform duration-150"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.3s cubic-bezier(.34,1.56,.64,1)' }}
        >
          {open ? <X size={22} /> : <MessageCircle size={22} />}
        </button>
      </div>
    </div>
  );
}
