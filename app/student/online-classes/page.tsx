'use client';
import { useEffect, useState } from 'react';
import { Video, ExternalLink } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface OnlineClass {
  id: number;
  title: string;
  className: string;
  scheduledAt: string;
  durationMinutes: number;
  roomUrl: string;
  staff?: { user?: { firstname: string; lastname: string } };
}

export default function StudentOnlineClasses() {
  const [classes, setClasses] = useState<OnlineClass[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    api.get<any>(endpoints.student.onlineClasses)
      .then(r => setClasses(r.data ?? r ?? []))
      .catch(() => toast.error('Failed to load classes'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Online Classes</h1>

      <div className="bg-white rounded-2xl card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Video size={40} className="mb-3 opacity-40" />
            <p className="text-sm">No online classes scheduled for your class yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {classes.map(c => {
              const dt = new Date(c.scheduledAt);
              const endTime = new Date(dt.getTime() + c.durationMinutes * 60 * 1000);
              const isExpired = endTime < new Date();
              const teacher = c.staff?.user ? `${c.staff.user.firstname} ${c.staff.user.lastname}` : 'Teacher';
              return (
                <div key={c.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isExpired ? 'bg-gray-100' : 'bg-green-100'}`}>
                    <Video size={18} className={isExpired ? 'text-gray-400' : 'text-green-600'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{c.title}</p>
                    <p className="text-xs text-gray-500">{teacher} · {dt.toLocaleString()} · {c.durationMinutes} min</p>
                  </div>
                  {isExpired ? (
                    <span className="px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 bg-gray-100 text-gray-400">Ended</span>
                  ) : (
                    <a href={c.roomUrl} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 bg-green-600 text-white hover:bg-green-700">
                      <ExternalLink size={12} /> Join
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
