'use client';
import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, X } from 'lucide-react';

interface Props {
  onSend: (file: File) => void;
  accentColor?: string; // tailwind bg class e.g. 'bg-blue-600'
}

function pad(n: number) { return String(n).padStart(2, '0'); }
function formatDuration(sec: number) { return `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`; }

export default function VoiceRecorder({ onSend, accentColor = 'bg-blue-600' }: Props) {
  const [state, setState] = useState<'idle' | 'recording' | 'preview'>('idle');
  const [duration, setDuration] = useState(0);   // seconds elapsed while recording
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up object URL on unmount
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      // Pick a supported mime type
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', '']
        .find(t => t === '' || MediaRecorder.isTypeSupported(t)) ?? '';

      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRef.current = recorder;

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const recordedMime = recorder.mimeType || 'audio/webm';
        const b = new Blob(chunksRef.current, { type: recordedMime });
        const url = URL.createObjectURL(b);
        setBlob(b);
        setAudioUrl(url);
        setState('preview');
        // Stop all tracks so the mic indicator goes away
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start(100); // collect chunks every 100 ms
      setState('recording');
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch {
      alert('Microphone access was denied or is unavailable.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    mediaRef.current?.stop();
  };

  const cancel = () => {
    if (state === 'recording') {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      mediaRef.current?.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setBlob(null);
    setDuration(0);
    setState('idle');
  };

  const send = () => {
    if (!blob) return;
    // Derive extension from mime type
    const ext = blob.type.includes('ogg') ? 'ogg' : 'webm';
    const file = new File([blob], `voice-note-${Date.now()}.${ext}`, { type: blob.type });
    onSend(file);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setBlob(null);
    setDuration(0);
    setState('idle');
  };

  // ── IDLE: just show the mic button ──────────────────────────────────────
  if (state === 'idle') {
    return (
      <button
        type="button"
        onClick={startRecording}
        title="Record voice note"
        className="p-2.5 text-gray-400 hover:text-gray-600 rounded-xl transition-colors"
      >
        <Mic size={18} />
      </button>
    );
  }

  // ── RECORDING ──────────────────────────────────────────────────────────
  if (state === 'recording') {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 bg-red-50 border border-red-200 rounded-xl">
        {/* animated dot */}
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
        <span className="text-xs font-mono text-red-600 w-10">{formatDuration(duration)}</span>
        {/* cancel */}
        <button type="button" onClick={cancel} title="Cancel" className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
          <X size={15} />
        </button>
        {/* stop & preview */}
        <button type="button" onClick={stopRecording} title="Stop recording"
          className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
          <Square size={13} />
        </button>
      </div>
    );
  }

  // ── PREVIEW ────────────────────────────────────────────────────────────
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-xl">
      <audio src={audioUrl ?? ''} controls className="h-8 max-w-[160px] sm:max-w-[200px]" />
      {/* discard */}
      <button type="button" onClick={cancel} title="Discard" className="p-1 text-gray-400 hover:text-red-500 rounded-lg transition-colors">
        <X size={15} />
      </button>
      {/* send */}
      <button type="button" onClick={send} title="Send voice note"
        className={`p-1.5 ${accentColor} text-white rounded-lg hover:opacity-90 transition-opacity`}>
        <Send size={13} />
      </button>
    </div>
  );
}
