'use client';
import { useState, useRef, useEffect } from 'react';
import { RotateCcw, Star } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Mode = 'menu' | 'alphabets' | 'numbers';
type DropState = 'idle' | 'correct' | 'wrong';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const NUMBERS  = Array.from({ length: 10 }, (_, i) => String(i));

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function makeRound(items: string[], count = 6) {
  const targets = shuffle(items).slice(0, count);
  return { targets, tiles: shuffle(targets) };
}

// ─── Confetti burst ───────────────────────────────────────────────────────────
function Confetti() {
  const pieces = Array.from({ length: 18 }, (_, i) => i);
  const colors = ['#f59e0b','#10b981','#3b82f6','#ec4899','#8b5cf6','#f97316'];
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map(i => (
        <span key={i} className="absolute top-0 text-2xl animate-confetti"
          style={{
            left: `${(i / pieces.length) * 100}%`,
            animationDelay: `${(i * 0.07).toFixed(2)}s`,
            color: colors[i % colors.length],
          }}>
          {['⭐','🎉','✨','🌟','🎊'][i % 5]}
        </span>
      ))}
    </div>
  );
}

// ─── Drop target ─────────────────────────────────────────────────────────────
function DropTarget({ label, state, onDrop }: {
  label: string;
  state: DropState;
  onDrop: (val: string) => void;
}) {
  const [over, setOver] = useState(false);

  const bg = state === 'correct' ? 'bg-green-100 border-green-400 scale-105'
           : state === 'wrong'   ? 'bg-red-100 border-red-400 animate-shake'
           : over                ? 'bg-blue-50 border-blue-400 scale-105'
           : 'bg-white border-gray-300';

  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); onDrop(e.dataTransfer.getData('text')); }}
      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-dashed flex items-center justify-center text-2xl sm:text-3xl font-black transition-all duration-200 select-none ${bg}`}
    >
      {state === 'correct' ? label : state === 'wrong' ? '✗' : '?'}
    </div>
  );
}

// ─── Draggable tile ───────────────────────────────────────────────────────────
function Tile({ label, used }: { label: string; used: boolean }) {
  if (used) return <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl opacity-0" />;
  return (
    <div
      draggable
      onDragStart={e => e.dataTransfer.setData('text', label)}
      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-blue-300 bg-blue-50 flex items-center justify-center text-2xl sm:text-3xl font-black text-blue-700 cursor-grab active:cursor-grabbing hover:scale-110 hover:shadow-lg transition-all duration-150 select-none animate-pop"
    >
      {label}
    </div>
  );
}

// ─── Game board ───────────────────────────────────────────────────────────────
function GameBoard({ items, mode, onBack }: { items: string[]; mode: 'alphabets' | 'numbers'; onBack: () => void }) {
  const [round, setRound] = useState(() => makeRound(items));
  const [dropStates, setDropStates] = useState<Record<string, DropState>>({});
  const [usedTiles, setUsedTiles] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const wrongTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const solved = round.targets.every(t => dropStates[t] === 'correct');

  useEffect(() => {
    if (solved) {
      setScore(s => s + round.targets.length);
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 2500);
      return () => clearTimeout(t);
    }
  }, [solved]);

  const handleDrop = (target: string, value: string) => {
    if (dropStates[target] === 'correct') return;
    if (value === target) {
      setDropStates(prev => ({ ...prev, [target]: 'correct' }));
      setUsedTiles(prev => new Set([...prev, value]));
    } else {
      setDropStates(prev => ({ ...prev, [target]: 'wrong' }));
      clearTimeout(wrongTimers.current[target]);
      wrongTimers.current[target] = setTimeout(() => {
        setDropStates(prev => ({ ...prev, [target]: 'idle' }));
      }, 700);
    }
  };

  const nextRound = () => {
    setTotalRounds(r => r + 1);
    setRound(makeRound(items));
    setDropStates({});
    setUsedTiles(new Set());
  };

  const colors = mode === 'alphabets'
    ? ['bg-pink-100','bg-yellow-100','bg-green-100','bg-blue-100','bg-purple-100','bg-orange-100']
    : ['bg-sky-100','bg-rose-100','bg-lime-100','bg-violet-100','bg-amber-100','bg-teal-100'];

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-xl mx-auto">
      {showConfetti && <Confetti />}

      {/* Score bar */}
      <div className="w-full flex items-center justify-between px-2">
        <span className="text-sm font-semibold text-gray-500">Round {totalRounds + 1}</span>
        <div className="flex items-center gap-1 text-yellow-500 font-bold text-sm">
          <Star size={16} fill="currentColor" /> {score} pts
        </div>
        <button onClick={onBack} className="text-xs text-gray-400 hover:text-gray-600">← Back</button>
      </div>

      {/* Instruction */}
      <p className="text-base font-semibold text-gray-600 text-center">
        Drag each {mode === 'alphabets' ? 'letter' : 'number'} to its matching box 👇
      </p>

      {/* Drop targets */}
      <div className="flex flex-wrap justify-center gap-3">
        {round.targets.map((t, i) => (
          <div key={t} className="flex flex-col items-center gap-1">
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-black text-gray-400 ${colors[i % colors.length]}`}>
              {t}
            </div>
            <DropTarget label={t} state={dropStates[t] ?? 'idle'} onDrop={val => handleDrop(t, val)} />
          </div>
        ))}
      </div>

      {/* Tiles */}
      {!solved && (
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {round.tiles.map(t => (
            <Tile key={t} label={t} used={usedTiles.has(t)} />
          ))}
        </div>
      )}

      {/* Round complete */}
      {solved && (
        <div className="text-center space-y-4 animate-pop">
          <p className="text-2xl font-black text-green-600">🎉 Well done!</p>
          <button onClick={nextRound}
            className="flex items-center gap-2 mx-auto px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-base transition-all">
            <RotateCcw size={18} /> Next Round
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NurseryGamePage() {
  const [mode, setMode] = useState<Mode>('menu');

  if (mode !== 'menu') return (
    <div className="flex flex-col items-center min-h-full pt-4 px-2">
      <h1 className="text-xl font-black text-gray-800 mb-6">
        {mode === 'alphabets' ? '🔤 Alphabet Match' : '🔢 Number Match'}
      </h1>
      <GameBoard items={mode === 'alphabets' ? ALPHABET : NUMBERS} mode={mode} onBack={() => setMode('menu')} />
    </div>
  );

  return (
    <div className="flex flex-col items-center min-h-full pt-6 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black text-gray-900">🧒 Nursery Learning Game</h1>
          <p className="text-gray-500 text-sm">Drag and drop to match — let's learn!</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setMode('alphabets')}
            className="group bg-white rounded-3xl border-2 border-pink-200 p-6 text-center hover:border-pink-400 hover:shadow-lg transition-all space-y-3">
            <div className="text-5xl animate-bounce-slow">🔤</div>
            <p className="font-black text-lg text-gray-800">Alphabets</p>
            <p className="text-xs text-gray-400">Match A–Z letters</p>
          </button>
          <button onClick={() => setMode('numbers')}
            className="group bg-white rounded-3xl border-2 border-blue-200 p-6 text-center hover:border-blue-400 hover:shadow-lg transition-all space-y-3">
            <div className="text-5xl animate-bounce-slow" style={{ animationDelay: '0.3s' }}>🔢</div>
            <p className="font-black text-lg text-gray-800">Numbers</p>
            <p className="text-xs text-gray-400">Match 0–9 digits</p>
          </button>
        </div>
      </div>
    </div>
  );
}
