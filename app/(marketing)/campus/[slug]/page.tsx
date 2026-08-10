'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Building2, Layers, Info, ArrowLeft, LocateFixed, Eye, EyeOff } from 'lucide-react';
import { getCampus } from '@/data/campuses';
import type { CampusBuilding } from '@/types/campus';
import { CampusMap } from '@/components/campus/CampusMap';
import { GoogleMapControls } from '@/components/campus/GoogleMapControls';
import { CampusSearch } from '@/components/campus/CampusSearch';
import { CampusInfoPanel } from '@/components/campus/CampusInfoPanel';
import { CampusDrawer } from '@/components/campus/CampusDrawer';
import { DirectionsPanel } from '@/components/campus/DirectionsPanel';
import { CategoryFilter } from '@/components/campus/CategoryFilter';
import { LayerToggles } from '@/components/campus/LayerToggles';

interface MapApi {
  flyTo: (b: CampusBuilding) => void;
  reset: () => void;
  tilt: (on: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  streetView: (b: CampusBuilding) => void;
}

function CampusViewContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = typeof params.slug === 'string' ? params.slug : 'demo';
  const campus = getCampus(slug);

  const [selected, setSelected] = useState<CampusBuilding | null>(null);
  const [directionsTo, setDirectionsTo] = useState<CampusBuilding | null>(null);
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set());
  const [showLayers, setShowLayers] = useState(false);
  const [showCampusInfo, setShowCampusInfo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tilted, setTilted] = useState(false);
  const [locating, setLocating] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [streetViewFor, setStreetViewFor] = useState<CampusBuilding | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapApiRef = useRef<MapApi | null>(null);

  // auto-locate from ?locate=1
  useEffect(() => {
    if (searchParams.get('locate') === '1') locateMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCategory = (key: string) => {
    setHiddenCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleLayer = (key: string) => {
    setHiddenLayers(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const flyTo = (id: string) => {
    const b = campus.buildings.find(x => x.id === id);
    if (b) {
      setSelected(b);
      setDirectionsTo(null);
      mapApiRef.current?.flyTo(b);
    }
  };

  const locateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        let nearest: CampusBuilding | null = null;
        let best = Infinity;
        for (const b of campus.buildings) {
          const d = Math.hypot(b.lat - pos.coords.latitude, b.lng - pos.coords.longitude);
          if (d < best) { best = d; nearest = b; }
        }
        if (nearest) { setSelected(nearest); mapApiRef.current?.flyTo(nearest); }
      },
      () => setLocating(false),
      { timeout: 8000 },
    );
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const toggleTilt = () => {
    setTilted(t => {
      mapApiRef.current?.tilt(!t);
      return !t;
    });
  };

  const enterStreetView = (b: CampusBuilding) => {
    setSelected(b);
    setStreetViewFor(b);
    setDirectionsTo(null);
    mapApiRef.current?.streetView(b);
  };

  const exitStreetView = () => {
    setStreetViewFor(null);
    mapApiRef.current?.reset();
  };

  return (
    <div ref={containerRef} className="relative h-screen w-full overflow-hidden bg-[#eef2f7]">
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-3 sm:px-4 py-3">
        <div className="flex items-center gap-2">
          <Link href="/campus" className="p-2 rounded-xl bg-white/90 backdrop-blur shadow border border-gray-200 text-gray-600 hover:text-blue-600 transition-colors" title="Back to explorer">
            <ArrowLeft size={18} />
          </Link>
          <Link href="/" className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/90 backdrop-blur shadow border border-gray-200">
            <img src="/images/logo.png" alt="Smart Campus" className="h-7 w-auto" />
          </Link>
          <div className="px-3 py-2 rounded-xl bg-white/90 backdrop-blur shadow border border-gray-200">
            <p className="text-xs font-black text-gray-900 leading-tight">{campus.name}</p>
            <p className="text-[10px] text-gray-500">{campus.location}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowCampusInfo(v => !v)} className="p-2 rounded-xl bg-white/90 backdrop-blur shadow border border-gray-200 text-gray-600 hover:text-blue-600 transition-colors" title="Campus info">
            <Info size={18} />
          </button>
          <button onClick={() => setShowLayers(v => !v)} className="p-2 rounded-xl bg-white/90 backdrop-blur shadow border border-gray-200 text-gray-600 hover:text-blue-600 transition-colors" title="Layers">
            <Layers size={18} />
          </button>
        </div>
      </div>

      {/* Campus search */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] sm:w-auto sm:left-4 sm:translate-x-0 px-4 sm:px-0">
        <CampusSearch campus={campus} onSelect={flyTo} onDirections={id => { const b = campus.buildings.find(x => x.id === id); if (b) setDirectionsTo(b); }} />
      </div>

      {/* Category filter */}
      <div className="absolute top-[8.5rem] sm:top-20 left-0 right-0 sm:left-4 sm:right-auto z-20 px-4 sm:px-0">
        <CategoryFilter active={hiddenCategories} onToggle={toggleCategory} />
      </div>

      {/* Map area */}
      <div className="absolute inset-0">
        <CampusMap
          campus={campus}
          selectedId={selected?.id ?? null}
          hiddenCategories={hiddenCategories}
          hiddenLayers={hiddenLayers}
          onSelect={b => { setSelected(b); setDirectionsTo(null); }}
          onReady={api => { mapApiRef.current = api; }}
        />
      </div>

      {/* Floating controls */}
      <GoogleMapControls
        onZoomIn={() => mapApiRef.current?.zoomIn()}
        onZoomOut={() => mapApiRef.current?.zoomOut()}
        onReset={() => mapApiRef.current?.reset()}
        onLocate={locateMe}
        onTilt={toggleTilt}
        tilted={tilted}
        onFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
      />

      {/* User location chip */}
      {userLoc && (
        <div className="absolute bottom-4 left-4 z-20 px-3 py-2 rounded-xl bg-white/90 backdrop-blur shadow border border-gray-200 text-xs font-medium text-gray-700 flex items-center gap-2">
          <LocateFixed size={14} className="text-blue-600" /> You are near the campus — select a place to navigate.
        </div>
      )}

      {/* Info panel (desktop) */}
      <div className="pointer-events-none absolute top-16 right-3 bottom-24 z-20 hidden md:flex items-start justify-end">
        {selected && !directionsTo && (
          <CampusInfoPanel
            building={selected}
            onClose={() => { setSelected(null); setStreetViewFor(null); }}
            onDirections={() => setDirectionsTo(selected)}
            onExplore={() => setSelected(null)}
            onStreetView={() => enterStreetView(selected)}
          />
        )}
        {directionsTo && (
          <DirectionsPanel
            destination={directionsTo}
            onClose={() => setDirectionsTo(null)}
            onStart={() => setDirectionsTo(null)}
          />
        )}
      </div>

      {/* Campus info overlay */}
      {showCampusInfo && (
        <div className="absolute top-16 right-3 z-30 w-72 rounded-2xl bg-white/95 backdrop-blur-xl shadow-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-black text-gray-900">{campus.name}</p>
            <button onClick={() => setShowCampusInfo(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
          </div>
          <p className="text-xs text-gray-500 mb-3">{campus.location}</p>
          <p className="text-xs text-gray-600 leading-5 mb-4">{campus.description}</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="rounded-xl bg-blue-50 p-3 text-center">
              <p className="text-xl font-black text-blue-700">{campus.buildings.length}+</p>
              <p className="text-[10px] text-gray-500">Buildings</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-3 text-center">
              <p className="text-xl font-black text-blue-700">{campus.buildings.length + campus.points.length}+</p>
              <p className="text-[10px] text-gray-500">Locations</p>
            </div>
          </div>
          <div className="space-y-1.5 text-xs text-gray-600">
            <p><span className="font-bold">Hours:</span> {campus.openingHours}</p>
            <p><span className="font-bold">Contact:</span> {campus.contact}</p>
            <p><span className="font-bold">Emergency:</span> {campus.emergency}</p>
          </div>
          <Link href="/school" className="mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors">
            <Building2 size={14} /> Register / Find your school
          </Link>
        </div>
      )}

      {/* Layers overlay */}
      {showLayers && (
        <div className="absolute bottom-4 right-3 z-30">
          <LayerToggles hidden={hiddenLayers} onToggle={toggleLayer} />
        </div>
      )}

      {/* Mobile drawer */}
      <CampusDrawer
        building={selected}
        onClose={() => { setSelected(null); setStreetViewFor(null); }}
        onDirections={() => selected && setDirectionsTo(selected)}
        onExplore={() => setSelected(null)}
        onStreetView={() => selected && enterStreetView(selected)}
      />
      {directionsTo && (
        <div className="md:hidden fixed inset-x-0 bottom-0 z-40 p-4 pb-6">
          <DirectionsPanel destination={directionsTo} onClose={() => setDirectionsTo(null)} onStart={() => setDirectionsTo(null)} />
        </div>
      )}

      {locating && (
        <div className="absolute inset-0 z-50 bg-black/30 flex items-center justify-center">
          <div className="px-6 py-4 rounded-2xl bg-white shadow-xl text-sm font-semibold text-gray-700 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /> Locating you...
          </div>
        </div>
      )}

      {/* Street View banner */}
      {streetViewFor && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] sm:w-auto">
          <div className="flex items-center gap-3 rounded-2xl bg-gray-900/90 backdrop-blur border border-white/10 px-4 py-2.5 shadow-2xl">
            <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-base">{streetViewFor.icon}</span>
            <div className="min-w-0">
              <p className="text-xs font-black text-white leading-tight">Street View · {streetViewFor.name}</p>
              <p className="text-[10px] text-gray-300">Standing on the campus street in front of the building</p>
            </div>
            <button
              onClick={exitStreetView}
              className="flex items-center gap-1.5 ml-2 px-3 py-1.5 rounded-xl bg-white text-gray-900 text-xs font-bold hover:bg-gray-100 transition-colors shrink-0"
            >
              <EyeOff size={13} /> Exit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CampusViewPage() {
  return (
    <Suspense fallback={<div className="w-full h-screen bg-[#eef2f7]" />}>
      <CampusViewContent />
    </Suspense>
  );
}
