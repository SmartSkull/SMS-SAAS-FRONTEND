'use client';
import { useEffect, useState } from 'react';
import { Building2, BedDouble, Users, User } from 'lucide-react';
import { api } from '@/lib/api';

export default function StudentHostelPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<any>('student/hostel')
      .then(r => setData(r.data))
      .catch(() => setError('Failed to load hostel info'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}</div>;
  if (error) return <div className="p-6 text-red-500 text-sm">{error}</div>;
  if (!data) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-400">
      <Building2 size={40} className="mb-3 opacity-30" />
      <p className="text-sm font-medium">No hostel assignment</p>
      <p className="text-xs mt-1">Contact your school admin if you expect to be in the hostel.</p>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto space-y-4 p-4">
      <h1 className="text-2xl font-bold text-gray-900">My Hostel</h1>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
            <Building2 size={24} className="text-purple-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg">{data.hostel}</p>
            <p className="text-xs text-gray-500 capitalize">{data.block} Block</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Building2, label: 'Room', value: data.room },
            { icon: BedDouble, label: 'Bed Number', value: data.bed },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-purple-50 rounded-xl p-3 flex items-center gap-3">
              <Icon size={18} className="text-purple-500 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="font-bold text-gray-900">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} className="text-purple-500" />
          <p className="text-sm font-semibold text-gray-700">Roommates ({data.roommates?.length ?? 0})</p>
        </div>
        {!data.roommates?.length ? (
          <p className="text-sm text-gray-400">No roommates assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {data.roommates.map((r: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                  <User size={14} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{r.name}</p>
                  <p className="text-xs text-gray-400">Bed {r.bed}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
