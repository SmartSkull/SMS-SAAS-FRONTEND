'use client';
/**
 * BarcodeScanner
 * ──────────────
 * Camera-based QR / barcode scanner using @zxing/browser.
 * Shows a full-screen modal with a live viewfinder.
 * Calls onScan(result) once when a code is decoded, then closes.
 * Calls onClose when the user dismisses manually.
 */
import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';
import { X, Camera, RefreshCw, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  onScan: (result: string) => void;
  onClose: () => void;
  /** Optional title shown at the top of the modal */
  title?: string;
  /** Optional hint text below the viewfinder */
  hint?: string;
}

export default function BarcodeScanner({
  onScan,
  onClose,
  title = 'Scan QR Code',
  hint = "Point the camera at the student's QR card",
}: Props) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const readerRef   = useRef<BrowserMultiFormatReader | null>(null);
  const scannedRef  = useRef(false); // prevent double-fire
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  const [cameras, setCameras]       = useState<MediaDeviceInfo[]>([]);
  const [cameraIdx, setCameraIdx]   = useState(0);
  const [error, setError]           = useState('');
  const [scanning, setScanning]     = useState(false);
  const [flash, setFlash]           = useState(false); // green flash on success

  /* ── start / restart scanner ── */
  const startScanner = async (deviceId?: string) => {
    if (!videoRef.current) return;
    setError('');
    setScanning(false);

    // Stop any previous instance
    controlsRef.current?.stop();
    readerRef.current = new BrowserMultiFormatReader();

    try {
      // List cameras on first call
      if (!cameras.length) {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        setCameras(devices);
        // Prefer back camera on mobile
        const backIdx = devices.findIndex(d =>
          /back|rear|environment/i.test(d.label),
        );
        if (backIdx >= 0 && !deviceId) {
          setCameraIdx(backIdx);
          deviceId = devices[backIdx].deviceId;
        } else if (devices.length && !deviceId) {
          deviceId = devices[0].deviceId;
        }
      }

      setScanning(true);
      const controls = await readerRef.current.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, err) => {
          if (result && !scannedRef.current) {
            scannedRef.current = true;
            setFlash(true);
            controls.stop();
            setTimeout(() => {
              onScan(result.getText());
            }, 300); // brief flash then call
          }
          // NotFoundException fires every frame when nothing found — suppress
          if (err && !(err instanceof NotFoundException)) {
            console.warn('[BarcodeScanner]', err);
          }
        },
      );
      controlsRef.current = controls;
    } catch (e: any) {
      setScanning(false);
      if (e?.name === 'NotAllowedError' || e?.message?.includes('Permission')) {
        setError('Camera permission denied. Please allow camera access and try again.');
      } else if (e?.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError(e?.message ?? 'Could not start camera.');
      }
    }
  };

  useEffect(() => {
    startScanner();
    return () => {
      controlsRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchCamera = () => {
    const next = (cameraIdx + 1) % cameras.length;
    setCameraIdx(next);
    scannedRef.current = false;
    startScanner(cameras[next]?.deviceId);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 border-b border-white/10">
        <div className="flex items-center gap-2 text-white">
          <Camera size={18} className="text-blue-400" />
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 transition text-white/70 hover:text-white"
          aria-label="Close scanner"
        >
          <X size={20} />
        </button>
      </div>

      {/* Viewfinder */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">

        {/* Video stream */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          playsInline
        />

        {/* Success flash overlay */}
        <div
          className={clsx(
            'absolute inset-0 bg-emerald-400/30 transition-opacity duration-300 pointer-events-none',
            flash ? 'opacity-100' : 'opacity-0',
          )}
        />

        {/* Aiming frame */}
        {!error && (
          <div className="relative z-10 w-64 h-64 sm:w-72 sm:h-72">
            {/* Corner brackets */}
            {[
              'top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl',
              'top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl',
              'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl',
              'bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl',
            ].map((cls, i) => (
              <span
                key={i}
                className={clsx('absolute w-8 h-8 border-white', cls)}
              />
            ))}
            {/* Scan line animation */}
            {scanning && (
              <div className="absolute inset-x-0 top-0 h-0.5 bg-blue-400/80 animate-[scanLine_2s_linear_infinite] shadow-[0_0_8px_2px_rgba(96,165,250,0.6)]" />
            )}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center max-w-xs">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-400/30 flex items-center justify-center">
              <AlertCircle size={28} className="text-red-300" />
            </div>
            <p className="text-sm text-red-200 leading-relaxed">{error}</p>
            <button
              onClick={() => { scannedRef.current = false; startScanner(cameras[cameraIdx]?.deviceId); }}
              className="flex items-center gap-2 mt-1 px-5 py-2.5 bg-white/15 border border-white/20 text-white text-sm font-semibold rounded-xl hover:bg-white/20 transition"
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="px-4 py-4 bg-black/60 border-t border-white/10 flex items-center justify-between gap-3">
        <p className="text-xs text-white/50 flex-1">{hint}</p>
        {cameras.length > 1 && (
          <button
            onClick={switchCamera}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/10 border border-white/15 text-white text-xs font-semibold rounded-xl hover:bg-white/15 transition"
          >
            <RefreshCw size={13} /> Flip Camera
          </button>
        )}
      </div>

      {/* Scan-line keyframe (Tailwind arbitrary animation) */}
      <style>{`
        @keyframes scanLine {
          0%   { top: 0% }
          50%  { top: calc(100% - 2px) }
          100% { top: 0% }
        }
      `}</style>
    </div>
  );
}
