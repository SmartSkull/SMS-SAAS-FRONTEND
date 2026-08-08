import type { Campus } from '@/types/campus';

/**
 * Curated real-coordinate campus data for the Google Maps explorer.
 * Coordinates are approximate real-world positions (UNILAG Akoka, Lagos) so the
 * buildings sit on the real map. Phase 3 can replace these with API-backed data.
 */
export const CAMPUSES: Record<string, Campus> = {
  unilag: {
    id: 'unilag-main',
    schoolSlug: 'unilag',
    name: 'University of Lagos — Main Campus',
    location: 'Akoka, Lagos, Nigeria',
    description:
      'Nigeria\'s premier university, set on 802 acres along the Lagos Lagoon. Explore its lecture theatres, faculty blocks, hostels and green spaces on a real interactive map.',
    center: { lat: 6.5157, lng: 3.3866 },
    openingHours: 'Mon – Fri: 7:00am – 9:00pm · Sat: 8:00am – 6:00pm',
    contact: '+234 1 280 0070 · info@unilag.edu.ng',
    emergency: '+234 1 280 0071 (UNILAG Security)',
    mapScale: 120,

    buildings: [
      {
        id: 'julius-berger', name: 'Julius Berger Lecture Theatre', type: 'Lecture Theatre', category: 'academic',
        description: 'The university\'s largest lecture theatre, seating over 1,000 students. It hosts general courses, faculty lectures, conferences and matriculation rehearsals.',
        facilities: ['1,000+ seats', 'Projection & sound', 'Air conditioning', 'Accessible entrance'],
        lat: 6.5165, lng: 3.3902, height: 6, width: 10, depth: 8, floors: 2,
        color: '#2563eb', icon: '🎓', openingHours: '7:00am – 8:00pm', contact: 'Ext. 1000',
        accessibility: 'Wheelchair-accessible seating rows',
        nearby: ['Faculty of Science', 'Central Library'],
      },
      {
        id: 'faculty-engineering', name: 'Faculty of Engineering', type: 'Academic Building', category: 'academic',
        description: 'Houses Mechanical, Civil, Electrical and Computer Engineering departments with workshops, labs and lecture halls. One of the most sought-after faculties at UNILAG.',
        facilities: ['Engineering labs', 'Workshops', 'Lecture halls', 'Staff offices'],
        lat: 6.5172, lng: 3.3889, height: 8, width: 12, depth: 9, floors: 4,
        color: '#2563eb', icon: '🎓', openingHours: '7:00am – 8:00pm', contact: 'Ext. 2000',
        accessibility: 'Lift available',
        nearby: ['Julius Berger Lecture Theatre', 'Faculty of Science'],
      },
      {
        id: 'moremi-hall', name: 'Moremi Hall', type: 'Female Hostel', category: 'accommodation',
        description: 'A storied female residence hall named after the Yoruba heroine Moremi. Known for its vibrant community life, common rooms and close-knit hall culture.',
        facilities: ['Shared rooms', 'Common room', 'Laundry', 'Hall warden'],
        lat: 6.5148, lng: 3.3894, height: 7, width: 12, depth: 7, floors: 3,
        color: '#a855f7', icon: '🏠', openingHours: '24 hours', contact: 'Ext. 3000',
        accessibility: 'Ground-floor accessible rooms',
        nearby: ['Jaja Hall', 'Main Gate'],
      },
      {
        id: 'jaja-hall', name: 'Jaja Hall', type: 'Male Hostel', category: 'accommodation',
        description: 'One of UNILAG\'s iconic male residence halls, home to generations of students. Features study spaces, a dining area and strong sporting traditions.',
        facilities: ['Shared rooms', 'Study rooms', 'Dining area', 'Hall warden'],
        lat: 6.5146, lng: 3.3883, height: 7, width: 12, depth: 7, floors: 3,
        color: '#7c3aed', icon: '🏠', openingHours: '24 hours', contact: 'Ext. 3100',
        accessibility: 'Ground-floor accessible rooms',
        nearby: ['Moremi Hall', 'Main Gate'],
      },
      {
        id: 'central-library', name: 'UNILAG Central Library', type: 'Library', category: 'academic',
        description: 'The largest academic library in the university, with millions of volumes, digital databases, e-resources and quiet reading halls spread across multiple floors.',
        facilities: ['Reading halls', 'Digital resource centre', 'Group study rooms', 'Archives'],
        lat: 6.5152, lng: 3.3861, height: 8, width: 10, depth: 8, floors: 4,
        color: '#1d4ed8', icon: '📚', openingHours: '8:00am – 10:00pm', contact: 'Ext. 4000',
        accessibility: 'Lift available · braille signage',
        nearby: ['Julius Berger Lecture Theatre', 'Faculty of Arts'],
      },
      {
        id: 'faculty-science', name: 'Faculty of Science', type: 'Academic Building', category: 'academic',
        description: 'Departments of Physics, Chemistry, Zoology, Botany, Mathematics and Computer Science, with teaching labs and research centres.',
        facilities: ['Teaching labs', 'Research labs', 'Lecture halls', 'Staff offices'],
        lat: 6.5174, lng: 3.3877, height: 8, width: 12, depth: 9, floors: 4,
        color: '#2563eb', icon: '🎓', openingHours: '7:00am – 8:00pm', contact: 'Ext. 5000',
        accessibility: 'Lift available',
        nearby: ['Julius Berger Lecture Theatre', 'Faculty of Engineering'],
      },
      {
        id: 'faculty-arts', name: 'Faculty of Arts', type: 'Academic Building', category: 'academic',
        description: 'Houses the departments of English, History & Strategic Studies, Linguistics, and Creative Arts. Known for its historic buildings and lively cultural events.',
        facilities: ['Lecture halls', 'Seminar rooms', 'Creative arts studios', 'Staff offices'],
        lat: 6.5149, lng: 3.3855, height: 7, width: 10, depth: 8, floors: 3,
        color: '#2563eb', icon: '🎓', openingHours: '7:00am – 8:00pm', contact: 'Ext. 6000',
        accessibility: 'Ramp at entrance',
        nearby: ['Central Library', 'Administrative Block'],
      },
      {
        id: 'admin-block', name: 'Administrative Block', type: 'Administrative Building', category: 'administration',
        description: 'The seat of the university administration — the Vice-Chancellor\'s office, Senate chambers, Registry and Bursary are all located here.',
        facilities: ['Vice-Chancellor\'s office', 'Senate chambers', 'Registry', 'Bursary'],
        lat: 6.5156, lng: 3.3852, height: 6, width: 10, depth: 8, floors: 3,
        color: '#0ea5e9', icon: '🏛️', openingHours: '8:00am – 5:00pm', contact: 'Ext. 7000',
        accessibility: 'Lift available',
        nearby: ['Faculty of Arts', 'Main Gate'],
      },
      {
        id: 'medical-centre', name: 'UNILAG Medical Centre', type: 'Medical Facility', category: 'services',
        description: 'Provides primary health care, outpatient clinics, pharmacy and emergency care to students and staff.',
        facilities: ['Outpatient clinics', 'Pharmacy', 'Emergency room', 'Laboratory'],
        lat: 6.516, lng: 3.3849, height: 3, width: 8, depth: 6, floors: 1,
        color: '#10b981', icon: '🏥', openingHours: '24 hours', contact: 'Ext. 8000',
        accessibility: 'Fully accessible',
        nearby: ['Administrative Block', 'Faculty of Arts'],
      },
      {
        id: 'sports-centre', name: 'UNILAG Sports Centre', type: 'Recreation Facility', category: 'recreation',
        description: 'The university\'s sports hub — athletics track, football pitch, basketball courts and the main sports pavilion where inter-faculty games are held.',
        facilities: ['Athletics track', 'Football pitch', 'Basketball courts', 'Sports pavilion'],
        lat: 6.5189, lng: 3.3851, height: 4, width: 12, depth: 10, floors: 1,
        color: '#f59e0b', icon: '⚽', openingHours: '6:00am – 8:00pm', contact: 'Ext. 9000',
        accessibility: 'Accessible viewing area',
        nearby: ['Faculty of Engineering', 'New Hall'],
      },
      {
        id: 'cafeteria', name: 'UNILAG Cafeteria', type: 'Catering Facility', category: 'services',
        description: 'A busy central dining spot serving Nigerian staples — jollof rice, moi moi, plantain and more — throughout the day at student-friendly prices.',
        facilities: ['Dining hall', 'Food counters', 'Seating for 300', 'Water points'],
        lat: 6.5162, lng: 3.3868, height: 3, width: 10, depth: 8, floors: 1,
        color: '#14b8a6', icon: '🍴', openingHours: '6:30am – 8:00pm', contact: 'Ext. 8500',
        accessibility: 'Wheelchair accessible seating',
        nearby: ['Central Library', 'Faculty of Science'],
      },
      {
        id: 'main-gate', name: 'UNILAG Main Gate', type: 'Entrance', category: 'transport',
        description: 'The main ceremonial entrance on University Road. Security checks, visitor registration and the iconic gate arch greet every visitor.',
        facilities: ['Security post', 'Visitor registration', 'Parking'],
        lat: 6.5163, lng: 3.3846, height: 2.5, width: 6, depth: 1.5, floors: 1,
        color: '#ef4444', icon: '🚌', openingHours: '24 hours', contact: 'Ext. 100',
        accessibility: 'Wheelchair accessible',
        nearby: ['Administrative Block', 'Jaja Hall'],
      },
      {
        id: 'ict-centre', name: 'ICT Centre', type: 'Computer Facility', category: 'services',
        description: 'A modern computer centre with high-speed internet for e-learning, online registration and student research.',
        facilities: ['Computer labs', 'High-speed internet', 'E-learning rooms', 'IT support'],
        lat: 6.5158, lng: 3.3875, height: 3.5, width: 8, depth: 6, floors: 1,
        color: '#0d9488', icon: '💻', openingHours: '7:00am – 9:00pm', contact: 'Ext. 8700',
        accessibility: 'Accessible workstations',
        nearby: ['Central Library', 'Cafeteria'],
      },
      {
        id: 'new-hall', name: 'New Hall', type: 'Student Hostel', category: 'accommodation',
        description: 'A modern student residence with en-suite rooms, study lounges and a lively hall community.',
        facilities: ['En-suite rooms', 'Study lounges', 'Common room', 'Hall warden'],
        lat: 6.5192, lng: 3.3862, height: 8, width: 12, depth: 7, floors: 4,
        color: '#7c3aed', icon: '🏠', openingHours: '24 hours', contact: 'Ext. 3200',
        accessibility: 'Lift available',
        nearby: ['Sports Centre', 'Faculty of Engineering'],
      },
      {
        id: 'examination-hall', name: 'Main Examination Hall', type: 'Examination Facility', category: 'academic',
        description: 'A large venue used for semester examinations, professional certifications and public lectures.',
        facilities: ['Seating for 700', 'Invigilation desk', 'Bag storage'],
        lat: 6.517, lng: 3.3864, height: 4, width: 12, depth: 9, floors: 1,
        color: '#2563eb', icon: '🎓', openingHours: 'Exam periods', contact: 'Ext. 5600',
        accessibility: 'Accessible seating rows',
        nearby: ['Cafeteria', 'Faculty of Science'],
      },
    ],

    points: [
      { id: 'poi-parking', name: 'Visitor Parking', category: 'transport', lat: 6.5168, lng: 3.3848, icon: '🅿️', description: 'Parking near the main gate for visitors and staff.' },
      { id: 'poi-botanical', name: 'Botanical Garden', category: 'recreation', lat: 6.5177, lng: 3.3873, icon: '🌳', description: 'A quiet green space for relaxation between lectures.' },
      { id: 'poi-security', name: 'Security Post', category: 'security', lat: 6.5161, lng: 3.3845, icon: '🛡️', description: '24-hour campus security point.' },
    ],

    routes: [
      {
        id: 'route-gate-library',
        name: 'Main Gate → Central Library',
        path: [[6.5163, 3.3846], [6.5156, 3.3852], [6.5152, 3.3861]],
        landmarks: ['Main Gate', 'Administrative Block', 'Central Library'],
        distanceMeters: 400, minutes: 5,
      },
      {
        id: 'route-gate-julius',
        name: 'Main Gate → Julius Berger',
        path: [[6.5163, 3.3846], [6.5156, 3.3852], [6.5165, 3.3902]],
        landmarks: ['Main Gate', 'Administrative Block', 'Julius Berger Lecture Theatre'],
        distanceMeters: 700, minutes: 9,
      },
      {
        id: 'route-moremi-jaja',
        name: 'Moremi Hall → Jaja Hall',
        path: [[6.5148, 3.3894], [6.5146, 3.3883]],
        landmarks: ['Moremi Hall', 'Jaja Hall'],
        distanceMeters: 150, minutes: 2,
      },
    ],
  },

  demo: {
    id: 'demo-campus',
    schoolSlug: 'florieren-demo',
    name: 'Smart Campus Demo School',
    location: 'Akoka, Lagos, Nigeria',
    description:
      'A fully interactive campus demo built on the real map — explore buildings, facilities and get directions, just like a real school.',
    center: { lat: 6.517, lng: 3.3875 },
    openingHours: 'Mon – Fri: 7:00am – 9:00pm · Sat: 8:00am – 6:00pm',
    contact: '+234 700 000 0000 · info@smartcampus.com.ng',
    emergency: '+234 700 000 9111 (Campus Security)',
    mapScale: 120,

    buildings: [
      {
        id: 'main-gate', name: 'Main Gate', type: 'Entrance', category: 'transport',
        description: 'The main entrance to the campus. Security checks and visitor registration happen here.',
        facilities: ['Security post', 'Visitor registration', 'Parking guidance'],
        lat: 6.5152, lng: 3.3855, height: 2.2, width: 5, depth: 1.5, floors: 1,
        color: '#ef4444', icon: '🚌', openingHours: '24 hours', contact: 'Ext. 100',
        accessibility: 'Wheelchair accessible gate',
        nearby: ['Administration Block', 'Central Library'],
      },
      {
        id: 'admin-block', name: 'Administration Block', type: 'Administrative Building', category: 'administration',
        description: 'Houses the registry, bursary, admissions office and the office of the registrar.',
        facilities: ['Registry', 'Bursary', 'Admissions Office', 'Registrar\'s Office'],
        lat: 6.5156, lng: 3.3862, height: 6, width: 8, depth: 6, floors: 3,
        color: '#0ea5e9', icon: '🏛️', openingHours: '8:00am – 5:00pm', contact: 'Ext. 200',
        accessibility: 'Lift available',
        nearby: ['Main Gate', 'Central Library'],
      },
      {
        id: 'central-library', name: 'Central Library', type: 'Library', category: 'academic',
        description: 'A three-storey library with quiet reading areas, a digital resource centre and group study rooms.',
        facilities: ['Reading halls', 'Digital resource centre', 'Group study rooms'],
        lat: 6.5158, lng: 3.3868, height: 8, width: 9, depth: 7, floors: 3,
        color: '#1d4ed8', icon: '📚', openingHours: '7:00am – 10:00pm', contact: 'Ext. 400',
        accessibility: 'Lift available',
        nearby: ['Administration Block', 'Science Faculty'],
      },
      {
        id: 'science-faculty', name: 'Science Faculty', type: 'Academic Building', category: 'academic',
        description: 'Home to the departments of Physics, Chemistry, Biology and Mathematics with modern laboratories.',
        facilities: ['Lecture rooms', 'Laboratories', 'Staff offices', 'ICT facilities'],
        lat: 6.5162, lng: 3.3875, height: 7, width: 10, depth: 8, floors: 4,
        color: '#2563eb', icon: '🎓', openingHours: '7:00am – 8:00pm', contact: 'Ext. 310',
        accessibility: 'Lift available',
        nearby: ['ICT Centre', 'Cafeteria'],
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
        lat: 6.5172, lng: 3.3882, height: 8, width: 12, depth: 6, floors: 4,
        color: '#a855f7', icon: '🏠', openingHours: '24 hours', contact: 'Ext. 620',
        accessibility: 'Ground-floor accessible rooms',
        nearby: ['Cafeteria', 'ICT Centre'],
      },
      {
        id: 'medical-centre', name: 'Medical Centre', type: 'Medical Facility', category: 'services',
        description: 'Campus clinic offering first aid, general consultations and emergency care during school hours.',
        facilities: ['Consultation rooms', 'First aid', 'Pharmacy'],
        lat: 6.516, lng: 3.3889, height: 3, width: 6, depth: 5, floors: 1,
        color: '#10b981', icon: '🏥', openingHours: '7:00am – 8:00pm', contact: 'Ext. 700',
        accessibility: 'Fully accessible',
        nearby: ['Girls Hostel', 'Examination Hall'],
      },
      {
        id: 'cafeteria', name: 'Cafeteria', type: 'Catering Facility', category: 'services',
        description: 'A spacious dining hall serving breakfast, lunch and snacks throughout the day.',
        facilities: ['Dining hall', 'Food counters', 'Seating for 400'],
        lat: 6.5171, lng: 3.3888, height: 3.5, width: 10, depth: 8, floors: 1,
        color: '#14b8a6', icon: '🍴', openingHours: '6:30am – 8:00pm', contact: 'Ext. 800',
        accessibility: 'Wheelchair accessible seating',
        nearby: ['Boys Hostel', 'Girls Hostel'],
      },
      {
        id: 'sports-centre', name: 'Sports Centre', type: 'Recreation Facility', category: 'recreation',
        description: 'Indoor sports hall with courts for basketball, volleyball and badminton.',
        facilities: ['Basketball court', 'Volleyball court', 'Changing rooms'],
        lat: 6.518, lng: 3.3885, height: 5, width: 12, depth: 10, floors: 1,
        color: '#f59e0b', icon: '⚽', openingHours: '6:00am – 8:00pm', contact: 'Ext. 900',
        accessibility: 'Accessible viewing area',
        nearby: ['Main Auditorium', 'Boys Hostel'],
      },
      {
        id: 'ict-centre', name: 'ICT Centre', type: 'Computer Facility', category: 'services',
        description: 'A modern computer centre with high-speed internet for student research, e-learning and exams.',
        facilities: ['Computer labs', 'High-speed internet', 'IT support desk'],
        lat: 6.5164, lng: 3.3887, height: 3.5, width: 8, depth: 6, floors: 1,
        color: '#0d9488', icon: '💻', openingHours: '7:00am – 9:00pm', contact: 'Ext. 850',
        accessibility: 'Accessible workstations',
        nearby: ['Science Faculty', 'Cafeteria'],
      },
      {
        id: 'main-auditorium', name: 'Main Auditorium', type: 'Auditorium', category: 'academic',
        description: 'A 1,500-seat auditorium used for lectures, assemblies, ceremonies and events.',
        facilities: ['Seating for 1,500', 'Stage', 'Sound system'],
        lat: 6.5169, lng: 3.3878, height: 6, width: 12, depth: 9, floors: 2,
        color: '#2563eb', icon: '🎓', openingHours: 'Event-based', contact: 'Ext. 500',
        accessibility: 'Wheelchair seating rows',
        nearby: ['Science Faculty', 'Sports Centre'],
      },
      {
        id: 'exam-hall', name: 'Examination Hall', type: 'Examination Facility', category: 'academic',
        description: 'A large hall used for terminal examinations with controlled entry and invigilation points.',
        facilities: ['Seating for 800', 'Invigilation desk', 'Bag storage'],
        lat: 6.5155, lng: 3.3895, height: 4.5, width: 12, depth: 9, floors: 1,
        color: '#2563eb', icon: '🎓', openingHours: 'Exam periods', contact: 'Ext. 550',
        accessibility: 'Accessible seating rows',
        nearby: ['Medical Centre', 'Girls Hostel'],
      },
    ],

    points: [
      { id: 'poi-parking', name: 'Visitor Parking', category: 'transport', lat: 6.5151, lng: 3.3858, icon: '🅿️', description: 'Parking for visitors near the main gate.' },
      { id: 'poi-football', name: 'Football Field', category: 'recreation', lat: 6.5184, lng: 3.3878, icon: '⚽', description: 'Outdoor pitch for football and athletics.' },
      { id: 'poi-security', name: 'Security Post', category: 'security', lat: 6.5154, lng: 3.3857, icon: '🛡️', description: '24-hour campus security post.' },
    ],

    routes: [
      {
        id: 'route-gate-library',
        name: 'Main Gate → Central Library',
        path: [[6.5152, 3.3855], [6.5156, 3.3862], [6.5158, 3.3868]],
        landmarks: ['Main Gate', 'Administration Block', 'Central Library'],
        distanceMeters: 450, minutes: 6,
      },
      {
        id: 'route-gate-science',
        name: 'Main Gate → Science Faculty',
        path: [[6.5152, 3.3855], [6.5156, 3.3862], [6.5158, 3.3868], [6.5162, 3.3875]],
        landmarks: ['Main Gate', 'Administration Block', 'Central Library', 'Science Faculty'],
        distanceMeters: 620, minutes: 8,
      },
      {
        id: 'route-hostels-cafeteria',
        name: 'Boys Hostel → Cafeteria',
        path: [[6.5175, 3.3872], [6.5171, 3.3888]],
        landmarks: ['Boys Hostel', 'Cafeteria'],
        distanceMeters: 220, minutes: 3,
      },
    ],
  },
};

export function getCampus(slug: string): Campus {
  return CAMPUSES[slug] ?? CAMPUSES.demo;
}

export function searchCampusBuildings(campus: Campus, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return campus.buildings;
  return campus.buildings.filter(b =>
    b.name.toLowerCase().includes(q) ||
    b.type.toLowerCase().includes(q) ||
    b.facilities.some(f => f.toLowerCase().includes(q))
  );
}
