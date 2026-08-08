'use client';
import { X, Navigation, Footprints, MapPin } from 'lucide-react';
import { DEMO_CAMPUS } from '@/data/demoCampus';
import type { CampusBuilding } from '@/types/campus';

interface DirectionsPanelProps {
  destination: CampusBuilding;
  onClose: () => void;
  onStart: () => void;
}

export function DirectionsPanel({ destination, onClose, onStart }: DirectionsPanelProps) {
  const route =
    DEMO_CAMPUS.routes.find(r => r.landmarks[r.landmarks.length - 1] === destination.name) ??
    DEMO_CAMPUS.routes[0];

  return (
    <div className="pointer-events-auto w-full max-w-sm rounded-2xl bg-white/95 backdrop-blur-xl shadow-2xl border border-gray-100 overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Directions</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <MapPin size={18} className="text-red-500" />
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900">{destination.name}</p>
            <p className="text-xs text-gray-400">{destination.type}</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
          <Footprints size={15} className="text-blue-600" />
          <span className="font-black">{route.distanceMeters} m</span>
          <span>·</span>
          <span>{route.minutes} min walk</span>
        </div>
      </div>

      <div className="p-5 space-y-1">
        {route.landmarks.map((l, i) => (
          <div key={l} className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <span className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-green-500' : i === route.landmarks.length - 1 ? 'bg-red-500' : 'bg-blue-400'}`} />
              {i < route.landmarks.length - 1 && <span className="w-0.5 h-6 bg-gray-200" />}
            </div>
            <p className={`text-sm ${i === route.landmarks.length - 1 ? 'font-bold text-gray-900' : 'text-gray-600'}`}>{l}</p>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-100">
        <button onClick={onStart} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors">
          <Navigation size={15} /> Start Navigation
        </button>
      </div>
    </div>
  );
}
