'use client';
import { BookOpen, Download } from 'lucide-react';
import { useLibrary } from '@/hooks/student';
import { EmptyState } from '@/components/ui/StateDisplay';

function fileHref(path?: string) {
  if (!path) return '#';
  if (path.startsWith('http')) return path;
  return path.startsWith('/api') ? path : `/api/uploads/${path.replace(/^\/?(uploads\/)?/, '')}`;
}

export default function StudentLibrary() {
  const { items, loading } = useLibrary();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Library</h1>
      {loading ? (
        <div className="grid md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={BookOpen} message="No documents available." />
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl card shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <BookOpen size={18} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
                {item.course && <p className="text-xs text-gray-400 mt-0.5">{item.course}</p>}
              </div>
              <a href={fileHref(item.file_url)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-blue-600 font-medium hover:text-blue-700">
                <Download size={14} /> Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
