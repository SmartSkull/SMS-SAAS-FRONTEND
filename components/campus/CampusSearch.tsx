'use client';
import { useState } from 'react';
import { Search, Navigation } from 'lucide-react';
import { searchCampusBuildings } from '@/data/campuses';
import type { Campus } from '@/types/campus';

interface CampusSearchProps {
  campus: Campus;
  onSelect: (buildingId: string) => void;
  onDirections: (buildingId: string) => void;
}

function distanceBetween(b1: { lat: number; lng: number }, b2: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b2.lat - b1.lat) * Math.PI) / 180;
  const dLng = ((b2.lng - b1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((b1.lat * Math.PI) / 180) * Math.cos((b2.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function CampusSearch({ campus, onSelect, onDirections }: CampusSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const results = searchCampusBuildings(campus, query);
  const gate = campus.buildings.find(b => b.category === 'transport') ?? campus.buildings[0];

  return (
    <div className="relative z-30 w-full max-w-sm">
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Search for a building, faculty or facility..."
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/90 backdrop-blur shadow-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400"
        />
      </div>

      {open && query.trim() && (
        <div className="absolute top-full mt-2 w-full rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden">
          {results.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No locations found for "{query}".</p>
          ) : (
            results.map(b => {
              const dist = distanceBetween(b, gate);
              return (
                <div key={b.id} className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50/60 transition-colors border-b border-gray-50 last:border-0">
                  <span className="text-lg">{b.icon}</span>
                  <button
                    className="flex-1 text-left"
                    onMouseDown={() => { onSelect(b.id); setOpen(false); }}
                  >
                    <p className="text-sm font-bold text-gray-900">{b.name}</p>
                    <p className="text-xs text-gray-400">{b.type} · {dist >= 1000 ? `${(dist / 1000).toFixed(1)} km` : `${dist} m`} from Main Gate</p>
                  </button>
                  <button
                    onMouseDown={() => { onDirections(b.id); setOpen(false); }}
                    className="p-2 rounded-lg hover:bg-blue-100 text-blue-600"
                    title="Get directions"
                  >
                    <Navigation size={15} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
