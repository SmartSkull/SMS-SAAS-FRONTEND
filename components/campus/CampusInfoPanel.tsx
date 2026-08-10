'use client';
import { X, Navigation, Building2, Camera, Share2, Clock, Phone, Accessibility, Layers, MapPin, Eye } from 'lucide-react';
import { CATEGORY_MAP, type CampusBuilding } from '@/types/campus';

interface CampusInfoPanelProps {
  building: CampusBuilding;
  onClose: () => void;
  onDirections: () => void;
  onExplore: () => void;
  onStreetView: () => void;
}

export function CampusInfoPanel({ building, onClose, onDirections, onExplore, onStreetView }: CampusInfoPanelProps) {
  const cat = CATEGORY_MAP[building.category];

  return (
    <div className="pointer-events-auto w-full max-w-sm rounded-2xl bg-white/90 backdrop-blur-xl shadow-2xl border border-white/60 overflow-hidden">
      {/* Header */}
      <div className="p-5 pb-4 border-b border-gray-100" style={{ background: `linear-gradient(135deg, ${cat.color}22, transparent)` }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: `${cat.color}20`, border: `1px solid ${cat.color}40` }}>
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
      </div>

      {/* Body */}
      <div className="p-5 space-y-4 max-h-[46vh] overflow-y-auto">
        <p className="text-sm text-gray-600 leading-6">{building.description}</p>

        {/* Facilities */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Facilities</p>
          <div className="flex flex-wrap gap-1.5">
            {building.facilities.map(f => (
              <span key={f} className="px-2.5 py-1 rounded-lg bg-gray-100 text-xs font-medium text-gray-700">{f}</span>
            ))}
          </div>
        </div>

        {/* Meta */}
        <div className="space-y-2.5">
          {building.openingHours && (
            <div className="flex items-center gap-2.5 text-sm text-gray-600">
              <Clock size={15} className="text-gray-400 shrink-0" /> {building.openingHours}
            </div>
          )}
          {building.contact && (
            <div className="flex items-center gap-2.5 text-sm text-gray-600">
              <Phone size={15} className="text-gray-400 shrink-0" /> {building.contact}
            </div>
          )}
          {building.accessibility && (
            <div className="flex items-center gap-2.5 text-sm text-gray-600">
              <Accessibility size={15} className="text-gray-400 shrink-0" /> {building.accessibility}
            </div>
          )}
          <div className="flex items-center gap-2.5 text-sm text-gray-600">
            <Layers size={15} className="text-gray-400 shrink-0" /> {building.floors} floor{building.floors > 1 ? 's' : ''}
          </div>
          {building.nearby && building.nearby.length > 0 && (
            <div className="flex items-start gap-2.5 text-sm text-gray-600">
              <MapPin size={15} className="text-gray-400 shrink-0 mt-0.5" />
              <span>Nearby: {building.nearby.join(', ')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-100 grid grid-cols-2 gap-2">
        <button onClick={onStreetView} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold transition-colors col-span-2">
          <Eye size={14} /> Street View
        </button>
        <button onClick={onDirections} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors">
          <Navigation size={14} /> Get Directions
        </button>
        <button onClick={onExplore} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-colors">
          <Building2 size={14} /> Explore Building
        </button>
        <button className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 text-xs font-semibold transition-colors hover:bg-gray-100">
          <Camera size={14} /> View Photos
        </button>
        <button onClick={() => { if (navigator.share) navigator.share({ title: building.name, text: building.description }).catch(() => {}); }}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 text-xs font-semibold transition-colors hover:bg-gray-100">
          <Share2 size={14} /> Share Location
        </button>
      </div>
    </div>
  );
}
