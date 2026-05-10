'use client';
import { useState } from 'react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Upload, Gamepad2, CheckCircle, XCircle } from 'lucide-react';

interface Question { question: string; options: string[]; answer?: string; }

export default function BookGame() {
  const [step, setStep] = useState<'upload' | 'play' | 'done'>('upload');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState('');
  const [result, setResult] = useState<{ correct: boolean; explanation?: string } | null>(null);
  const [score, setScore] = useState(0);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('document', file);
      const r = await api.upload<any>(endpoints.student.bookgameUpload, fd);
      const qr = await api.post<any>(endpoints.student.bookgameGenerate, { content: r.data?.content });
      setQuestions(qr.data?.questions ?? []);
      setStep('play');
    } catch { toast.error('Failed to process document'); }
    finally { setUploading(false); }
  };

  const checkAnswer = async () => {
    if (!selected) return;
    try {
      const r = await api.post<any>(endpoints.student.bookgameCheck, {
        question: questions[current].question,
        answer: selected,
      });
      setResult(r.data);
      if (r.data?.correct) setScore((s) => s + 1);
    } catch { toast.error('Failed to check answer'); }
  };

  const next = () => {
    if (current + 1 >= questions.length) { setStep('done'); return; }
    setCurrent((c) => c + 1);
    setSelected('');
    setResult(null);
  };

  if (step === 'done') return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <Gamepad2 size={64} className="text-blue-500" />
      <h2 className="text-2xl font-bold text-gray-900">Game Over!</h2>
      <p className="text-gray-500 text-lg">Score: {score} / {questions.length}</p>
      <button onClick={() => { setStep('upload'); setCurrent(0); setScore(0); setResult(null); }}
        className="px-6 py-2.5 btn-brand text-white rounded-xl font-semibold text-sm">Play Again</button>
    </div>
  );

  if (step === 'play' && questions.length > 0) return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Book Game</h1>
        <span className="text-sm text-gray-500">{current + 1} / {questions.length}</span>
      </div>
      <div className="bg-white rounded-2xl card shadow-sm border border-gray-100 p-6 space-y-4">
        <p className="font-medium text-gray-900">{questions[current].question}</p>
        <div className="space-y-2">
          {questions[current].options.map((opt) => (
            <label key={opt} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-100 hover:border-green-300 transition-colors">
              <input type="radio" name="answer" value={opt} checked={selected === opt}
                onChange={() => setSelected(opt)} className="accent-blue-600" />
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
        {result && (
          <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${result.correct ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
            {result.correct ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {result.correct ? 'Correct!' : 'Incorrect'} {result.explanation}
          </div>
        )}
        {!result ? (
          <button onClick={checkAnswer} disabled={!selected}
            className="w-full py-2.5 btn-brand text-white rounded-xl font-semibold text-sm disabled:opacity-50">Check Answer</button>
        ) : (
          <button onClick={next} className="w-full py-2.5 bg-gray-900 text-white rounded-xl font-semibold text-sm">
            {current + 1 >= questions.length ? 'Finish' : 'Next Question'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">Book Game</h1>
      <div className="bg-white rounded-2xl card shadow-sm border border-gray-100 p-8 text-center">
        <Gamepad2 size={48} className="text-blue-500 mx-auto mb-4" />
        <h2 className="font-bold text-gray-900 mb-2">Upload a Document</h2>
        <p className="text-gray-500 text-sm mb-6">Upload a PDF or document and we'll generate quiz questions from it using AI.</p>
        <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 btn-brand text-white rounded-xl font-semibold text-sm  transition-colors">
          <Upload size={16} /> {uploading ? 'Processing…' : 'Upload Document'}
          <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
      </div>
    </div>
  );
}
