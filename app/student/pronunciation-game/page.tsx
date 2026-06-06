'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Mic, MicOff, Volume2, Trophy, Users, Play, ArrowRight, RotateCcw, Loader2, Check, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// ─── Types ────────────────────────────────────────────────────────────────────
type GameMode = 'menu' | 'solo' | 'multiplayer';
type SoloPhase = 'intro' | 'listening' | 'result' | 'done';
type MultiPhase = 'lobby' | 'waiting' | 'round' | 'round-result' | 'done';
type Difficulty = 'beginner' | 'intermediate' | 'advanced';

interface SoloResult { word: string; transcript: string; accuracy: number; correct: boolean; }
interface Player { id: string; name: string; score: number; }
interface RoundResult { playerId: string; name: string; transcript: string; score: number; accuracy: number; }

// ─── Word lists (solo) ────────────────────────────────────────────────────────
const WORDS: Record<Difficulty, string[]> = {
  beginner: ['apple', 'chair', 'table', 'water', 'light', 'house', 'green', 'happy', 'music', 'dance'],
  intermediate: ['beautiful', 'adventure', 'knowledge', 'chocolate', 'schedule', 'hierarchy', 'necessary', 'temperature', 'vocabulary', 'pronunciation'],
  advanced: ['entrepreneurship', 'conscientious', 'pharmaceutical', 'ubiquitous', 'onomatopoeia', 'particularly', 'infrastructure', 'authentication', 'enthusiastic', 'revolutionary'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function similarity(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 100;
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  return Math.round((matches / longer.length) * 100);
}

function speak(text: string) {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.85;
  window.speechSynthesis.speak(utt);
}

function useSpeechRecognition() {
  const recRef = useRef<any>(null);
  const [supported, setSupported] = useState(true);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    const r = new SR();
    r.continuous = false;
    r.interimResults = false;
    r.lang = 'en-US';
    recRef.current = r;
  }, []);

  const listenViaBrowser = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      const r = recRef.current;
      if (!r) return reject('not-supported');
      let resolved = false;
      r.onresult = (e: any) => { resolved = true; resolve(e.results[0][0].transcript); };
      r.onerror = (e: any) => { if (!resolved) reject(e.error); };
      r.onend = () => { setTimeout(() => { if (!resolved) reject('no-speech'); }, 100); };
      r.start();
    });
  }, []);

  const listenViaWhisper = useCallback((): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = ['audio/webm', 'audio/mp4', 'audio/ogg'].find(t => MediaRecorder.isTypeSupported(t)) || '';
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        const chunks: BlobPart[] = [];
        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          const ext = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm';
          const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
          const fd = new FormData();
          fd.append('audio', blob, `audio.${ext}`);
          const token = document.cookie.split('; ').find(r => r.startsWith('gka_token='))?.split('=')[1] || '';
          try {
            const res = await fetch('/api/student/pronunciation-game/transcribe', {
              method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
            });
            const data = await res.json();
            if (data.transcript) resolve(data.transcript.trim());
            else reject('no-speech');
          } catch { reject('network'); }
        };
        recorder.start();
        setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, 5000);
      } catch (e: any) {
        reject(e.name === 'NotAllowedError' ? 'not-allowed' : 'audio-capture');
      }
    });
  }, []);

  const listen = useCallback(async (): Promise<string> => {
    if (recRef.current) {
      try { return await listenViaBrowser(); }
      catch (e: any) {
        if (e === 'not-allowed' || e === 'service-not-allowed') throw e;
        // Falls through to Whisper on iOS/no-speech/other failures
      }
    }
    return listenViaWhisper();
  }, [listenViaBrowser, listenViaWhisper]);

  const stop = useCallback(() => { recRef.current?.stop(); }, []);

  return { listen, stop, supported };
}

