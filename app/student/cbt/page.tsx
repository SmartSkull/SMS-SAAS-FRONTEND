'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { api, endpoints, getImageUrl } from '@/lib/api';
import { auth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { Monitor, Play, CheckCircle, Clock, ChevronLeft, ChevronRight, Calculator, AlertTriangle, Camera, CameraOff, ShieldAlert, X } from 'lucide-react';
import type { ApiResponse, CbtTest, CbtQuestion } from '@/types';
import { EmptyState } from '@/components/ui/StateDisplay';
import clsx from 'clsx';

/* ─── Pre-exam Info Modal ─────────────────────────────────────────────────── */
function CbtInfoModal({ test, onConfirm, onClose }: { test: CbtTest; onConfirm: () => void; onClose: () => void }) {
  const user = auth.getUser();
  const initials = `${user?.firstname?.[0] ?? ''}${user?.lastname?.[0] ?? ''}`.toUpperCase();
  const rules = [
    'Do not switch tabs or leave this page — the test will auto-submit.',
    'Keep your face visible to the camera at all times.',
    'Only one person should be in front of the camera.',
    'A calculator is available inside the exam if needed.',
    'Once started, the timer cannot be paused.',
    'Ensure a stable internet connection before starting.',
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-purple-100 flex items-center justify-center">
            {user?.image
              ? <img src={getImageUrl(user.image) ?? ''} alt={user.firstname} className="w-full h-full object-cover" />
              : <span className="text-purple-700 font-bold text-sm">{initials}</span>}
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">CBT Examination</p>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">{test.course}</h2>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Questions', value: String(test.question_count) },
            { label: 'Duration', value: `${test.duration} min` },
            { label: 'Camera', value: 'Required' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-base font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Camera notice */}
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
          <Camera size={15} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 font-medium">Your camera and microphone will be active throughout the exam for proctoring purposes.</p>
        </div>

        {/* Rules */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert size={14} className="text-gray-500" />
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Exam Rules</p>
          </div>
          <ul className="space-y-1.5">
            {rules.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                <span className="mt-0.5 w-4 h-4 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center shrink-0 font-semibold text-[10px]">{i + 1}</span>
                {r}
              </li>
            ))}
          </ul>
        </div>

        <button onClick={onConfirm}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl btn-brand text-white font-semibold text-sm">
          <Play size={15} /> Start Exam
        </button>
      </div>
    </div>
  );
}

/* ─── Calculator ─────────────────────────────────────────────────────────── */
function Calc() {
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState('');
  const press = (val: string) => {
    if (val === 'C') { setExpr(''); setResult(''); return; }
    if (val === '⌫') { setExpr((e) => e.slice(0, -1)); return; }
    if (val === '=') {
      try {
        // eslint-disable-next-line no-new-func
        const r = Function('"use strict"; return (' + expr.replace(/×/g, '*').replace(/÷/g, '/') + ')')();
        setResult(String(parseFloat(r.toFixed(10))));
      } catch { setResult('Error'); }
      return;
    }
    setExpr((e) => e + val);
    setResult('');
  };
  const rows = [['C','⌫','%','÷'],['7','8','9','×'],['4','5','6','-'],['1','2','3','+'],[  '±','0','.','=']];
  return (
    <div className="bg-white rounded-2xl card border border-gray-200 shadow-lg p-3 w-56">
      <div className="bg-gray-900 rounded-xl px-3 py-2 mb-3 text-right min-h-[52px]">
        <p className="text-gray-400 text-xs truncate">{expr || '0'}</p>
        <p className="text-white text-lg font-mono font-semibold">{result || ''}</p>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {rows.flat().map((k) => (
          <button key={k} onClick={() => press(k === '±' ? (expr.startsWith('-') ? expr.slice(1) : '-' + expr) : k)}
            className={clsx('h-10 rounded-xl text-sm font-semibold transition-colors',
              k === '=' ? 'bg-blue-500 text-white hover:bg-blue-600' :
              ['C','⌫','%','÷','×','-','+'].includes(k) ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' :
              'bg-gray-50 text-gray-800 hover:bg-gray-100')}>
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Proctor ─────────────────────────────────────────────────────────────── */
const MAX_VIOLATIONS = 3;

interface ProctoringProps {
  onViolation: (reason: string) => void;
  onAutoSubmit: () => void;
}

function Proctor({ onViolation, onAutoSubmit }: ProctoringProps) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const violationsRef = useRef(0);
  const [camOk, setCamOk] = useState<boolean | null>(null); // null=requesting

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setCamOk(true);
        startFaceDetection();
      })
      .catch(() => {
        if (!cancelled) {
          setCamOk(false);
          onViolation('Camera/microphone access denied');
        }
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (detectRef.current) clearInterval(detectRef.current);
    };
  }, []);

  const startFaceDetection = () => {
    // FaceDetector is available in Chrome/Edge (experimental)
    if (!('FaceDetector' in window)) return;
    // @ts-ignore
    const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
    detectRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      try {
        const faces = await detector.detect(videoRef.current);
        if (faces.length === 0) {
          flag('No face detected — please stay in front of the camera');
        } else if (faces.length > 1) {
          flag(`${faces.length} faces detected — only you should be present`);
        }
      } catch {}
    }, 5000); // check every 5s
  };

  const flag = (reason: string) => {
    violationsRef.current += 1;
    onViolation(reason);
    if (violationsRef.current >= MAX_VIOLATIONS) {
      if (detectRef.current) clearInterval(detectRef.current);
      onAutoSubmit();
    }
  };

  return (
    <div className="relative w-28 h-20 rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-900 shrink-0">
      <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
      {camOk === null && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Camera size={16} className="text-gray-400 animate-pulse" />
        </div>
      )}
      {camOk === false && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <CameraOff size={16} className="text-red-400" />
          <span className="text-[9px] text-red-300 text-center px-1">No camera</span>
        </div>
      )}
      {camOk && (
        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Recording" />
      )}
    </div>
  );
}

