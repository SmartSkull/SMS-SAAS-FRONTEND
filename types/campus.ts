export type CampusCategoryKey =
  | 'academic'
  | 'accommodation'
  | 'administration'
  | 'services'
  | 'recreation'
  | 'transport'
  | 'security';

export interface CampusCategory {
  key: CampusCategoryKey;
  label: string;
  icon: string; // emoji
  color: string; // hex
}

export interface CampusBuilding {
  id: string;
  name: string;
  type: string;
  category: CampusCategoryKey;
  description: string;
  facilities: string[];
  lat: number;
  lng: number;
  height: number; // 3D units
  width: number; // 3D units
  depth: number; // 3D units
  floors: number;
  color: string;
  icon: string;
  openingHours?: string;
  contact?: string;
  accessibility?: string;
  nearby?: string[];
}

export interface CampusPoint {
  id: string;
  name: string;
  category: CampusCategoryKey;
  lat: number;
  lng: number;
  icon: string;
  description?: string;
}

export interface CampusRoute {
  id: string;
  name: string;
  path: [number, number][]; // [lat, lng][]
  landmarks: string[];
  distanceMeters: number;
  minutes: number;
}

export interface Campus {
  id: string;
  schoolSlug: string;
  name: string;
  location: string;
  description: string;
  center: { lat: number; lng: number };
  buildings: CampusBuilding[];
  points: CampusPoint[];
  routes: CampusRoute[];
  openingHours: string;
  contact: string;
  emergency: string;
  mapScale: number; // meters per 3D unit
}

export const CAMPUS_CATEGORIES: CampusCategory[] = [
  { key: 'academic', label: 'Academic', icon: '🎓', color: '#2563eb' },
  { key: 'accommodation', label: 'Accommodation', icon: '🏠', color: '#7c3aed' },
  { key: 'administration', label: 'Administration', icon: '🏛️', color: '#0ea5e9' },
  { key: 'services', label: 'Services', icon: '🏥', color: '#10b981' },
  { key: 'recreation', label: 'Recreation', icon: '⚽', color: '#f59e0b' },
  { key: 'transport', label: 'Transport', icon: '🚌', color: '#ef4444' },
  { key: 'security', label: 'Security', icon: '🛡️', color: '#64748b' },
];

export const CATEGORY_MAP: Record<CampusCategoryKey, CampusCategory> = Object.fromEntries(
  CAMPUS_CATEGORIES.map(c => [c.key, c])
) as Record<CampusCategoryKey, CampusCategory>;
