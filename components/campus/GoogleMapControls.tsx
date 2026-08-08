'use client';
import { Compass, Locate, Maximize, Minimize2, Rotate3d } from 'lucide-react';

interface GoogleMapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onLocate: () => void;
  onTilt: () => void;
  tilted: boolean;
  onFullscreen: () => void;
  isFullscreen: boolean;
}

export function GoogleMapControls({ onZoomIn, onZoomOut, onReset, onLocate, onTilt, tilted, onFullscreen, isFullscreen }: GoogleMapControlsProps) {
  const btn =
    'w-10 h-10 bg-white/90 backdrop-blur rounded-xl shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-white hover:text-blue-600 transition-colors';
  return (
    <div className="absolute right-3 top-20 z-20 flex flex-col gap-2">
      <button onClick={onZoomIn} className={btn} aria-label="Zoom in" title="Zoom in"><span className="text-lg font-bold leading-none">+</span></button>
      <button onClick={onZoomOut} className={btn} aria-label="Zoom out" title="Zoom out"><span className="text-lg font-bold leading-none">−</span></button>
      <div className="h-px bg-gray-200 mx-2" />
      <button onClick={onReset} className={btn} aria-label="Reset view" title="Reset view"><Compass size={17} /></button>
      <button onClick={onTilt} className={`${btn} ${tilted ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}`} aria-label="Toggle 3D tilt" title="Toggle 3D tilt">
        <Rotate3d size={17} />
      </button>
      <button onClick={onLocate} className={btn} aria-label="Locate me" title="Locate me"><Locate size={17} className="text-blue-600" /></button>
      <button onClick={onFullscreen} className={btn} aria-label="Fullscreen" title="Fullscreen">
        {isFullscreen ? <Minimize2 size={17} /> : <Maximize size={17} />}
      </button>
    </div>
  );
}
