'use client';
import { useEffect, useState, useCallback } from 'react';
import { Building2, Plus, Trash2, BedDouble, UserCheck, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/StateDisplay';
import { useSchoolData } from '@/hooks/useSchoolData';

interface Bed { id: number; bedNumber: string; studentId: number | null; assignedAt: string | null; student?: { user: { uniqueId: string; firstName: string; lastName: string } } | null; }
interface Room { id: number; name: string; capacity: number; beds: Bed[]; }
interface Hostel { id: number; name: string; gender: string; capacity: number; rooms: Room[]; }
interface AttendanceRecord { studentId: string; name: string; hostel: string; room: string; bed: string; present: boolean | null; note: string | null; }
interface StudentOption { uniqueId: string; firstName: string; lastName: string; }

const TABS = ['hostels', 'attendance'] as const;
type Tab = typeof TABS[number];

export default function HostelPage() {
  const [tab, setTab] = useState<Tab>('hostels');
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const toast = useToast();

  // hostel form
  const [showHostelForm, setShowHostelForm] = useState(false);
  const [hostelForm, setHostelForm] = useState({ name: '', gender: 'MIXED', capacity: 0 });

  // room form
  const [showRoomForm, setShowRoomForm] = useState<number | null>(null);
  const [roomForm, setRoomForm] = useState({ name: '', capacity: 4 });

  // assign form
  const [assignBed, setAssignBed] = useState<Bed | null>(null);
  const [studentId, setStudentId] = useState('');
  const [assignClass, setAssignClass] = useState('');
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentsLoading, setStudentsLoading] = useState(false);
  const { classes } = useSchoolData();

  // attendance
  const [attDate, setAttDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [attSearch, setAttSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const loadHostels = useCallback(() => {
    setLoading(true);
    api.get<any>(endpoints.admin.hostel)
      .then(r => setHostels(r.data ?? []))
      .catch(() => toast.error('Failed to load hostels'))
      .finally(() => setLoading(false));
  }, []);

  const loadAttendance = useCallback(() => {
    setAttLoading(true);
    api.get<any>(endpoints.admin.hostelAttendance, { date: attDate })
      .then(r => setAttendance(r.data ?? []))
      .catch(() => toast.error('Failed to load attendance'))
      .finally(() => setAttLoading(false));
  }, [attDate]);

  useEffect(() => { loadHostels(); }, [loadHostels]);
  useEffect(() => { if (tab === 'attendance') loadAttendance(); }, [tab, loadAttendance]);

  useEffect(() => {
    if (!assignBed) return;
    if (!assignClass) { setStudentOptions([]); return; }
    setStudentsLoading(true);
    api.get<any>(endpoints.admin.students, { class: assignClass, search: studentSearch || undefined, per_page: 50 })
      .then(r => setStudentOptions((r.data ?? []).map((s: any) => ({ uniqueId: s.student_id ?? s.uniqueId, firstName: s.firstname ?? s.firstName, lastName: s.lastname ?? s.lastName }))))
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setStudentsLoading(false));
  }, [assignBed, assignClass, studentSearch]);

  const createHostel = async () => {
    if (!hostelForm.name.trim()) return toast.error('Name required');
    try {
      await api.post(endpoints.admin.hostel, hostelForm);
      toast.success('Hostel created');
      setShowHostelForm(false);
      setHostelForm({ name: '', gender: 'MIXED', capacity: 0 });
      loadHostels();
    } catch { toast.error('Failed to create hostel'); }
  };

  const deleteHostel = async (id: number) => {
    if (!confirm('Delete this hostel and all its rooms/beds?')) return;
    try {
      await api.delete(endpoints.admin.hostelItem(String(id)));
      toast.success('Hostel deleted');
      loadHostels();
    } catch { toast.error('Failed to delete'); }
  };

  const createRoom = async (hostelId: number) => {
    if (!roomForm.name.trim()) return toast.error('Room name required');
    try {
      await api.post(endpoints.admin.hostelRooms, { hostelId: String(hostelId), ...roomForm });
      toast.success('Room created');
      setShowRoomForm(null);
      setRoomForm({ name: '', capacity: 4 });
      loadHostels();
    } catch { toast.error('Failed to create room'); }
  };

  const deleteRoom = async (id: number) => {
    if (!confirm('Delete this room and all its beds?')) return;
    try {
      await api.delete(endpoints.admin.hostelRoom(String(id)));
      toast.success('Room deleted');
      loadHostels();
    } catch { toast.error('Failed to delete room'); }
  };

  const doAssign = async () => {
    if (!assignBed || !studentId.trim()) return toast.error('Select a student');
    try {
      await api.post(endpoints.admin.hostelBedAssign(String(assignBed.id)), { studentId });
      toast.success('Bed assigned');
      setAssignBed(null);
      setStudentId('');
      setAssignClass('');
      setStudentOptions([]);
      setStudentSearch('');
      loadHostels();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed to assign'); }
  };

  const doUnassign = async (bedId: number) => {
    try {
      await api.post(endpoints.admin.hostelBedUnassign(String(bedId)), {});
      toast.success('Bed unassigned');
      loadHostels();
    } catch { toast.error('Failed to unassign'); }
  };

  const togglePresent = (studentId: string, val: boolean) => {
    setAttendance(prev => prev.map(r => r.studentId === studentId ? { ...r, present: val } : r));
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      await api.post(endpoints.admin.hostelAttendance, {
        date: attDate,
        records: attendance.filter(r => r.present !== null).map(r => ({ studentUniqueId: r.studentId, present: r.present!, note: r.note ?? undefined })),
      });
      toast.success('Attendance saved');
    } catch { toast.error('Failed to save attendance'); }
    finally { setSaving(false); }
  };

  const filteredAtt = attendance.filter(r =>
    !attSearch || `${r.name} ${r.studentId} ${r.hostel} ${r.room}`.toLowerCase().includes(attSearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Hostel</h1>

      <div className="flex gap-2">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm'}`}>
            {t === 'hostels' ? 'Hostels & Rooms' : 'Attendance'}
          </button>
        ))}
      </div>

      {/* ── Hostels tab ─────────────────────────────────────────────────── */}
      {tab === 'hostels' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowHostelForm(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors">
              <Plus size={15} /> Add Hostel
            </button>
          </div>

          {showHostelForm && (
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
              <h2 className="font-semibold text-gray-900">New Hostel</h2>
              <div className="flex flex-wrap gap-3">
                <input value={hostelForm.name} onChange={e => setHostelForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Hostel name" className="flex-1 min-w-[180px] border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <select value={hostelForm.gender} onChange={e => setHostelForm(f => ({ ...f, gender: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="MIXED">Mixed</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
                <input type="number" min={0} value={hostelForm.capacity} onChange={e => setHostelForm(f => ({ ...f, capacity: Number(e.target.value) }))}
                  placeholder="Total capacity" className="w-36 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="flex gap-2">
                <button onClick={createHostel} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium">Create</button>
                <button onClick={() => setShowHostelForm(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium">Cancel</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse" />)}</div>
          ) : hostels.length === 0 ? (
            <EmptyState icon={Building2} message="No hostels yet." />
          ) : hostels.map(hostel => {
            const totalBeds = hostel.rooms.reduce((s, r) => s + r.beds.length, 0);
            const occupied = hostel.rooms.reduce((s, r) => s + r.beds.filter(b => b.studentId).length, 0);
            const isOpen = expanded[hostel.id];
            return (
              <div key={hostel.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setExpanded(e => ({ ...e, [hostel.id]: !isOpen }))}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-xl"><Building2 size={18} className="text-purple-600" /></div>
                    <div>
                      <div className="font-semibold text-gray-900">{hostel.name}</div>
                      <div className="text-xs text-gray-500">{hostel.gender} · {occupied}/{totalBeds} beds occupied · {hostel.rooms.length} rooms</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={e => { e.stopPropagation(); deleteHostel(hostel.id); }}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={15} /></button>
                    {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-gray-100 p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Rooms</span>
                      <button onClick={() => setShowRoomForm(showRoomForm === hostel.id ? null : hostel.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">
                        <Plus size={13} /> Add Room
                      </button>
                    </div>

                    {showRoomForm === hostel.id && (
                      <div className="flex flex-wrap gap-2 bg-gray-50 rounded-xl p-3">
                        <input value={roomForm.name} onChange={e => setRoomForm(f => ({ ...f, name: e.target.value }))}
                          placeholder="Room name (e.g. Room A)" className="flex-1 min-w-[150px] border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        <input type="number" min={1} max={20} value={roomForm.capacity} onChange={e => setRoomForm(f => ({ ...f, capacity: Number(e.target.value) }))}
                          className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        <button onClick={() => createRoom(hostel.id)} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium">Create</button>
                        <button onClick={() => setShowRoomForm(null)} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">Cancel</button>
                      </div>
                    )}

                    {hostel.rooms.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No rooms yet</p>
                    ) : hostel.rooms.map(room => (
                      <div key={room.id} className="border border-gray-100 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm text-gray-800">{room.name} <span className="text-gray-400 font-normal">({room.beds.filter(b => b.studentId).length}/{room.beds.length} occupied)</span></span>
                          <button onClick={() => deleteRoom(room.id)} className="p-1 text-red-400 hover:text-red-600 rounded-lg"><Trash2 size={13} /></button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {room.beds.map(bed => (
                            <div key={bed.id} className={`rounded-lg p-2 text-xs border ${bed.studentId ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
                              <div className="flex items-center gap-1 font-medium text-gray-700 mb-1"><BedDouble size={12} /> {bed.bedNumber}</div>
                              {bed.student ? (
                                <div>
                                  <div className="text-gray-800 truncate">{bed.student.user.firstName} {bed.student.user.lastName}</div>
                                  <div className="text-gray-400">{bed.student.user.uniqueId}</div>
                                  <button onClick={() => doUnassign(bed.id)} className="mt-1 text-red-500 hover:underline text-xs">Unassign</button>
                                </div>
                              ) : (
                                <button onClick={() => { setAssignBed(bed); setStudentId(''); setAssignClass(''); setStudentOptions([]); setStudentSearch(''); }}
                                  className="text-purple-600 hover:underline text-xs">Assign student</button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Attendance tab ───────────────────────────────────────────────── */}
      {tab === 'attendance' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap gap-3 items-center">
            <input type="date" value={attDate} onChange={e => setAttDate(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={attSearch} onChange={e => setAttSearch(e.target.value)}
                placeholder="Search students..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <button onClick={saveAttendance} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium">
              <UserCheck size={15} /> {saving ? 'Saving…' : 'Save Attendance'}
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="p-3 text-left font-medium text-gray-600">Student</th>
                    <th className="p-3 text-left font-medium text-gray-600">Hostel / Room / Bed</th>
                    <th className="p-3 text-left font-medium text-gray-600">Status</th>
                    <th className="p-3 text-left font-medium text-gray-600">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {attLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}><td colSpan={4} className="p-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
                    ))
                  ) : filteredAtt.length === 0 ? (
                    <tr><td colSpan={4}><EmptyState icon={UserCheck} message="No hostel students found." card={false} /></td></tr>
                  ) : filteredAtt.map(r => (
                    <tr key={r.studentId} className="hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium text-gray-900">{r.name}</div>
                        <div className="text-gray-400 text-xs">{r.studentId}</div>
                      </td>
                      <td className="p-3 text-gray-500 text-xs">{r.hostel} › {r.room} › {r.bed}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button onClick={() => togglePresent(r.studentId, true)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${r.present === true ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-green-50'}`}>
                            Present
                          </button>
                          <button onClick={() => togglePresent(r.studentId, false)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${r.present === false ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-red-50'}`}>
                            Absent
                          </button>
                        </div>
                      </td>
                      <td className="p-3">
                        <input
                          value={r.note ?? ''}
                          onChange={e => setAttendance(prev => prev.map(a => a.studentId === r.studentId ? { ...a, note: e.target.value } : a))}
                          placeholder="Optional note"
                          className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign bed modal ─────────────────────────────────────────────── */}
      {assignBed && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="font-semibold text-gray-900">Assign {assignBed.bedNumber}</h2>

            <select value={assignClass} onChange={e => { setAssignClass(e.target.value); setStudentId(''); setStudentSearch(''); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">Select class…</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {assignClass && (
              <>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                    placeholder="Search student name…"
                    className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                  {studentsLoading ? (
                    <div className="p-3 text-sm text-gray-400 text-center">Loading…</div>
                  ) : studentOptions.length === 0 ? (
                    <div className="p-3 text-sm text-gray-400 text-center">No students found</div>
                  ) : studentOptions.map(s => (
                    <button key={s.uniqueId} onClick={() => setStudentId(s.uniqueId)}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${studentId === s.uniqueId ? 'bg-purple-50 text-purple-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}>
                      {s.firstName} {s.lastName}
                      <span className="ml-1 text-gray-400 text-xs">{s.uniqueId}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="flex gap-2">
              <button onClick={doAssign} disabled={!studentId}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium">Assign</button>
              <button onClick={() => setAssignBed(null)} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
