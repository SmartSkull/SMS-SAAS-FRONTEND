'use client';
import { useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap, Marker, AttributionControl, LngLatBounds } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Campus, CampusBuilding } from '@/types/campus';

interface CampusMapProps {
  campus: Campus;
  selectedId: string | null;
  hiddenCategories: Set<string>;
  hiddenLayers: Set<string>;
  onSelect: (b: CampusBuilding) => void;
  onReady: (api: { flyTo: (b: CampusBuilding) => void; reset: () => void; tilt: (on: boolean) => void; zoomIn: () => void; zoomOut: () => void; streetView: (b: CampusBuilding) => void }) => void;
}

export function CampusMap({ campus, selectedId, hiddenCategories, onSelect, onReady }: CampusMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const stateRef = useRef<{ bounds?: LngLatBounds }>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    // Ensure the container has a real size before creating the map
    const container = containerRef.current;
    if (container.clientHeight === 0) {
      container.style.height = '100%';
    }

    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [campus.center.lng, campus.center.lat],
        zoom: 15.5,
        pitch: 55, // strong 3D tilt
        bearing: 0,
        attributionControl: false,
      });
    } catch (e) {
      console.error('MapLibre init failed:', e);
      setError('Map could not initialize: ' + (e as Error).message);
      return;
    }

    map.addControl(new AttributionControl({ compact: true }), 'bottom-right');
    mapRef.current = map;

    map.on('error', (e) => {
      console.error('MapLibre error:', e);
      if (!cancelled) setError('Map tiles failed to load. Check your connection and refresh.');
    });

    map.on('load', () => {
      if (cancelled) return;
      const bounds = new LngLatBounds();
      campus.buildings.forEach(b => bounds.extend([b.lng, b.lat]));
      campus.points.forEach(p => bounds.extend([p.lng, p.lat]));
      map.fitBounds(bounds, { padding: 90, duration: 1200, pitch: 55 });
      stateRef.current.bounds = bounds;

      campus.buildings.forEach(b => {
        const el = document.createElement('div');
        el.style.cssText = `display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:12px;font-size:17px;box-shadow:0 2px 8px rgba(0,0,0,.3);border:2px solid #fff;background:${b.color};cursor:pointer;z-index:5`;
        el.textContent = b.icon;
        el.title = b.name;
        const marker = new Marker({ element: el }).setLngLat([b.lng, b.lat]).addTo(map);
        el.addEventListener('click', () => onSelect(b));
        markersRef.current.set(b.id, marker);
      });
    });

    onReady({
      flyTo: (b) => { map.flyTo({ center: [b.lng, b.lat], zoom: 16.5, pitch: 60, duration: 1500 }); },
      reset: () => {
        const b = stateRef.current.bounds;
        if (b) map.fitBounds(b, { padding: 90, duration: 1000, pitch: 55 });
        map.setPitch(55);
      },
      tilt: (on) => map.setPitch(on ? 55 : 0),
      zoomIn: () => map.zoomIn({ duration: 500 }),
      zoomOut: () => map.zoomOut({ duration: 500 }),
      streetView: (b) => {
        // Place the camera at street level, offset from the building's
        // entrance so the real 3D building fills the view like Street View.
        const offsetLat = (b.height || 3) * 0.000045; // scale height to a small lat offset
        const entranceLat = b.lat - offsetLat; // assume entrance on the "south" road
        map.flyTo({
          center: [b.lng, entranceLat],
          zoom: 18.2,
          pitch: 82, // near-horizontal street-level pitch
          bearing: 0,
          duration: 1600,
        });
      },
    });

    return () => { cancelled = true; map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    campus.buildings.forEach(b => {
      const m = markersRef.current.get(b.id);
      if (!m || !mapRef.current) return;
      m.getElement().style.display = hiddenCategories.has(b.category) ? 'none' : 'flex';
    });
  }, [hiddenCategories, campus]);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#eef2f7] p-6">
          <div className="max-w-sm text-center">
            <p className="text-lg font-black text-gray-900 mb-2">Map unavailable</p>
            <p className="text-sm text-gray-500 leading-6">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
