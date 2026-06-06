'use client';
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Upload, Play, Trophy, Users, BookOpen, Loader2, Check, X, Zap, ArrowRight, RotateCcw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSelectedSchool } from '@/hooks/useSelectedSchool';

// ─── Types ────────────────────────────────────────────────────────────────────
type Mode = 'menu' | 'solo' | 'multiplayer';
type SoloPhase = 'upload' | 'generating' | 'playing' | 'done';
type MultiPhase = 'upload' | 'generating' | 'lobby' | 'waiting' | 'question' | 'round-result' | 'done';

interface Question {
  id: number;
  question: string;
  options: Record<string, string>;
  correct_answer: string;
  explanation: string;
}

interface Player { id: string; name: string; score: number; }
interface LobbyRoom { id: string; hostName: string; subject: string; playerCount: number; totalQuestions: number; }

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

function getToken() {
  return document.cookie.split('; ').find(r => r.startsWith('gka_token='))?.split('=')[1] || '';
}

async function uploadAndGenerate(file: File): Promise<Question[]> {
  const fd = new FormData();
  fd.append('document', file);
  const res = await fetch(`${API}/student/quiz-game/upload-and-generate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to generate questions');
  return data.questions;
}

// ─── Upload Panel ─────────────────────────────────────────────────────────────
function UploadPanel({ onQuestions, generating, setGenerating }: {
  onQuestions: (qs: Question[], subject: string) => void;
  generating: boolean;
  setGenerating: (v: boolean) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = async (file: File) => {
    setError('');
    setGenerating(true);
    try {
      const questions = await uploadAndGenerate(file);
      const subject = file.name.replace(/\.[^.]+$/, '');
      onQuestions(questions, subject);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handle(f); }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
      >
        <input ref={inputRef} type="file" accept=".pdf,.docx,.txt" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); }} />
        {generating ? (
          <div className="space-y-3">
            <Loader2 size={36} className="mx-auto text-blue-500 animate-spin" />
            <p className="text-sm font-medium text-gray-600">Scanning document & generating questions…</p>
            <p className="text-xs text-gray-400">This may take a moment</p>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload size={36} className="mx-auto text-gray-400" />
            <p className="text-sm font-semibold text-gray-700">Drop your handout here or click to browse</p>
            <p className="text-xs text-gray-400">PDF, Word (.docx), or TXT — max 15 MB</p>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
    </div>
  );
}

// ─── Solo Game ────────────────────────────────────────────────────────────────
function SoloGame({ questions, onBack }: { questions: Question[]; onBack: () => void }) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<{ correct: boolean; answer: string }[]>([]);
  const [phase, setPhase] = useState<'answering' | 'result' | 'done'>('answering');
  const [timeLeft, setTimeLeft] = useState(20);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const q = questions[idx];

  useEffect(() => {
    setTimeLeft(20);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleAnswer('');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [idx]);

  const handleAnswer = (ans: string) => {
    clearInterval(timerRef.current!);
    setSelected(ans || '__timeout__');
    const correct = ans.toUpperCase() === q.correct_answer.toUpperCase();
    setResults(prev => [...prev, { correct, answer: ans }]);
    setPhase('result');
  };

  const next = () => {
    if (idx + 1 >= questions.length) { setPhase('done'); return; }
    setIdx(i => i + 1);
    setSelected(null);
    setPhase('answering');
  };

  if (phase === 'done') {
    const correct = results.filter(r => r.correct).length;
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
          <Trophy size={48} className="mx-auto text-yellow-400" />
          <h2 className="text-2xl font-bold text-gray-900">Done!</h2>
          <p className="text-gray-500 text-lg">{correct} / {results.length} correct</p>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${(correct / results.length) * 100}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {questions.map((q, i) => (
            <div key={i} className="p-4 space-y-1">
              <div className="flex items-start gap-2">
                {results[i]?.correct ? <Check size={16} className="text-green-500 mt-0.5 shrink-0" /> : <X size={16} className="text-red-400 mt-0.5 shrink-0" />}
                <p className="text-sm font-medium text-gray-800">{q.question}</p>
              </div>
              <p className="text-xs text-gray-400 pl-6">Correct: {q.correct_answer}. {q.options[q.correct_answer]}</p>
              {q.explanation && <p className="text-xs text-gray-500 pl-6 italic">{q.explanation}</p>}
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onBack} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Back</button>
          <button onClick={() => { setIdx(0); setSelected(null); setResults([]); setPhase('answering'); }}
            className="flex-1 py-2.5 rounded-xl btn-brand text-white text-sm font-semibold flex items-center justify-center gap-2">
            <RotateCcw size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Question {idx + 1} / {questions.length}</span>
        <span className={`font-bold tabular-nums ${timeLeft <= 5 ? 'text-red-500' : 'text-gray-700'}`}>{timeLeft}s</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${((idx) / questions.length) * 100}%` }} />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <p className="text-base font-semibold text-gray-900">{q.question}</p>
        <div className="space-y-2">
          {Object.entries(q.options).map(([key, val]) => {
            let cls = 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer';
            if (phase === 'result') {
              if (key === q.correct_answer) cls = 'border-green-400 bg-green-50';
              else if (key === selected) cls = 'border-red-400 bg-red-50';
              else cls = 'border-gray-100 opacity-50';
            }
            return (
              <button key={key} onClick={() => phase === 'answering' && handleAnswer(key)} disabled={phase !== 'answering'}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all text-sm ${cls}`}>
                <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold shrink-0">{key}</span>
                {val}
              </button>
            );
          })}
        </div>
        {phase === 'result' && (
          <div className="space-y-3">
            {q.explanation && <p className="text-xs text-gray-500 italic">{q.explanation}</p>}
            <button onClick={next} className="w-full py-2.5 btn-brand text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
              {idx + 1 >= questions.length ? 'See Results' : 'Next Question'} <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Multiplayer Game ─────────────────────────────────────────────────────────
function MultiplayerGame({ playerName, schoolId, onBack }: { playerName: string; schoolId: string; onBack: () => void }) {
  const [phase, setPhase] = useState<MultiPhase>('upload');
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subject, setSubject] = useState('');
  const [lobbyRooms, setLobbyRooms] = useState<LobbyRoom[]>([]);
  const [roomId, setRoomId] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentQ, setCurrentQ] = useState<{ question: string; options: Record<string, string>; questionIndex: number; totalQuestions: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [wrongAnswers, setWrongAnswers] = useState<Set<string>>(new Set());
  const [roundResult, setRoundResult] = useState<{ correct_answer: string; explanation: string; winner: string | null; players: Player[] } | null>(null);
  const [finalPlayers, setFinalPlayers] = useState<Player[]>([]);
  const [timeLeft, setTimeLeft] = useState(20);
  const [error, setError] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const myIdRef = useRef('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const socket = io(`${API}/quiz-game`, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => {
      myIdRef.current = socket.id ?? '';
      socket.emit('watch-lobby', { schoolId });
    });
    socket.on('lobby-update', ({ rooms }) => setLobbyRooms(rooms));
    socket.on('room-joined', ({ roomId: id, players: ps }) => { setRoomId(id); setPlayers(ps); setPhase('waiting'); });
    socket.on('room-update', ({ players: ps }) => setPlayers(ps));
    socket.on('error', ({ message }) => setError(message));
    socket.on('question', (q) => {
      setCurrentQ(q); setSelected(null); setWrongAnswers(new Set()); setPhase('question');
      setTimeLeft(20);
      clearInterval(timerRef.current!);
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            socket.emit('time-up', { roomId });
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    });
    socket.on('wrong-answer', ({ answer }) => setWrongAnswers(prev => new Set([...prev, answer])));
    socket.on('round-result', (data) => { clearInterval(timerRef.current!); setRoundResult(data); setPhase('round-result'); });
    socket.on('game-over', ({ players: ps }) => { setFinalPlayers(ps); setPhase('done'); });
    return () => { socket.disconnect(); clearInterval(timerRef.current!); };
  }, [schoolId]);

  // Fix: roomId captured in timer closure
  const roomIdRef = useRef('');
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

  const handleAnswer = (key: string) => {
    if (selected || wrongAnswers.has(key)) return;
    setSelected(key);
    socketRef.current?.emit('answer', { roomId: roomIdRef.current, answer: key });
  };

  const createRoom = () => {
    setError('');
    socketRef.current?.emit('create-room', { schoolId, playerName, questions, subject });
  };

  const joinRoom = (id: string) => {
    setError('');
    socketRef.current?.emit('join-room', { roomId: id, playerName });
  };

  // ── Upload phase ──
  if (phase === 'upload') return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-gray-900">Active Games</h2>
        {lobbyRooms.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No active games. Upload a handout to create one!</p>
        ) : (
          <div className="space-y-2">
            {lobbyRooms.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-sm">
                <div>
                  <p className="font-medium text-gray-800">{r.hostName}'s game</p>
                  <p className="text-xs text-gray-400">{r.subject} · {r.totalQuestions} questions · {r.playerCount} player{r.playerCount !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => joinRoom(r.id)} className="px-4 py-1.5 btn-brand text-white rounded-lg text-xs font-semibold">Join</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Create a Game — Upload a Handout</p>
        <UploadPanel generating={generating} setGenerating={setGenerating} onQuestions={(qs, subj) => { setQuestions(qs); setSubject(subj); setPhase('generating'); setTimeout(() => setPhase('upload'), 0); }} />
        {questions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-green-600 font-medium">✓ {questions.length} questions generated from "{subject}"</p>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button onClick={createRoom} className="w-full py-2.5 btn-brand text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
              <Play size={16} /> Create Game
            </button>
          </div>
        )}
      </div>
      <button onClick={onBack} className="w-full py-2 text-sm text-gray-400 hover:text-gray-600">← Back</button>
    </div>
  );

  // ── Waiting room ──
  if (phase === 'waiting') {
    const isHost = players[0]?.id === myIdRef.current;
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 text-center">
          <h2 className="font-bold text-gray-900 text-lg">Waiting Room</h2>
          <p className="text-sm text-gray-400">Other students from your school can join from the lobby</p>
          <div className="space-y-2">
            {players.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl text-sm">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">{p.name.charAt(0).toUpperCase()}</div>
                <span className="font-medium text-gray-700">{p.name}</span>
                {p.id === myIdRef.current && <span className="ml-auto text-xs text-blue-500 font-medium">You</span>}
              </div>
            ))}
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          {isHost ? (
            <button onClick={() => socketRef.current?.emit('start-game', { roomId })} disabled={players.length < 2}
              className="w-full py-3 btn-brand text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              <Play size={16} /> Start Game ({players.length} players)
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
              <Loader2 size={16} className="animate-spin" /> Waiting for host to start…
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Active question ──
  if (phase === 'question' && currentQ) return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Question {currentQ.questionIndex + 1} / {currentQ.totalQuestions}</span>
        <span className={`font-bold tabular-nums flex items-center gap-1 ${timeLeft <= 5 ? 'text-red-500' : 'text-gray-700'}`}>
          <Zap size={14} /> {timeLeft}s
        </span>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <p className="text-base font-semibold text-gray-900">{currentQ.question}</p>
        <div className="space-y-2">
          {Object.entries(currentQ.options).map(([key, val]) => {
            const isWrong = wrongAnswers.has(key);
            const isSelected = selected === key;
            let cls = 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer';
            if (isSelected) cls = 'border-blue-400 bg-blue-50';
            if (isWrong) cls = 'border-red-200 bg-red-50 opacity-60 cursor-not-allowed';
            return (
              <button key={key} onClick={() => handleAnswer(key)} disabled={!!selected || isWrong}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all text-sm ${cls}`}>
                <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold shrink-0">{key}</span>
                {val}
              </button>
            );
          })}
        </div>
        {selected && (
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
            <Loader2 size={14} className="animate-spin" /> Waiting for others…
          </div>
        )}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Scores</p>
        {[...players].sort((a, b) => b.score - a.score).map((p, i) => (
          <div key={p.id} className="flex items-center gap-3 text-sm">
            <span className="text-gray-400 w-4">{i + 1}</span>
            <span className="flex-1 font-medium text-gray-700">{p.name} {p.id === myIdRef.current && <span className="text-blue-500 text-xs">(you)</span>}</span>
            <span className="font-bold text-gray-900">{p.score}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Round result ──
  if (phase === 'round-result' && roundResult) return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center space-y-4">
        {roundResult.winner ? (
          <div className="space-y-1">
            <p className="text-2xl">⚡</p>
            <p className="font-bold text-yellow-600 text-lg">{roundResult.winner} answered first!</p>
          </div>
        ) : (
          <p className="text-gray-400 font-medium">Nobody answered in time</p>
        )}
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-left space-y-1">
          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Correct Answer</p>
          <p className="text-sm font-bold text-green-800">{roundResult.correct_answer}. {currentQ?.options[roundResult.correct_answer]}</p>
          {roundResult.explanation && <p className="text-xs text-green-700 italic">{roundResult.explanation}</p>}
        </div>
        <div className="space-y-2 text-left">
          {[...roundResult.players].sort((a, b) => b.score - a.score).map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl text-sm">
              <span className="text-gray-400 w-4">{i + 1}</span>
              <span className="flex-1 font-medium text-gray-700">{p.name} {p.id === myIdRef.current && <span className="text-blue-500 text-xs">(you)</span>}</span>
              <span className="font-bold text-gray-900">{p.score} pts</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
          <Loader2 size={14} className="animate-spin" /> Next question in 5s…
        </div>
      </div>
    </div>
  );

  // ── Game over ──
  if (phase === 'done') return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
        <Trophy size={48} className="mx-auto text-yellow-400" />
        <h2 className="text-2xl font-bold text-gray-900">Game Over!</h2>
        <div className="space-y-2">
          {finalPlayers.map((p, i) => (
            <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl text-sm ${i === 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
              <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
              <span className="flex-1 font-medium text-gray-700">{p.name} {p.id === myIdRef.current && <span className="text-blue-500 text-xs">(you)</span>}</span>
              <span className="font-bold text-gray-900">{p.score} pts</span>
            </div>
          ))}
        </div>
      </div>
      <button onClick={onBack} className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Back to Menu</button>
    </div>
  );

  return null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function QuizGamePage() {
  const { user } = useAuth();
  const { school } = useSelectedSchool();
  const [mode, setMode] = useState<Mode>('menu');
  const [soloQuestions, setSoloQuestions] = useState<Question[]>([]);
  const [soloPhase, setSoloPhase] = useState<SoloPhase>('upload');
  const [generating, setGenerating] = useState(false);

  const playerName = user ? (`${(user as any).firstName || user.firstname || ''} ${(user as any).lastName || user.lastname || ''}`.trim() || 'Student') : 'Student';
  const schoolId = school?.id ?? '';

  if (mode === 'solo') return (
    <div className="flex flex-col items-center min-h-full">
      <div className="w-full max-w-2xl space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => { setMode('menu'); setSoloPhase('upload'); setSoloQuestions([]); }} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
          <h1 className="text-xl font-bold text-gray-900">Quiz Battle — Solo</h1>
        </div>
        {soloPhase === 'upload' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Upload a handout to start</p>
            <UploadPanel generating={generating} setGenerating={setGenerating}
              onQuestions={(qs) => { setSoloQuestions(qs); setSoloPhase('playing'); }} />
          </div>
        )}
        {soloPhase === 'playing' && soloQuestions.length > 0 && (
          <SoloGame questions={soloQuestions} onBack={() => { setSoloPhase('upload'); setSoloQuestions([]); }} />
        )}
      </div>
    </div>
  );

  if (mode === 'multiplayer') return (
    <div className="flex flex-col items-center min-h-full">
      <div className="w-full max-w-2xl space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setMode('menu')} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
          <h1 className="text-xl font-bold text-gray-900">Quiz Battle — Multiplayer</h1>
        </div>
        <MultiplayerGame playerName={playerName} schoolId={schoolId} onBack={() => setMode('menu')} />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center min-h-full">
      <div className="w-full max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quiz Battle</h1>
          <p className="text-gray-500 text-sm mt-1">Upload a class handout — AI generates questions. First to answer correctly wins!</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button onClick={() => setMode('solo')}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-left hover:border-blue-200 hover:shadow-md transition-all group">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100">
              <BookOpen size={24} className="text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-900">Solo Practice</h3>
            <p className="text-sm text-gray-400 mt-1">Upload a handout, get AI-generated questions, and test yourself with a timer.</p>
            <div className="mt-4 flex items-center gap-1 text-sm font-medium text-blue-600">
              Practice Solo <ArrowRight size={14} />
            </div>
          </button>

          <button onClick={() => setMode('multiplayer')}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-left hover:border-purple-200 hover:shadow-md transition-all group">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4 group-hover:bg-purple-100">
              <Users size={24} className="text-purple-600" />
            </div>
            <h3 className="font-bold text-gray-900">Multiplayer</h3>
            <p className="text-sm text-gray-400 mt-1">Host uploads a handout, everyone sees the same questions — fastest correct answer wins!</p>
            <div className="mt-4 flex items-center gap-1 text-sm font-medium text-purple-600">
              Play with Others <ArrowRight size={14} />
            </div>
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 space-y-1">
          <p className="font-semibold">💡 How it works</p>
          <ul className="text-blue-600 space-y-0.5 text-xs list-disc list-inside">
            <li>Upload a PDF, Word doc, or text file (class notes, handouts, textbook pages)</li>
            <li>AI scans it and generates multiple choice questions</li>
            <li>In multiplayer, all players see the same question at the same time</li>
            <li>First player to answer correctly scores a point — fastest finger wins!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