// ─── Solo Game ────────────────────────────────────────────────────────────────
function SoloGame({ difficulty, onBack }: { difficulty: Difficulty; onBack: () => void }) {
  const words = useRef([...WORDS[difficulty]].sort(() => Math.random() - 0.5).slice(0, 8));
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<SoloPhase>('intro');
  const [transcript, setTranscript] = useState('');
  const [accuracy, setAccuracy] = useState(0);
  const [results, setResults] = useState<SoloResult[]>([]);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [textInput, setTextInput] = useState('');
  const [isIOS, setIsIOS] = useState(false);
  const { listen, stop, supported } = useSpeechRecognition();

  const currentWord = words.current[idx];

  const submitAnswer = (heard: string) => {
    const acc = similarity(heard, currentWord);
    setTranscript(heard);
    setAccuracy(acc);
    setPhase('result');
    setResults(prev => [...prev, { word: currentWord, transcript: heard, accuracy: acc, correct: acc >= 70 }]);
  };

  const startListening = async () => {
    setError('');
    setListening(true);
    setPhase('listening');
    try {
      const heard = await listen();
      submitAnswer(heard);
    } catch (e: any) {
      if (e === 'not-allowed' || e === 'not-supported' || e === 'service-not-allowed') {
        setIsIOS(true);
        setError('Microphone not available. Please type your answer instead.');
      } else if (e === 'no-speech') {
        setError('No speech detected. Please speak clearly and try again.');
      } else {
        setError(`Speech error: "${e}". Try again or use a different browser.`);
      }
      setPhase('intro');
    } finally {
      setListening(false);
    }
  };

  const next = () => {
    if (idx + 1 >= words.current.length) {
      setPhase('done');
    } else {
      setIdx(i => i + 1);
      setPhase('intro');
      setTranscript('');
    }
  };

  if (phase === 'done') {
    const correct = results.filter(r => r.correct).length;
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
          <Trophy size={48} className="mx-auto text-yellow-400" />
          <h2 className="text-2xl font-bold text-gray-900">Game Over!</h2>
          <p className="text-gray-500 text-lg">{correct} / {results.length} correct</p>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${(correct / results.length) * 100}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {results.map((r, i) => (
            <div key={i} className="flex items-center justify-between p-4 gap-4">
              <div className="flex items-center gap-3">
                {r.correct ? <Check size={16} className="text-green-500 shrink-0" /> : <X size={16} className="text-red-400 shrink-0" />}
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{r.word}</p>
                  <p className="text-xs text-gray-400">You said: "{r.transcript}"</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold" style={{ color: r.accuracy >= 70 ? '#16a34a' : '#dc2626' }}>{r.accuracy}%</p>
                <button onClick={() => speak(r.word)} className="text-xs text-blue-500 hover:underline flex items-center gap-1 ml-auto">
                  <Volume2 size={12} /> Hear it
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onBack} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Back</button>
          <button onClick={() => { setIdx(0); setPhase('intro'); setResults([]); words.current = [...WORDS[difficulty]].sort(() => Math.random() - 0.5).slice(0, 8); }}
            className="flex-1 py-2.5 rounded-xl btn-brand text-white text-sm font-semibold flex items-center justify-center gap-2">
            <RotateCcw size={16} /> Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Word {idx + 1} of {words.current.length}</span>
        <span className="capitalize">{difficulty}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${(idx / words.current.length) * 100}%` }} />
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-6">
        <p className="text-sm text-gray-400 font-medium uppercase tracking-wide">Pronounce this word</p>
        <h1 className="text-5xl font-bold text-gray-900">{currentWord}</h1>

        {phase === 'intro' && (
          <div className="space-y-3">
            <button onClick={() => speak(currentWord)} className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 text-sm font-medium">
              <Volume2 size={16} /> Hear pronunciation
            </button>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {isIOS || !supported ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-400">Type the word as you would pronounce it (spell it out phonetically)</p>
                <input
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && textInput.trim()) { submitAnswer(textInput.trim()); setTextInput(''); } }}
                  placeholder={`Type "${currentWord}"...`}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 text-center"
                />
                <button onClick={() => { submitAnswer(textInput.trim()); setTextInput(''); }} disabled={!textInput.trim()}
                  className="w-full py-3 btn-brand text-white rounded-xl font-semibold text-sm disabled:opacity-50">
                  Submit
                </button>
              </div>
            ) : (
              <button onClick={startListening}
                className="w-full py-3 btn-brand text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
                <Mic size={18} /> Start Recording
              </button>
            )}
          </div>
        )}

        {phase === 'listening' && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-red-500">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium">Recording… speak now (up to 5s)</span>
            </div>
          </div>
        )}

        {phase === 'result' && (
          <div className="space-y-4">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${accuracy >= 70 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {accuracy >= 70 ? <Check size={16} /> : <X size={16} />}
              {accuracy}% accuracy
            </div>
            <div className="text-sm text-gray-500 space-y-1">
              <p>You said: <span className="font-medium text-gray-700">"{transcript}"</span></p>
              <p>Correct: <span className="font-medium text-gray-700">"{currentWord}"</span></p>
            </div>
            <button onClick={() => speak(currentWord)} className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-medium">
              <Volume2 size={16} /> Hear correct pronunciation
            </button>
            <button onClick={next} className="w-full py-3 btn-brand text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
              {idx + 1 >= words.current.length ? 'See Results' : 'Next Word'} <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Multiplayer Game ─────────────────────────────────────────────────────────
function MultiplayerGame({ playerName, onBack }: { playerName: string; onBack: () => void }) {
  const [phase, setPhase] = useState<MultiPhase>('lobby');
  const [roomId, setRoomId] = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentWord, setCurrentWord] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [totalWords, setTotalWords] = useState(10);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [roundWinner, setRoundWinner] = useState('');
  const [finalPlayers, setFinalPlayers] = useState<Player[]>([]);
  const [transcript, setTranscript] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittedPlayers, setSubmittedPlayers] = useState<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);
  const myIdRef = useRef('');
  const { listen, stop, supported } = useSpeechRecognition();
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [textInput, setTextInput] = useState('');
  const [isIOS, setIsIOS] = useState(false);

  const WS_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

  useEffect(() => {
    const socket = io(`${WS_URL}/pronunciation-game`, { transports: ['websocket'] });
    socketRef.current = socket;
    myIdRef.current = socket.id ?? '';

    socket.on('connect', () => { myIdRef.current = socket.id ?? ''; });

    socket.on('room-update', ({ players: ps }) => setPlayers(ps));
    socket.on('player-left', ({ players: ps }) => setPlayers(ps));
    socket.on('error', ({ message }) => setError(message));

    socket.on('game-started', ({ word, wordIndex: wi, totalWords: tw }) => {
      setCurrentWord(word);
      setWordIndex(wi);
      setTotalWords(tw);
      setSubmitted(false);
      setSubmittedPlayers(new Set());
      setPhase('round');
    });

    socket.on('player-submitted', ({ playerId }) => {
      setSubmittedPlayers(prev => new Set([...prev, playerId]));
    });

    socket.on('round-result', ({ word, results, winner, players: ps }) => {
      setRoundResults(results);
      setRoundWinner(winner);
      setPlayers(ps);
      setPhase('round-result');
      speak(word); // play correct pronunciation after round
    });

    socket.on('next-word', ({ word, wordIndex: wi, totalWords: tw }) => {
      setCurrentWord(word);
      setWordIndex(wi);
      setTotalWords(tw);
      setSubmitted(false);
      setSubmittedPlayers(new Set());
      setTranscript('');
      setPhase('round');
    });

    socket.on('game-over', ({ players: ps }) => {
      setFinalPlayers(ps);
      setPhase('done');
    });

    return () => { socket.disconnect(); };
  }, [WS_URL]);

  const joinRoom = () => {
    if (!roomInput.trim()) return;
    const id = roomInput.trim().toUpperCase();
    setRoomId(id);
    socketRef.current?.emit('join-room', { roomId: id, playerName, difficulty });
    setPhase('waiting');
    setError('');
  };

  const startGame = () => {
    socketRef.current?.emit('start-game', { roomId });
  };

  const recordAndSubmit = async () => {
    setError('');
    setListening(true);
    try {
      const heard = await listen();
      setTranscript(heard);
      setSubmitted(true);
      socketRef.current?.emit('submit-transcript', { roomId, transcript: heard });
    } catch (e: any) {
      if (e === 'not-allowed' || e === 'not-supported' || e === 'service-not-allowed') {
        setIsIOS(true);
        setError('Microphone not available. Please type your answer instead.');
      } else if (e === 'no-speech') {
        setError('No speech detected. Try again.');
      } else {
        setError(`Speech error: "${e}". Try again or use a different browser.`);
      }
    } finally {
      setListening(false);
    }
  };

  const submitText = () => {
    if (!textInput.trim()) return;
    setTranscript(textInput.trim());
    setSubmitted(true);
    socketRef.current?.emit('submit-transcript', { roomId, transcript: textInput.trim() });
    setTextInput('');
  };

  // Lobby
  if (phase === 'lobby') {
    const generatedCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    return (
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-gray-900 text-lg">Join or Create a Room</h2>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Difficulty</label>
            <div className="flex gap-2 mt-1">
              {(['beginner', 'intermediate', 'advanced'] as Difficulty[]).map(d => (
                <button key={d} onClick={() => setDifficulty(d)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize border transition-colors ${difficulty === d ? 'btn-brand text-white border-transparent' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Room Code</label>
            <input value={roomInput} onChange={e => setRoomInput(e.target.value.toUpperCase())}
              placeholder={`e.g. ${generatedCode}`}
              className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 font-mono tracking-widest uppercase" />
            <p className="text-xs text-gray-400 mt-1">Share this code with friends to join your room</p>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button onClick={joinRoom} disabled={!roomInput.trim()}
            className="w-full py-3 btn-brand text-white rounded-xl font-semibold text-sm disabled:opacity-50">
            Join Room
          </button>
        </div>
        <button onClick={onBack} className="w-full py-2 text-sm text-gray-400 hover:text-gray-600">← Back</button>
      </div>
    );
  }

  // Waiting room
  if (phase === 'waiting') {
    const isFirst = players[0]?.id === myIdRef.current;
    return (
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 text-center">
          <h2 className="font-bold text-gray-900 text-lg">Room: <span className="font-mono text-blue-600">{roomId}</span></h2>
          <p className="text-sm text-gray-500">Share this code with your friends!</p>
          <div className="space-y-2">
            {players.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl text-sm">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-gray-700">{p.name}</span>
                {p.id === myIdRef.current && <span className="ml-auto text-xs text-blue-500 font-medium">You</span>}
              </div>
            ))}
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          {isFirst ? (
            <button onClick={startGame} disabled={players.length < 2}
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

  // Active round
  if (phase === 'round') {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Word {wordIndex + 1} / {totalWords}</span>
          <span>{submittedPlayers.size} / {players.length} submitted</span>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-6">
          <p className="text-sm text-gray-400 uppercase tracking-wide font-medium">Pronounce this word</p>
          <h1 className="text-5xl font-bold text-gray-900">{currentWord}</h1>
          {!submitted ? (
            <div className="space-y-3">
              {error && <p className="text-xs text-red-500">{error}</p>}
              {isIOS || !supported ? (
                <>
                  <p className="text-xs text-gray-400">Type the word as you pronounce it</p>
                  <input
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') submitText(); }}
                    placeholder={`Type "${currentWord}"...`}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 text-center"
                  />
                  <button onClick={submitText} disabled={!textInput.trim()}
                    className="w-full py-3 btn-brand text-white rounded-xl font-semibold text-sm disabled:opacity-50">
                    Submit
                  </button>
                </>
              ) : listening ? (
                <div className="flex items-center justify-center gap-2 text-red-500">
                  <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-medium">Listening…</span>
                </div>
              ) : (
                <button onClick={recordAndSubmit}
                  className="w-full py-3 btn-brand text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
                  <Mic size={18} /> Record & Submit
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 text-green-700 text-sm font-semibold">
                <Check size={16} /> Submitted!
              </div>
              <p className="text-sm text-gray-400">You said: "{transcript}"</p>
              <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                <Loader2 size={14} className="animate-spin" /> Waiting for others…
              </div>
            </div>
          )}
        </div>
        {/* Scoreboard */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Scores</p>
          {[...players].sort((a, b) => b.score - a.score).map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 text-sm">
              <span className="text-gray-400 w-4">{i + 1}</span>
              <span className="flex-1 font-medium text-gray-700">{p.name} {p.id === myIdRef.current && <span className="text-blue-500 text-xs">(you)</span>}</span>
              <span className="font-bold text-gray-900">{p.score}</span>
              {submittedPlayers.has(p.id) && <Check size={14} className="text-green-500" />}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Round result
  if (phase === 'round-result') {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center space-y-4">
          <p className="text-sm text-gray-400 font-medium">Word was</p>
          <h2 className="text-3xl font-bold text-gray-900">{currentWord}</h2>
          <button onClick={() => speak(currentWord)} className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-medium">
            <Volume2 size={16} /> Hear correct pronunciation
          </button>
          {roundWinner && (
            <p className="text-sm font-semibold text-yellow-600 bg-yellow-50 px-4 py-2 rounded-xl inline-block">
              🏆 {roundWinner} wins this round!
            </p>
          )}
          <div className="space-y-2 text-left">
            {roundResults.sort((a, b) => b.accuracy - a.accuracy).map(r => (
              <div key={r.playerId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl text-sm">
                <div className="flex-1">
                  <p className="font-medium text-gray-700">{r.name} {r.playerId === myIdRef.current && <span className="text-blue-500 text-xs">(you)</span>}</p>
                  <p className="text-xs text-gray-400">Said: "{r.transcript}"</p>
                </div>
                <span className="font-bold text-sm" style={{ color: r.accuracy >= 70 ? '#16a34a' : '#dc2626' }}>{r.accuracy}%</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
            <Loader2 size={14} className="animate-spin" /> Next word coming up…
          </div>
        </div>
      </div>
    );
  }

  // Game over
  if (phase === 'done') {
    const me = finalPlayers.findIndex(p => p.id === myIdRef.current);
    return (
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
        <button onClick={onBack} className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
          Back to Menu
        </button>
      </div>
    );
  }

  return null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PronunciationGamePage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<GameMode>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const playerName = user ? (`${(user as any).firstName || user.firstname || ''} ${(user as any).lastName || user.lastname || ''}`.trim() || 'Student') : 'Student';

  if (mode === 'solo') return (
    <div className="flex flex-col items-center min-h-full">
      <div className="w-full max-w-2xl space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setMode('menu')} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
          <h1 className="text-xl font-bold text-gray-900">Pronunciation Game — Solo</h1>
        </div>
        <SoloGame difficulty={difficulty} onBack={() => setMode('menu')} />
      </div>
    </div>
  );

  if (mode === 'multiplayer') return (
    <div className="flex flex-col items-center min-h-full">
      <div className="w-full max-w-2xl space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setMode('menu')} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
          <h1 className="text-xl font-bold text-gray-900">Pronunciation Game — Multiplayer</h1>
        </div>
        <MultiplayerGame playerName={playerName} onBack={() => setMode('menu')} />
      </div>
    </div>
  );

  // Menu
  return (
    <div className="flex flex-col items-center min-h-full">
    <div className="w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pronunciation Game</h1>
        <p className="text-gray-500 text-sm mt-1">Practice pronouncing words — solo or compete with classmates!</p>
      </div>

      {/* Difficulty selector */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Choose Difficulty</p>
        <div className="grid grid-cols-3 gap-3">
          {([
            { key: 'beginner', label: 'Beginner', desc: 'Simple everyday words', color: 'green' },
            { key: 'intermediate', label: 'Intermediate', desc: 'Longer, trickier words', color: 'blue' },
            { key: 'advanced', label: 'Advanced', desc: 'Complex vocabulary', color: 'purple' },
          ] as const).map(({ key, label, desc, color }) => (
            <button key={key} onClick={() => setDifficulty(key)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${difficulty === key ? `border-${color}-400 bg-${color}-50` : 'border-gray-100 hover:border-gray-200'}`}>
              <p className="font-semibold text-sm text-gray-800">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Mode cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button onClick={() => setMode('solo')}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-left hover:border-blue-200 hover:shadow-md transition-all group">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100">
            <Mic size={24} className="text-blue-600" />
          </div>
          <h3 className="font-bold text-gray-900">Solo Practice</h3>
          <p className="text-sm text-gray-400 mt-1">Practice on your own. Get instant feedback and hear the correct pronunciation after each word.</p>
          <div className="mt-4 flex items-center gap-1 text-sm font-medium text-blue-600">
            Play Solo <ArrowRight size={14} />
          </div>
        </button>

        <button onClick={() => setMode('multiplayer')}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-left hover:border-purple-200 hover:shadow-md transition-all group">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4 group-hover:bg-purple-100">
            <Users size={24} className="text-purple-600" />
          </div>
          <h3 className="font-bold text-gray-900">Multiplayer</h3>
          <p className="text-sm text-gray-400 mt-1">Compete with classmates in real-time. Best pronunciation wins each round!</p>
          <div className="mt-4 flex items-center gap-1 text-sm font-medium text-purple-600">
            Play with Others <ArrowRight size={14} />
          </div>
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 space-y-1">
        <p className="font-semibold">💡 How it works</p>
        <ul className="text-blue-600 space-y-0.5 text-xs list-disc list-inside">
          <li>A word is shown on screen — try to pronounce it</li>
          <li>The app listens and scores how close you were</li>
          <li>After each word, you hear the correct pronunciation</li>
          <li>In multiplayer, the player with the best pronunciation wins the round</li>
        </ul>
      </div>
    </div>
    </div>
  );
}
