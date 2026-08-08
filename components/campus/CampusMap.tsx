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
  onReady: (api: { flyTo: (b: CampusBuilding) => void; reset: () => void; tilt: (on: boolean) => void; zoomIn: () => void; zoomOut: () => void }) => void;
}

/**
 * Vector style using OpenFreeMap's OpenMapTiles vector tiles with real 3D
 * building extrusion — live streets + extruded buildings like Google Maps.
 */
function buildStyle() {
  return {
    version: 8 as const,
    sources: {
      openmaptiles: {
        type: 'vector' as const,
        tiles: ['https://tiles.openfreemap.org/planet/{z}/{x}/{y}.pbf'],
        maxzoom: 14,
        attribution: '&copy; OpenFreeMap &copy; OpenStreetMap',
      },
    },
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    layers: [
      { id: 'background', type: 'background' as const, paint: { 'background-color': '#f8f4f0' } },
      // Landcover / parks / water
      { id: 'park', type: 'fill' as const, source: 'openmaptiles', 'source-layer': 'park', paint: { 'fill-color': '#d8e8c8' } },
      { id: 'landuse', type: 'fill' as const, source: 'openmaptiles', 'source-layer': 'landuse', paint: { 'fill-color': '#f0ead6' } },
      { id: 'landcover', type: 'fill' as const, source: 'openmaptiles', 'source-layer': 'landcover', paint: { 'fill-color': '#e6ecd8' } },
      { id: 'water', type: 'fill' as const, source: 'openmaptiles', 'source-layer': 'water', paint: { 'fill-color': '#a0c8f0' } },
      // Roads — casing then fill
      { id: 'road-casing', type: 'line' as const, source: 'openmaptiles', 'source-layer': 'transportation', layout: { 'line-cap': 'round' as const, 'line-join': 'round' as const },
        paint: { 'line-color': '#cfcdca', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.5, 13, 1, 14, 4, 20, 20] } },
      { id: 'road', type: 'line' as const, source: 'openmaptiles', 'source-layer': 'transportation', layout: { 'line-cap': 'round' as const, 'line-join': 'round' as const },
        paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 13.5, 0, 14, 2.5, 20, 18] } },
      // Buildings — flat at low zoom
      { id: 'building', type: 'fill' as const, source: 'openmaptiles', 'source-layer': 'building', minzoom: 13, maxzoom: 14,
        paint: { 'fill-color': '#d9d0c9', 'fill-outline-color': '#bfb4aa' } },
      // Buildings — 3D extrusion at high zoom
      { id: 'building-3d', type: 'fill-extrusion' as const, source: 'openmaptiles', 'source-layer': 'building', minzoom: 14,
        paint: {
          'fill-extrusion-color': '#d9d0c9',
          'fill-extrusion-height': ['get', 'render_height'],
          'fill-extrusion-base': ['get', 'render_min_height'],
          'fill-extrusion-opacity': 0.85,
        } },
      // Place labels
      { id: 'place', type: 'symbol' as const, source: 'openmaptiles', 'source-layer': 'place', minzoom: 8,
        layout: { 'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']], 'text-font': ['Noto Sans Regular'], 'text-size': 13 },
        paint: { 'text-color': '#333', 'text-halo-color': '#fff', 'text-halo-width': 1 } },
    ],
  };
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

    const map = new MapLibreMap({
      container: containerRef.current,
      style: buildStyle() as any,
      center: [campus.center.lng, campus.center.lat],
      zoom: 15.5,
      pitch: 55, // strong 3D tilt
      bearing: 0,
      attributionControl: false,
    });

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
