'use client';
import { X, Navigation, Building2, Eye } from 'lucide-react';
import { CATEGORY_MAP, type CampusBuilding } from '@/types/campus';

interface CampusDrawerProps {
  building: CampusBuilding | null;
  onClose: () => void;
  onDirections: () => void;
  onExplore: () => void;
  onStreetView: () => void;
}

export function CampusDrawer({ building, onClose, onDirections, onExplore, onStreetView }: CampusDrawerProps) {
  if (!building) return null;
  const cat = CATEGORY_MAP[building.category];

  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-40">
      <div className="rounded-t-3xl bg-white shadow-2xl p-5 pb-8 max-h-[55vh] overflow-y-auto">
        <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-4" />
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: `${cat.color}20` }}>
              {building.icon}
            </div>
            <div>
              <h3 className="font-black text-gray-900 leading-tight">{building.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{building.type}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>
        <span className="inline-block mt-3 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white" style={{ background: cat.color }}>
          {cat.icon} {cat.label}
        </span>
        <p className="text-sm text-gray-600 leading-6 mt-3">{building.description}</p>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {building.facilities.map(f => (
            <span key={f} className="px-2.5 py-1 rounded-lg bg-gray-100 text-xs font-medium text-gray-700">{f}</span>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onStreetView} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold">
            <Eye size={14} /> Street View
          </button>
          <button onClick={onDirections} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold">
            <Navigation size={14} /> Directions
          </button>
          <button onClick={onExplore} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-100 text-gray-800 text-xs font-bold">
            <Building2 size={14} /> Explore
          </button>
        </div>
      </div>
    </div>
  );
}
