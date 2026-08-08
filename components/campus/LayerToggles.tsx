'use client';
import { Building2, Road, Leaf, MapPin } from 'lucide-react';

const LAYERS = [
  { key: 'buildings', label: 'Buildings', icon: Building2 },
  { key: 'roads', label: 'Roads & Walkways', icon: Road },
  { key: 'facilities', label: 'Facilities', icon: MapPin },
  { key: 'vegetation', label: 'Green Spaces', icon: Leaf },
];

interface LayerTogglesProps {
  hidden: Set<string>;
  onToggle: (key: string) => void;
}

export function LayerToggles({ hidden, onToggle }: LayerTogglesProps) {
  return (
    <div className="w-full max-w-sm rounded-2xl bg-white/90 backdrop-blur-xl shadow-lg border border-gray-100 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Map layers</p>
      <div className="space-y-2">
        {LAYERS.map(({ key, label, icon: Icon }) => {
          const enabled = !hidden.has(key);
          return (
            <button key={key} onClick={() => onToggle(key)} className="flex items-center gap-3 w-full text-left group">
              <span className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${enabled ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}>
                {enabled && <span className="text-white text-[10px] font-bold">✓</span>}
              </span>
              <Icon size={15} className={enabled ? 'text-blue-600' : 'text-gray-400'} />
              <span className={`text-sm font-medium ${enabled ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
