'use client';
import { useEffect, useState } from 'react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { FileText, Download } from 'lucide-react';
import type { ApiResponse, Assignment } from '@/types';
import { EmptyState } from '@/components/ui/StateDisplay';

export default function StudentAssignments() {
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    api.get<ApiResponse<Assignment[]>>(endpoints.student.assignments)
      .then((r) => setItems(r.data))
      .catch(() => toast.error('Failed to load assignments'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={FileText} message="No assignments yet." />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl card shadow-sm border border-gray-100 p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText size={18} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{a.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{a.course} · {a.class}</p>
                  <p className="text-xs text-gray-400 mt-1">{a.description}</p>
                  <p className="text-xs text-amber-600 font-medium mt-2">Due: {new Date(a.due_date).toLocaleDateString()}</p>
                </div>
                {a.file_url && (
                  <a href={`https://www.florierenparklaneis.com.ng${a.file_url}`} target="_blank" rel="noreferrer"
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors">
                    <Download size={16} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
