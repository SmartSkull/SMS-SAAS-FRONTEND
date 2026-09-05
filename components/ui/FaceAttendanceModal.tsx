'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, ScanFace, CheckCircle, AlertCircle, Loader2, UserPlus, RefreshCw, FlipHorizontal } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import clsx from 'clsx';

type Stage =
  | 'ready'
  | 'capturing'
  | 'recognizing'
  | 'not_enrolled'
  | 'enrolling'
  | 'success'
  | 'enrolled'
  | 'error';

interface Props {
  onClose: () => void;
  onClockedIn: (message: string) => void;
  primaryColor?: string;
  /** Override default student endpoints for staff use */
  clockInEndpoint?: string;
  enrollEndpoint?: string;
}

export default function FaceAttendanceModal({ onClose, onClockedIn, primaryColor = '#2563eb', clockInEndpoint, enrollEndpoint }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [stage, setStage]         = useState<Stage>('ready');
  const [message, setMessage]     = useState('');
  const [capturedUrl, setCapturedUrl]   = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  // Camera switching
  const [cameras, setCameras]         = useState<MediaDeviceInfo[]>([]);
  const [camIndex, setCamIndex]       = useState(0);   // index into cameras[]
  const [usingFront, setUsingFront]   = useState(true);

  /* ── Enumerate cameras on mount ── */
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const vids = devices.filter(d => d.kind === 'videoinput');
        setCameras(vids);
      })
      .catch(() => {});
  }, []);

  /* ── Start camera with a specific device or facing mode ── */
  const startCamera = useCallback(async (deviceId?: string, front = true) => {
    // Stop any existing stream first
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
          : { facingMode: front ? 'user' : 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setUsingFront(front);
    } catch {
      setStage('error');
      setMessage('Could not access camera. Please allow camera permission and try again.');
    }
  }, []);

  /* ── Stop camera ── */
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  /* ── Initial start ── */
  useEffect(() => {
    startCamera(undefined, true);
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  /* ── Switch camera ── */
  const switchCamera = useCallback(async () => {
    if (cameras.length >= 2) {
      // Cycle through enumerated device IDs
      const nextIndex = (camIndex + 1) % cameras.length;
      const nextCam   = cameras[nextIndex];
      setCamIndex(nextIndex);
      // Guess front/back from label
      const label = (nextCam.label ?? '').toLowerCase();
      const isFront = label.includes('front') || label.includes('user') || label.includes('facetime') || nextIndex === 0;
      await startCamera(nextCam.deviceId, isFront);
    } else {
      // Fallback: toggle facingMode
      const next = !usingFront;
      await startCamera(undefined, next);
    }
  }, [cameras, camIndex, usingFront, startCamera]);

  /* ── Capture frame ── */
  const captureFrame = (): Promise<Blob | null> => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return Promise.resolve(null);
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.resolve(null);
    // Mirror the captured image if using front camera so it matches real orientation
    if (usingFront) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  };

  /* ── Handle Clock-In ── */
  const handleClockIn = async () => {
    setStage('capturing');
    const blob = await captureFrame();
    if (!blob) { setStage('error'); setMessage('Failed to capture photo'); return; }
    const url = URL.createObjectURL(blob);
    setCapturedUrl(url);
    setCapturedBlob(blob);
    setStage('recognizing');
    try {
      const form = new FormData();
      form.append('photo', blob, 'face.jpg');
      const res = await api.upload<any>(clockInEndpoint ?? endpoints.student.attendanceFaceClockIn, form);
      if (res?.enrolled === false) { setStage('not_enrolled'); setMessage(res.message ?? 'Face not registered.'); return; }
      if (res?.alreadyClockedIn)   { setStage('success');      setMessage('You have already clocked in today.'); return; }
      setStage('success');
      setMessage(res?.message ?? 'Clocked in successfully!');
      onClockedIn(res?.message ?? 'Clocked in via face recognition');
    } catch (e: any) {
      setStage('error');
      setMessage(e?.message ?? 'Face recognition failed. Please try again.');
    }
  };

  /* ── Handle Enroll ── */
  const handleEnroll = async () => {
    let blob = capturedBlob;
    if (!blob) {
      setStage('capturing');
      blob = await captureFrame();
      if (!blob) { setStage('error'); setMessage('Failed to capture photo'); return; }
      setCapturedBlob(blob);
      setCapturedUrl(URL.createObjectURL(blob));
    }
    await doEnroll(blob);
  };

  const doEnroll = async (blob: Blob) => {
    setStage('enrolling');
    try {
      const form = new FormData();
      form.append('photo', blob, 'face.jpg');
      const res = await api.upload<any>(enrollEndpoint ?? endpoints.student.attendanceFaceEnroll, form);
      setStage('enrolled');
      setMessage(res?.message ?? 'Face enrolled! You can now clock in with your face.');
    } catch (e: any) {
      setStage('error');
      setMessage(e?.message ?? 'Enrollment failed. Please try again.');
    }
  };

  /* ── Retry ── */
  const retry = () => {
    setCapturedUrl(null);
    setCapturedBlob(null);
    setMessage('');
    setStage('ready');
    if (!streamRef.current) startCamera(undefined, usingFront);
  };

  const isProcessing = stage === 'capturing' || stage === 'recognizing' || stage === 'enrolling';
  const showCamera   = stage === 'ready' || stage === 'capturing';
  const canSwitch    = cameras.length >= 2 || true; // always show — fallback works even with 1 device

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100"
          style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}cc 100%)` }}>
          <div className="flex items-center gap-2.5">
            <ScanFace size={20} className="text-white" />
            <div>
              <p className="text-sm font-bold text-white">Face Clock-In</p>
              <p className="text-[10px] text-white/70">
                {usingFront ? 'Front camera' : 'Back camera'}
                {cameras.length > 1 && ` · ${cameras.length} cameras available`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Camera switch button */}
            {showCamera && (
              <button
                onClick={switchCamera}
                title="Switch camera"
                className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
                <FlipHorizontal size={16} />
              </button>
            )}
            <button onClick={onClose}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Camera / photo preview */}
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">

            {/* Live video — mirrored for front camera (natural selfie view) */}
            <video
              ref={videoRef}
              className={clsx(
                'w-full h-full object-cover transition-transform',
                !showCamera && 'hidden',
                usingFront && 'scale-x-[-1]',   // CSS mirror for front cam
              )}
              autoPlay playsInline muted
            />

            {/* Captured still */}
            {capturedUrl && !showCamera && (
              <img src={capturedUrl} alt="Captured" className="w-full h-full object-cover" />
            )}

            {/* Face guide oval */}
            {showCamera && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-44 h-56 rounded-full border-4 border-white/60 border-dashed" />
              </div>
            )}

            {/* Camera label chip */}
            {showCamera && (
              <div className="absolute top-2 left-2 flex items-center gap-1 rounded-lg bg-black/40 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                <Camera size={10} />
                {usingFront ? 'Front' : 'Back'}
              </div>
            )}

            {/* Processing overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                <Loader2 size={32} className="text-white animate-spin" />
                <p className="text-white text-sm font-semibold">
                  {stage === 'capturing'   && 'Capturing…'}
                  {stage === 'recognizing' && 'Recognizing face…'}
                  {stage === 'enrolling'   && 'Enrolling face…'}
                </p>
              </div>
            )}

            {/* Success overlay */}
            {(stage === 'success' || stage === 'enrolled') && (
              <div className="absolute inset-0 bg-emerald-500/80 flex flex-col items-center justify-center gap-2">
                <CheckCircle size={40} className="text-white" />
                <p className="text-white text-sm font-bold text-center px-4">{message}</p>
              </div>
            )}
          </div>

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Status message */}
          {(stage === 'error' || stage === 'not_enrolled') && (
            <div className={clsx(
              'flex items-start gap-2.5 rounded-xl p-3.5 text-sm',
              stage === 'error'        && 'bg-red-50 border border-red-200 text-red-700',
              stage === 'not_enrolled' && 'bg-amber-50 border border-amber-200 text-amber-700',
            )}>
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p>{message}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2.5">

            {stage === 'ready' && (
              <button onClick={handleClockIn}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all hover:opacity-90 active:scale-95"
                style={{ background: primaryColor }}>
                <Camera size={18} /> Clock In with Face
              </button>
            )}

            {stage === 'not_enrolled' && (
              <>
                <button onClick={handleEnroll}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg transition-all">
                  <UserPlus size={18} /> Register My Face
                </button>
                <button onClick={retry}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">
                  <RefreshCw size={15} /> Try Again
                </button>
              </>
            )}

            {(stage === 'error' || stage === 'enrolled') && (
              <button onClick={stage === 'enrolled' ? handleClockIn : retry}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all hover:opacity-90"
                style={{ background: primaryColor }}>
                {stage === 'enrolled'
                  ? <><Camera size={18} /> Clock In Now</>
                  : <><RefreshCw size={16} /> Try Again</>}
              </button>
            )}

            {stage === 'success' && (
              <button onClick={onClose}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg transition-all">
                <CheckCircle size={18} /> Done
              </button>
            )}
          </div>

          {/* Hint */}
          {stage === 'ready' && (
            <p className="text-[11px] text-gray-400 text-center">
              Position your face inside the oval, ensure good lighting, then tap Clock In.
              {canSwitch && ' Tap the flip icon to switch cameras.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
