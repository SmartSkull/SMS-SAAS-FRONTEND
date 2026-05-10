'use client';
import { useEffect, useState, useCallback } from 'react';
import { Search, CheckCircle, Trash2, ExternalLink, BookOpen } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import type { ApiResponse } from '@/types';
import { EmptyState } from '@/components/ui/StateDisplay';

interface LibraryItem {
  id: number; title: string; description?: string; file_url: string;
  course?: string; class?: string; uploaded_by: string; approved: boolean; created_at: string;
}

export default function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    api.get<ApiResponse<{ library: LibraryItem[] }>>(endpoints.admin.library)
      .then((r) => setItems(r.data.library ?? []))
      .catch(() => toast.error('Failed to load library'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: number) => {
    try { await api.put(`${endpoints.admin.library}/${id}/approve`, {}); toast.success('Approved'); load(); }
    catch { toast.error('Failed to approve'); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this item?')) return;
    try { await api.delete(`${endpoints.admin.library}/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const filtered = items.filter((i) =>
    !search || `${i.title} ${i.course} ${i.class} ${i.uploaded_by}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Library</h1>

      <div className="bg-white rounded-2xl card shadow-sm p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search library..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
      </div>

      <div className="bg-white rounded-2xl card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-3 text-left font-medium text-gray-600">Title</th>
                <th className="p-3 text-left font-medium text-gray-600">Course</th>
                <th className="p-3 text-left font-medium text-gray-600">Class</th>
                <th className="p-3 text-left font-medium text-gray-600">Uploaded By</th>
                <th className="p-3 text-left font-medium text-gray-600">Date</th>
                <th className="p-3 text-left font-medium text-gray-600">Status</th>
                <th className="p-3 text-left font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="p-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7}><EmptyState icon={BookOpen} message="No items found." card={false} /></td></tr>
              ) : filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <div className="font-medium text-gray-900">{item.title}</div>
                    {item.description && <div className="text-gray-400 text-xs truncate max-w-48">{item.description}</div>}
                  </td>
                  <td className="p-3 text-gray-600">{item.course ?? '—'}</td>
                  <td className="p-3 text-gray-600">{item.class ?? '—'}</td>
                  <td className="p-3 text-gray-600">{item.uploaded_by}</td>
                  <td className="p-3 text-gray-500 text-xs">{new Date(item.created_at).toLocaleDateString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.approved ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {item.approved ? 'Approved' : 'Pending'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                        <ExternalLink size={16} />
                      </a>
                      {!item.approved && (
                        <button onClick={() => approve(item.id)} className="text-blue-600 hover:text-blue-800"><CheckCircle size={16} /></button>
                      )}
                      <button onClick={() => remove(item.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
