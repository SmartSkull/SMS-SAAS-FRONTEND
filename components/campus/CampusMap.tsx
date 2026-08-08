'use client';
import { useEffect, useRef } from 'react';
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

export function CampusMap({ campus, selectedId, hiddenCategories, onSelect, onReady }: CampusMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const stateRef = useRef<{ bounds?: LngLatBounds }>({});

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'vector',
            tiles: ['https://tiles.openfreemap.org/planet/{z}/{x}/{y}.pbf'],
            maxzoom: 15,
          },
        },
        layers: [
          { id: 'background', type: 'background', paint: { 'background-color': '#eef2f7' } },
          // Land / parks
          { id: 'landcover', type: 'fill', source: 'osm', 'source-layer': 'landcover', paint: { 'fill-color': '#dbe8d3' } },
          { id: 'landuse', type: 'fill', source: 'osm', 'source-layer': 'landuse', paint: { 'fill-color': '#f0ead6' } },
          // Roads
          { id: 'roads', type: 'line', source: 'osm', 'source-layer': 'transportation', filter: ['==', ['geometry-type'], 'LineString'], paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1.5, 15, 4] } },
          { id: 'road-casing', type: 'line', source: 'osm', 'source-layer': 'transportation', filter: ['==', ['geometry-type'], 'LineString'], paint: { 'line-color': '#cbd5e1', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 3, 15, 6] } },
          // Buildings (3D extrusion)
          { id: 'buildings', type: 'fill-extrusion', source: 'osm', 'source-layer': 'building', paint: {
            'fill-extrusion-color': '#cbd5e1',
            'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14, 0, 15, ['get', 'render_height']],
            'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 14, 0, 15, ['get', 'render_min_height']],
            'fill-extrusion-opacity': 0.85,
          } },
          // Water
          { id: 'water', type: 'fill', source: 'osm', 'source-layer': 'water', paint: { 'fill-color': '#b3d9f7' } },
        ],
      },
      center: [campus.center.lng, campus.center.lat],
      zoom: 15,
      pitch: 45, // initial 3D tilt
      bearing: 0,
      attributionControl: false,
    });

    map.addControl(new AttributionControl({ compact: true }), 'bottom-right');
    mapRef.current = map;

    map.on('load', () => {
      if (cancelled) return;
      // Fit to campus bounds
      const bounds = new LngLatBounds();
      campus.buildings.forEach(b => bounds.extend([b.lng, b.lat]));
      campus.points.forEach(p => bounds.extend([p.lng, p.lat]));
      map.fitBounds(bounds, { padding: 90, duration: 1200 });
      stateRef.current.bounds = bounds;

      // Markers for curated places
      campus.buildings.forEach(b => {
        const el = document.createElement('div');
        el.style.cssText = `display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:12px;font-size:17px;box-shadow:0 2px 8px rgba(0,0,0,.3);border:2px solid #fff;background:${b.color};cursor:pointer`;
        el.textContent = b.icon;
        el.title = b.name;

        const marker = new Marker({ element: el })
          .setLngLat([b.lng, b.lat])
          .addTo(map);
        el.addEventListener('click', () => onSelect(b));
        markersRef.current.set(b.id, marker);
      });
    });

    // apply 3D tilt on load
    map.on('load', () => { map.setPitch(50); });

    onReady({
      flyTo: (b) => {
        map.flyTo({ center: [b.lng, b.lat], zoom: 16.5, pitch: 55, duration: 1500 });
      },
      reset: () => {
        const b = stateRef.current.bounds;
        if (b) map.fitBounds(b, { padding: 90, duration: 1000 });
        map.setPitch(45);
      },
      tilt: (on) => map.setPitch(on ? 55 : 0),
      zoomIn: () => map.zoomIn({ duration: 500 }),
      zoomOut: () => map.zoomOut({ duration: 500 }),
    });

    return () => { cancelled = true; map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep selected marker state visible (highlight handled by info panel)
  useEffect(() => { /* selection highlight is driven by the panel */ }, [selectedId]);

  // hide markers of filtered categories
  useEffect(() => {
    campus.buildings.forEach(b => {
      const m = markersRef.current.get(b.id);
      if (!m || !mapRef.current) return;
      m.getElement().style.display = hiddenCategories.has(b.category) ? 'none' : 'flex';
    });
  }, [hiddenCategories, campus]);

  return <div ref={containerRef} className="w-full h-full" />;
}
