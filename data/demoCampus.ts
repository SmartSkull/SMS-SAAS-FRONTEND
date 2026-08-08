import type { Campus } from '@/types/campus';

/**
 * Demo campus data — fully functional prototype so the explorer works without
 * backend changes. Phase 2 will replace this with API-backed campus data while
 * keeping the same shape.
 */
export const DEMO_CAMPUS: Campus = {
  id: 'demo-main-campus',
  schoolSlug: 'florieren-demo',
  name: 'Main Campus',
  location: 'Akoka, Lagos, Nigeria',
  description:
    'A modern, walkable campus with academic blocks, hostels, sports facilities and green spaces — everything students need in one place.',
  center: { lat: 6.5171, lng: 3.3881 },
  openingHours: 'Mon – Fri: 7:00am – 9:00pm · Sat: 8:00am – 6:00pm',
  contact: '+234 700 000 0000 · info@smartcampus.com.ng',
  emergency: '+234 700 000 9111 (Campus Security)',
  mapScale: 120, // meters per 3D unit

  buildings: [
    {
      id: 'main-gate', name: 'Main Gate', type: 'Entrance', category: 'transport',
      description: 'The main entrance to the campus. Security checks and visitor registration happen here.',
      facilities: ['Security post', 'Visitor registration', 'Parking guidance'],
      lat: 6.5148, lng: 3.3862, height: 2.2, width: 5, depth: 1.5, floors: 1,
      color: '#ef4444', icon: '🚌', openingHours: '24 hours', contact: 'Ext. 100',
      accessibility: 'Wheelchair accessible gate',
      nearby: ['Administration Block', 'Central Library'],
    },
    {
      id: 'admin-block', name: 'Administration Block', type: 'Administrative Building', category: 'administration',
      description: 'Houses the registry, bursary, admissions office and the office of the registrar.',
      facilities: ['Registry', 'Bursary', 'Admissions Office', 'Registrar\'s Office', 'Meeting rooms'],
      lat: 6.5153, lng: 3.3871, height: 6, width: 8, depth: 6, floors: 3,
      color: '#0ea5e9', icon: '🏛️', openingHours: '8:00am – 5:00pm', contact: 'Ext. 200',
      accessibility: 'Lift available · ramp at main entrance',
      nearby: ['Main Gate', 'Central Library'],
    },
    {
      id: 'science-faculty', name: 'Science Faculty', type: 'Academic Building', category: 'academic',
      description: 'Home to the departments of Physics, Chemistry, Biology and Mathematics, with modern laboratories.',
      facilities: ['Lecture rooms', 'Laboratories', 'Staff offices', 'Seminar rooms', 'ICT facilities'],
      lat: 6.5162, lng: 3.3875, height: 7, width: 10, depth: 8, floors: 4,
      color: '#2563eb', icon: '🎓', openingHours: '7:00am – 8:00pm', contact: 'Ext. 310',
      accessibility: 'Lift available · accessible labs on floor 1',
      nearby: ['ICT Centre', 'Cafeteria'],
    },
    {
      id: 'arts-faculty', name: 'Arts Faculty', type: 'Academic Building', category: 'academic',
      description: 'Departments of English, History, Languages and Social Sciences, with seminar rooms and a reading room.',
      facilities: ['Lecture rooms', 'Seminar rooms', 'Staff offices', 'Reading room'],
      lat: 6.5166, lng: 3.3888, height: 6, width: 9, depth: 7, floors: 3,
      color: '#2563eb', icon: '🎓', openingHours: '7:00am – 8:00pm', contact: 'Ext. 320',
      accessibility: 'Ramp at entrance · ground floor accessible',
      nearby: ['Central Library', 'Examination Hall'],
    },
    {
      id: 'central-library', name: 'Central Library', type: 'Library', category: 'academic',
      description: 'A three-storey library with quiet reading areas, a digital resource centre and group study rooms.',
      facilities: ['Reading halls', 'Digital resource centre', 'Group study rooms', 'Reference desk'],
      lat: 6.5158, lng: 3.3882, height: 8, width: 9, depth: 7, floors: 3,
      color: '#1d4ed8', icon: '📚', openingHours: '7:00am – 10:00pm', contact: 'Ext. 400',
      accessibility: 'Lift available · braille signage',
      nearby: ['Administration Block', 'Arts Faculty'],
    },
    {
      id: 'main-auditorium', name: 'Main Auditorium', type: 'Auditorium', category: 'academic',
      description: 'A 1,500-seat auditorium used for lectures, assemblies, ceremonies and events.',
      facilities: ['Seating for 1,500', 'Stage', 'Sound system', 'Projection room'],
      lat: 6.5169, lng: 3.3878, height: 6, width: 12, depth: 9, floors: 2,
      color: '#2563eb', icon: '🎓', openingHours: 'Event-based', contact: 'Ext. 500',
      accessibility: 'Wheelchair seating rows',
      nearby: ['Science Faculty', 'Sports Centre'],
    },
    {
      id: 'boys-hostel', name: 'Boys Hostel', type: 'Hostel', category: 'accommodation',
      description: 'On-campus residence for male students with shared rooms, common areas and a warden\'s office.',
      facilities: ['Shared rooms', 'Common room', 'Laundry', 'Warden\'s office'],
      lat: 6.5175, lng: 3.3872, height: 8, width: 12, depth: 6, floors: 4,
      color: '#7c3aed', icon: '🏠', openingHours: '24 hours', contact: 'Ext. 610',
      accessibility: 'Ground-floor accessible rooms',
      nearby: ['Cafeteria', 'Medical Centre'],
    },
    {
      id: 'girls-hostel', name: 'Girls Hostel', type: 'Hostel', category: 'accommodation',
      description: 'On-campus residence for female students with secure entry, common areas and a warden\'s office.',
      facilities: ['Shared rooms', 'Common room', 'Laundry', 'Warden\'s office'],
      lat: 6.5172, lng: 3.389, height: 8, width: 12, depth: 6, floors: 4,
      color: '#a855f7', icon: '🏠', openingHours: '24 hours', contact: 'Ext. 620',
      accessibility: 'Ground-floor accessible rooms',
      nearby: ['Cafeteria', 'ICT Centre'],
    },
    {
      id: 'medical-centre', name: 'Medical Centre', type: 'Medical Facility', category: 'services',
      description: 'Campus clinic offering first aid, general consultations and emergency care during school hours.',
      facilities: ['Consultation rooms', 'First aid', 'Pharmacy', 'Emergency bay'],
      lat: 6.516, lng: 3.3893, height: 3, width: 6, depth: 5, floors: 1,
      color: '#10b981', icon: '🏥', openingHours: '7:00am – 8:00pm', contact: 'Ext. 700',
      accessibility: 'Fully accessible · stretcher access',
      nearby: ['Girls Hostel', 'Examination Hall'],
    },
    {
      id: 'cafeteria', name: 'Cafeteria', type: 'Catering Facility', category: 'services',
      description: 'A spacious dining hall serving breakfast, lunch and snacks throughout the day.',
      facilities: ['Dining hall', 'Food counters', 'Seating for 400', 'Clean water points'],
      lat: 6.5171, lng: 3.3888, height: 3.5, width: 10, depth: 8, floors: 1,
      color: '#14b8a6', icon: '🍴', openingHours: '6:30am – 8:00pm', contact: 'Ext. 800',
      accessibility: 'Wheelchair accessible seating',
      nearby: ['Boys Hostel', 'Girls Hostel'],
    },
    {
      id: 'sports-centre', name: 'Sports Centre', type: 'Recreation Facility', category: 'recreation',
      description: 'Indoor sports hall with courts for basketball, volleyball and badminton, plus changing rooms.',
      facilities: ['Basketball court', 'Volleyball court', 'Changing rooms', 'Equipment store'],
      lat: 6.518, lng: 3.3885, height: 5, width: 12, depth: 10, floors: 1,
      color: '#f59e0b', icon: '⚽', openingHours: '6:00am – 8:00pm', contact: 'Ext. 900',
      accessibility: 'Accessible viewing area',
      nearby: ['Main Auditorium', 'Football Field'],
    },
    {
      id: 'ict-centre', name: 'ICT Centre', type: 'Computer Facility', category: 'services',
      description: 'A modern computer centre with high-speed internet for student research, e-learning and exams.',
      facilities: ['Computer labs', 'High-speed internet', 'E-learning rooms', 'IT support desk'],
      lat: 6.5164, lng: 3.3887, height: 3.5, width: 8, depth: 6, floors: 1,
      color: '#0d9488', icon: '💻', openingHours: '7:00am – 9:00pm', contact: 'Ext. 850',
      accessibility: 'Accessible workstations',
      nearby: ['Science Faculty', 'Examination Hall'],
    },
    {
      id: 'exam-hall', name: 'Examination Hall', type: 'Examination Facility', category: 'academic',
      description: 'A large hall used for terminal examinations, with controlled entry and invigilation points.',
      facilities: ['Seating for 800', 'Invigilation desk', 'Bag storage', 'Clock tower view'],
      lat: 6.5155, lng: 3.3895, height: 4.5, width: 12, depth: 9, floors: 1,
      color: '#2563eb', icon: '🎓', openingHours: 'Exam periods', contact: 'Ext. 550',
      accessibility: 'Accessible seating rows',
      nearby: ['Arts Faculty', 'Medical Centre'],
    },
  ],

  points: [
    { id: 'poi-parking', name: 'Visitor Parking', category: 'transport', lat: 6.5149, lng: 3.3866, icon: '🅿️', description: 'Parking for visitors and staff near the main gate.' },
    { id: 'poi-football', name: 'Football Field', category: 'recreation', lat: 6.5184, lng: 3.3878, icon: '⚽', description: 'Outdoor pitch for football and athletics.' },
    { id: 'poi-security', name: 'Security Post', category: 'security', lat: 6.5151, lng: 3.3865, icon: '🛡️', description: '24-hour campus security post.' },
    { id: 'poi-garden', name: 'Botanical Garden', category: 'recreation', lat: 6.5178, lng: 3.3894, icon: '🌳', description: 'A quiet garden between the hostels and sports centre.' },
  ],

  routes: [
    {
      id: 'route-gate-library',
      name: 'Main Gate → Central Library',
      path: [[6.5148, 3.3862], [6.5153, 3.3871], [6.5158, 3.3882]],
      landmarks: ['Main Gate', 'Administration Block', 'Central Library'],
      distanceMeters: 450,
      minutes: 6,
    },
    {
      id: 'route-gate-science',
      name: 'Main Gate → Science Faculty',
      path: [[6.5148, 3.3862], [6.5153, 3.3871], [6.5158, 3.3882], [6.5162, 3.3875]],
      landmarks: ['Main Gate', 'Administration Block', 'Central Library', 'Science Faculty'],
      distanceMeters: 620,
      minutes: 8,
    },
    {
      id: 'route-hostels-cafeteria',
      name: 'Boys Hostel → Cafeteria',
      path: [[6.5175, 3.3872], [6.5171, 3.3888]],
      landmarks: ['Boys Hostel', 'Cafeteria'],
      distanceMeters: 220,
      minutes: 3,
    },
  ],
};

/** Buildings searchable by name/type across the campus */
export function searchCampusBuildings(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return DEMO_CAMPUS.buildings;
  return DEMO_CAMPUS.buildings.filter(b =>
    b.name.toLowerCase().includes(q) ||
    b.type.toLowerCase().includes(q) ||
    b.facilities.some(f => f.toLowerCase().includes(q))
  );
}
