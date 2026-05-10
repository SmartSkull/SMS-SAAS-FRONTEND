'use client';
import { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/StateDisplay';

interface Notification { id: string; title: string; message: string; readAt: string | null; createdAt: string; }

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    api.get<{ data: Notification[] }>(endpoints.admin.notifications)
      .then(r => setItems(r.data ?? []))
      .catch(() => toast.error('Failed to load notifications'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    try {
      await api.post(endpoints.admin.notificationsRead, {});
      setItems(p => p.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
      toast.success('All marked as read');
    } catch { toast.error('Failed'); }
  };

  const unread = items.filter(n => !n.readAt).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unread > 0 && <p className="text-sm text-gray-500 mt-0.5">{unread} unread</p>}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>
      <div className="bg-white rounded-2xl card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState icon={Bell} message="No notifications yet." />
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map(n => (
              <div key={n.id} className={`flex gap-4 p-4 ${!n.readAt ? 'bg-purple-50/50' : ''}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${!n.readAt ? 'bg-purple-100' : 'bg-gray-100'}`}>
                  <Bell size={16} className={!n.readAt ? 'text-purple-600' : 'text-gray-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${!n.readAt ? 'text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                    {!n.readAt && <span className="w-2 h-2 bg-purple-500 rounded-full shrink-0 mt-1.5" />}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
