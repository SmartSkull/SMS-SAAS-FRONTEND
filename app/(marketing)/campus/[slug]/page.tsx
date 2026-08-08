'use client';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Building2, Map as MapIcon, Box, Layers, Info, ArrowLeft, LocateFixed } from 'lucide-react';
import { DEMO_CAMPUS } from '@/data/demoCampus';
import type { CampusBuilding } from '@/types/campus';
import { MapControls } from '@/components/campus/MapControls';
import { CampusSearch } from '@/components/campus/CampusSearch';
import { CampusInfoPanel } from '@/components/campus/CampusInfoPanel';
import { CampusDrawer } from '@/components/campus/CampusDrawer';
import { DirectionsPanel } from '@/components/campus/DirectionsPanel';
import { CategoryFilter } from '@/components/campus/CategoryFilter';
import { LayerToggles } from '@/components/campus/LayerToggles';

// 3D scene loads only on this page (keeps the rest of the bundle light)
const CampusScene = dynamic(() => import('@/components/campus/CampusScene').then(m => m.CampusScene), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#eef2f7]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-500 mt-4 font-medium">Preparing Campus Explorer...</p>
      </div>
    </div>
  ),
});
const Campus2DMap = dynamic(() => import('@/components/campus/Campus2DMap').then(m => m.Campus2DMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#eef2f7]">
      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  ),
});

export default function CampusViewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = typeof params.slug === 'string' ? params.slug : DEMO_CAMPUS.schoolSlug;

  const [selected, setSelected] = useState<CampusBuilding | null>(null);
  const [directionsTo, setDirectionsTo] = useState<CampusBuilding | null>(null);
  const [view, setView] = useState<'3d' | '2d'>('3d');
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set());
  const [showLayers, setShowLayers] = useState(false);
  const [showCampusInfo, setShowCampusInfo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{ reset: () => void } | null>(null);

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
    const b = DEMO_CAMPUS.buildings.find(x => x.id === id);
    if (b) { setSelected(b); setDirectionsTo(null); }
  };

  const locateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        // nearest building
        let nearest: CampusBuilding | null = null;
        let best = Infinity;
        for (const b of DEMO_CAMPUS.buildings) {
          const d = Math.hypot(b.lat - pos.coords.latitude, b.lng - pos.coords.longitude);
          if (d < best) { best = d; nearest = b; }
        }
        if (nearest) setSelected(nearest);
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

  const zoomIn = () => sceneRef.current?.reset();
  const zoomOut = () => sceneRef.current?.reset();
  const resetView = () => sceneRef.current?.reset();

  const infoPanel = useMemo(() => (
    <div className="pointer-events-none absolute top-16 right-3 bottom-24 z-20 hidden md:flex items-start justify-end">
      {selected && !directionsTo && (
        <CampusInfoPanel
          building={selected}
          onClose={() => setSelected(null)}
          onDirections={() => setDirectionsTo(selected)}
          onExplore={() => setSelected(null)}
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
  ), [selected, directionsTo]);

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
            <p className="text-xs font-black text-gray-900 leading-tight">{DEMO_CAMPUS.name}</p>
            <p className="text-[10px] text-gray-500">{DEMO_CAMPUS.location}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 2D / 3D toggle */}
          <div className="flex rounded-xl bg-white/90 backdrop-blur shadow border border-gray-200 p-1">
            {(['3d', '2d'] as const).map(m => (
              <button key={m} onClick={() => setView(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${view === m ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {m === '3d' ? <Box size={13} /> : <MapIcon size={13} />}
                {m.toUpperCase()}
              </button>
            ))}
          </div>
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
        <CampusSearch onSelect={flyTo} onDirections={id => { const b = DEMO_CAMPUS.buildings.find(x => x.id === id); if (b) setDirectionsTo(b); }} />
      </div>

      {/* Category filter */}
      <div className="absolute top-[8.5rem] sm:top-20 left-0 right-0 sm:left-4 sm:right-auto z-20 px-4 sm:px-0">
        <CategoryFilter active={hiddenCategories} onToggle={toggleCategory} />
      </div>

      {/* Map area */}
      <div className="absolute inset-0">
        {view === '3d' ? (
          <CampusScene
            ref={sceneRef}
            campus={DEMO_CAMPUS}
            selectedId={selected?.id ?? null}
            hiddenCategories={hiddenCategories}
            hiddenLayers={hiddenLayers}
            onSelect={b => { setSelected(b); setDirectionsTo(null); }}
          />
        ) : (
          <Campus2DMap selectedId={selected?.id ?? null} onSelect={b => setSelected(b)} />
        )}
      </div>

      {/* Floating controls */}
      <MapControls
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={resetView}
        onLocate={locateMe}
        onFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
      />

      {/* User location chip */}
      {userLoc && (
        <div className="absolute bottom-4 left-4 z-20 px-3 py-2 rounded-xl bg-white/90 backdrop-blur shadow border border-gray-200 text-xs font-medium text-gray-700 flex items-center gap-2">
          <LocateFixed size={14} className="text-blue-600" /> You are near the campus — use a building card to navigate.
        </div>
      )}

      {/* Info panel (desktop) */}
      {infoPanel}

      {/* Campus info overlay */}
      {showCampusInfo && (
        <div className="absolute top-16 right-3 z-30 w-72 rounded-2xl bg-white/95 backdrop-blur-xl shadow-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-black text-gray-900">{DEMO_CAMPUS.name}</p>
            <button onClick={() => setShowCampusInfo(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
          </div>
          <p className="text-xs text-gray-500 mb-3">{DEMO_CAMPUS.location}</p>
          <p className="text-xs text-gray-600 leading-5 mb-4">{DEMO_CAMPUS.description}</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="rounded-xl bg-blue-50 p-3 text-center">
              <p className="text-xl font-black text-blue-700">{DEMO_CAMPUS.buildings.length}+</p>
              <p className="text-[10px] text-gray-500">Buildings</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-3 text-center">
              <p className="text-xl font-black text-blue-700">{DEMO_CAMPUS.buildings.length + DEMO_CAMPUS.points.length}+</p>
              <p className="text-[10px] text-gray-500">Locations</p>
            </div>
          </div>
          <div className="space-y-1.5 text-xs text-gray-600">
            <p><span className="font-bold">Hours:</span> {DEMO_CAMPUS.openingHours}</p>
            <p><span className="font-bold">Contact:</span> {DEMO_CAMPUS.contact}</p>
            <p><span className="font-bold">Emergency:</span> {DEMO_CAMPUS.emergency}</p>
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
        onClose={() => setSelected(null)}
        onDirections={() => selected && setDirectionsTo(selected)}
        onExplore={() => setSelected(null)}
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
    </div>
  );
}
