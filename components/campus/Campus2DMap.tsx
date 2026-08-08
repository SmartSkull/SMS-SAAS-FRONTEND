'use client';
import { useEffect, useRef } from 'react';
import { DEMO_CAMPUS } from '@/data/demoCampus';
import type { CampusBuilding } from '@/types/campus';

interface Campus2DMapProps {
  selectedId: string | null;
  onSelect: (b: CampusBuilding) => void;
}

export function Campus2DMap({ selectedId, onSelect }: Campus2DMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<{ map: any; markers: Map<string, any> } | null>(null);

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;
    let cancelled = false;

    (async () => {
      const L = await import('leaflet');
      if (cancelled || !mapRef.current) return;
      // inject CSS (Leaflet CSS isn't bundled)
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      const map = L.map(mapRef.current, { zoomControl: false }).setView([DEMO_CAMPUS.center.lat, DEMO_CAMPUS.center.lng], 16);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 20,
      }).addTo(map);

      const markers = new Map<string, any>();
      DEMO_CAMPUS.buildings.forEach(b => {
        const icon = L.divIcon({
          className: '',
          html: `<div class="flex items-center justify-center w-8 h-8 rounded-lg text-base shadow-md border border-white" style="background:${b.color}">${b.icon}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        const m = L.marker([b.lat, b.lng], { icon }).addTo(map);
        m.bindTooltip(b.name, { direction: 'top', offset: [0, -16] });
        m.on('click', () => onSelect(b));
        markers.set(b.id, m);
      });

      leafletRef.current = { map, markers };
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // highlight selected building
  useEffect(() => {
    if (!leafletRef.current || !selectedId) return;
    const m = leafletRef.current.markers.get(selectedId);
    if (m) {
      leafletRef.current.map.panTo(m.getLatLng());
      m.openTooltip();
    }
  }, [selectedId]);

  return <div ref={mapRef} className="w-full h-full" />;
}
