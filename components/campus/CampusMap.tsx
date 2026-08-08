'use client';
import { useEffect, useRef } from 'react';
import { loadGoogleMaps } from '@/lib/googleMaps';
import type { Campus, CampusBuilding } from '@/types/campus';

interface CampusMapProps {
  campus: Campus;
  selectedId: string | null;
  hiddenCategories: Set<string>;
  hiddenLayers: Set<string>;
  onSelect: (b: CampusBuilding) => void;
  onReady: (api: { flyTo: (b: CampusBuilding) => void; reset: () => void; tilt: (on: boolean) => void }) => void;
}

export function CampusMap({ campus, selectedId, hiddenCategories, hiddenLayers, onSelect, onReady }: CampusMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    map?: any;
    markers?: Map<string, any>;
    bounds?: any;
    selected?: string | null;
    hiddenCategories?: Set<string>;
  }>({ markers: new Map(), selected: null, hiddenCategories: new Set() });

  // keep latest props in a ref so the map callbacks see fresh state
  useEffect(() => {
    stateRef.current.selected = selectedId;
    stateRef.current.hiddenCategories = hiddenCategories;
    if (stateRef.current.map && selectedId) {
      const b = campus.buildings.find(x => x.id === selectedId);
      if (b) flyTo(b);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, hiddenCategories]);

  const flyTo = (b: CampusBuilding) => {
    const map = stateRef.current.map;
    if (!map) return;
    map.panTo({ lat: b.lat, lng: b.lng });
    map.setZoom(17);
    if (typeof map.setTilt === 'function') map.setTilt(45);
  };

  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const google = await loadGoogleMaps();
        if (cancelled || !mapRef.current) return;

        const map = new google.maps.Map(mapRef.current, {
          center: campus.center,
          zoom: 15,
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || undefined,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: true,
          zoomControl: false,
        });

        stateRef.current.map = map;

        // Campus boundary
        const bounds = new google.maps.LatLngBounds();
        campus.buildings.forEach(b => bounds.extend({ lat: b.lat, lng: b.lng }));
        campus.points.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
        map.fitBounds(bounds, { top: 80, bottom: 80, left: 80, right: 80 });
        stateRef.current.bounds = bounds;

        // Markers for buildings
        const markers = new Map<string, any>();
        campus.buildings.forEach(b => {
          const marker = new google.maps.marker.AdvancedMarkerElement({
            position: { lat: b.lat, lng: b.lng },
            map,
            title: b.name,
            content: buildMarkerContent(b.icon, b.color),
          });
          marker.addListener('click', () => onSelect(b));
          markers.set(b.id, marker);
        });
        stateRef.current.markers = markers;

        onReady({
          flyTo: (b) => flyTo(b),
          reset: () => {
            map.fitBounds(bounds, { top: 80, bottom: 80, left: 80, right: 80 });
            if (typeof map.setTilt === 'function') map.setTilt(0);
          },
          tilt: (on) => { if (typeof map.setTilt === 'function') map.setTilt(on ? 45 : 0); },
        });
      } catch (e) {
        console.error('Google Maps failed to load:', e);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // visibility: hide markers of filtered categories
  useEffect(() => {
    const { markers, hiddenCategories } = stateRef.current;
    if (!markers) return;
    campus.buildings.forEach(b => {
      const m = markers.get(b.id);
      if (!m) return;
      m.map = hiddenCategories?.has(b.category) ? null : stateRef.current.map;
    });
  }, [hiddenCategories, campus]);

  const noKey = !process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  return (
    <div className="w-full h-full relative">
      {noKey ? (
        <div className="w-full h-full flex items-center justify-center bg-[#eef2f7] p-6">
          <div className="max-w-sm text-center">
            <p className="text-lg font-black text-gray-900 mb-2">Campus map needs a Google Maps key</p>
            <p className="text-sm text-gray-500 leading-6">
              Add <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">NEXT_PUBLIC_GOOGLE_MAPS_KEY</code> to your{' '}
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">.env.local</code> to enable the interactive campus map.
            </p>
          </div>
        </div>
      ) : (
        <div ref={mapRef} className="w-full h-full" />
      )}
    </div>
  );
}

function buildMarkerContent(icon: string, color: string): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = `display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:12px;font-size:17px;box-shadow:0 2px 8px rgba(0,0,0,.25);border:2px solid #fff;background:${color}`;
  el.textContent = icon;
  return el;
}