type View = 'list' | 'test' | 'done';

const STORAGE_KEY = 'cbt_session';

interface CbtSession {
  course: string;
  questions: CbtQuestion[];
  answers: Record<string, string>;
  current: number;
  timeLeft: number;
  startedAt: number; // epoch ms
}

function saveSession(s: CbtSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}
function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}
function loadSession(): CbtSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function StudentCBT() {
  const [view, setView]           = useState<View>('list');
  const [tests, setTests]         = useState<CbtTest[]>([]);
  const [questions, setQuestions] = useState<CbtQuestion[]>([]);
  const [answers, setAnswers]     = useState<Record<string, string>>({});
  const [activeCourse, setActiveCourse] = useState('');
  const [current, setCurrent]     = useState(0);
  const [score, setScore]         = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [timeLeft, setTimeLeft]   = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showCalc, setShowCalc]     = useState(false);
  const [violation, setViolation]   = useState<string | null>(null);
  const [pendingTest, setPendingTest] = useState<CbtTest | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const courseRef = useRef('');
  const toast = useToast();

  // Restore session on mount
  useEffect(() => {
    const s = loadSession() as any;
    if (!s) return;
    if (s.submitted) { clearSession(); return; } // beacon already submitted on reload
    // Adjust timeLeft for elapsed time since page left
    const elapsed = Math.floor((Date.now() - s.startedAt) / 1000);
    const remaining = Math.max(0, s.timeLeft - elapsed);
    setQuestions(s.questions);
    setAnswers(s.answers);
    setActiveCourse(s.course);
    courseRef.current = s.course;
    setCurrent(s.current);
    setTimeLeft(remaining);
    setView(remaining > 0 ? 'test' : 'list');
    if (remaining === 0) clearSession();
  }, []);

  useEffect(() => {
    api.get<ApiResponse<CbtTest[]>>(endpoints.student.cbtTests)
      .then((r) => setTests(r.data))
      .catch(() => toast.error('Failed to load tests'))
      .finally(() => setLoading(false));
  }, []);

  const submitTest = useCallback(async (course?: string) => {
    if (submitting) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);
    clearSession();
    const c = course ?? courseRef.current;
    try {
      const r = await api.post<ApiResponse<any>>(endpoints.student.cbtSubmit, { course: c });
      setScore(r.data);
      setView('done');
    } catch { toast.error('Failed to submit test'); }
    finally { setSubmitting(false); }
  }, [submitting]);

  const submitRef = useRef(submitTest);
  useEffect(() => { submitRef.current = submitTest; }, [submitTest]);

  // Countdown timer — persist timeLeft every second
  useEffect(() => {
    if (view !== 'test' || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        const next = t - 1;
        // Update startedAt in storage so elapsed calc stays accurate
        const s = loadSession();
        if (s) saveSession({ ...s, timeLeft: next, startedAt: Date.now() });
        if (next <= 0) { clearInterval(timerRef.current!); submitRef.current(); return 0; }
        return next;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [view]);

  // Auto-submit when tab becomes hidden (new tab / switch away) — but not on reload/close
  useEffect(() => {
    let unloading = false;
    const onUnload = () => { unloading = true; };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && view === 'test' && !unloading) {
        submitRef.current();
      }
    };
    window.addEventListener('beforeunload', onUnload);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [view]);

  // Submit via sendBeacon on page reload / close
  useEffect(() => {
    if (view !== 'test') return;
    const onUnload = () => {
      const course = courseRef.current;
      if (!course) return;
      const token = auth.getToken();
      const blob = new Blob([JSON.stringify({ course })], { type: 'application/json' });
      navigator.sendBeacon(`/api/student/cbt/submit?token=${token}`, blob);
      // Mark session as submitted so restore doesn't resume it
      const s = loadSession();
      if (s) saveSession({ ...s, submitted: true } as any);
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [view]);

  const startTest = async (course: string, duration: number) => {
    try {
      const r = await api.get<ApiResponse<any>>(endpoints.student.cbtStart(course));
      const qs = r.data.questions ?? [];
      const secs = (r.data.duration ?? duration) * 60;
      const session: CbtSession = {
        course, questions: qs, answers: {}, current: 0,
        timeLeft: secs, startedAt: Date.now(),
      };
      saveSession(session);
      setQuestions(qs);
      setActiveCourse(course);
      courseRef.current = course;
      setAnswers({});
      setCurrent(0);
      setTimeLeft(secs);
      setView('test');
    } catch { toast.error('Failed to start test'); }
  };

  const selectAnswer = (qId: string, opt: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [qId]: opt };
      // Persist answers to storage
      const s = loadSession();
      if (s) saveSession({ ...s, answers: next });
      return next;
    });
    api.post(endpoints.student.cbtAnswer, { question_id: qId, answer: opt }).catch(() => {});
  };

  const goTo = (i: number) => {
    setCurrent(i);
    const s = loadSession();
    if (s) saveSession({ ...s, current: i });
  };

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');
  const timerWarning = timeLeft > 0 && timeLeft <= 60;

  /* ── Done screen ── */
  if (view === 'done') return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
        <CheckCircle size={40} className="text-blue-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900">Test Submitted!</h2>
      <p className="text-gray-500 text-lg">Score: <span className="font-bold text-gray-900">{score?.score ?? 'N/A'}</span> / {questions.length}</p>
      <p className="text-gray-400 text-sm">{score?.percentage?.toFixed(1) ?? 0}%</p>
      <button onClick={() => { clearSession(); setView('list'); }} className="mt-2 px-6 py-2.5 btn-brand text-white rounded-xl font-semibold text-sm ">
        Back to Tests
      </button>
    </div>
  );

  /* ── Test screen ── */
  if (view === 'test') {
    const q = questions[current];
    const answered = Object.keys(answers).length;

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4">
        {/* Violation banner */}
        {violation && (
          <div className="w-full max-w-2xl mb-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertTriangle size={16} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-700 font-medium">{violation}</p>
          </div>
        )}

        {/* Header bar */}
        <div className="w-full max-w-2xl mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {(() => {
              const u = auth.getUser();
              const ini = `${u?.firstname?.[0] ?? ''}${u?.lastname?.[0] ?? ''}`.toUpperCase();
              return (
                <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-purple-100 flex items-center justify-center">
                  {u?.image
                    ? <img src={getImageUrl(u.image) ?? ''} alt={u.firstname} className="w-full h-full object-cover" />
                    : <span className="text-purple-700 font-bold text-xs">{ini}</span>}
                </div>
              );
            })()}
            <div className="min-w-0">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">CBT Examination</p>
              <h1 className="text-base font-bold text-gray-900 leading-tight truncate">{activeCourse}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Live camera feed */}
            <Proctor
              onViolation={(reason) => {
                setViolation(`⚠️ Warning: ${reason}`);
                setTimeout(() => setViolation(null), 6000);
              }}
              onAutoSubmit={() => {
                setViolation('Test auto-submitted due to repeated violations.');
                submitRef.current();
              }}
            />

            {/* Calculator */}
            <div className="relative">
              <button onClick={() => setShowCalc((s) => !s)}
                className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                  showCalc ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}>
                <Calculator size={15} /> Calc
              </button>
              {showCalc && (
                <div className="absolute right-0 top-11 z-50">
                  <Calc />
                </div>
              )}
            </div>

            {/* Timer */}
            <div className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-sm',
              timerWarning ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-700'
            )}>
              <Clock size={15} />
              {mins}:{secs}
            </div>
          </div>
        </div>

        {/* Question navigator */}
        <div className="w-full max-w-2xl mb-4">
          <div className="bg-white rounded-2xl card border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-3">{answered} of {questions.length} answered</p>
            <div className="flex flex-wrap gap-2">
              {questions.map((_, i) => {
                const qId = questions[i].id;
                const isAnswered = !!answers[qId];
                const isCurrent = i === current;
                return (
                  <button key={i} onClick={() => goTo(i)}
                    className={clsx(
                      'w-8 h-8 rounded-lg text-xs font-semibold transition-all',
                      isCurrent  ? 'bg-blue-600 text-white ring-2 ring-blue-300' :
                      isAnswered ? 'bg-blue-100 text-blue-700' :
                                   'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    )}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Question card */}
        <div className="w-full max-w-2xl bg-white rounded-2xl card border border-gray-100 shadow-sm p-6">
          <p className="text-xs text-gray-400 mb-2">Question {current + 1} of {questions.length}</p>
          <p className="font-semibold text-gray-900 mb-5 text-base leading-relaxed">{q.question}</p>
          <div className="space-y-3">
            {q.options.map((opt, j) => {
              const letter = ['A', 'B', 'C', 'D'][j];
              const selected = answers[q.id] === opt;
              return (
                <button key={j} onClick={() => selectAnswer(String(q.id), opt)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all',
                    selected
                      ? 'border-blue-500 bg-blue-50 text-blue-800 font-medium'
                      : 'border-gray-200 hover:border-green-300 hover:bg-gray-50 text-gray-700'
                  )}>
                  <span className={clsx(
                    'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                    selected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                  )}>{letter}</span>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="w-full max-w-2xl mt-4 flex items-center justify-between">
          <button onClick={() => goTo(Math.max(0, current - 1))} disabled={current === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            <ChevronLeft size={16} /> Previous
          </button>

          {current < questions.length - 1 ? (
            <button onClick={() => goTo(current + 1)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl btn-brand text-white text-sm font-medium ">
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={() => submitTest()} disabled={submitting}
              className="px-6 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 disabled:opacity-60">
              {submitting ? 'Submitting…' : 'Submit Test'}
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ── Test list ── */
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">CBT Tests</h1>
      {loading ? (
        <div className="grid md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse" />)}
        </div>
      ) : tests.length === 0 ? (
        <EmptyState icon={Monitor} message="No tests available." />
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {tests.map((t) => (
            <div key={t.id ?? t.course} className={clsx(
              'bg-white rounded-2xl card shadow-sm border p-5 transition-all',
              t.completed ? 'border-blue-200 bg-blue-50/40' : 'border-gray-100 hover:shadow-md'
            )}>
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center mb-3',
                t.completed ? 'bg-blue-100' : 'bg-purple-100')}>
                {t.completed
                  ? <CheckCircle size={18} className="text-blue-600" />
                  : <Monitor size={18} className="text-purple-600" />}
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">{t.course}</h3>
              <p className="text-xs text-gray-400 mt-1">{t.question_count} questions · {t.duration} min</p>
              {t.completed ? (
                <div className="mt-3 space-y-1">
                  <p className="flex items-center gap-1.5 text-xs text-blue-700 font-semibold">
                    <CheckCircle size={12} /> Completed
                  </p>
                  {t.score !== undefined && (
                    <p className="text-xs text-gray-500">
                      Score: <span className="font-bold text-gray-800">{t.score}/{t.question_count}</span>
                      {t.percentage !== undefined && <span className="ml-1 text-gray-400">({t.percentage.toFixed(0)}%)</span>}
                    </p>
                  )}
                </div>
              ) : (
                <button onClick={() => setPendingTest(t)}
                  className="mt-3 flex items-center gap-2 text-xs text-blue-600 font-semibold hover:text-blue-700">
                  <Play size={14} /> Start Test
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {pendingTest && (
        <CbtInfoModal
          test={pendingTest}
          onConfirm={() => { const t = pendingTest; setPendingTest(null); startTest(t.course, t.duration ?? 30); }}
          onClose={() => setPendingTest(null)}
        />
      )}
    </div>
  );
}
