'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, FileText, Download } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useSchoolData } from '@/hooks/useSchoolData';
import type { ApiResponse, LibraryItem } from '@/types';
import { EmptyState } from '@/components/ui/StateDisplay';

export default function StaffLibrary() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', course: '', class: '' });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const { classes, subjects } = useSchoolData();

  const load = () => {
    setLoading(true);
    api.get<any>(endpoints.staff.library)
      .then((r) => setItems(r.data ?? []))
      .catch(() => toast.error('Failed to load library'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast.error('Please select a file'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('pdf', file);
      await api.upload(endpoints.staff.library, fd);
      toast.success('Document uploaded');
      setShowForm(false);
      setForm({ title: '', description: '', course: '', class: '' });
      setFile(null);
      load();
    } catch {
      toast.error('Failed to upload document');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this document?')) return;
    try {
      await api.delete(`${endpoints.staff.library}/${id}`);
      toast.success('Document deleted');
      load();
    } catch {
      toast.error('Failed to delete document');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Library</h1>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 btn-brand text-white px-4 py-2 rounded-xl text-sm font-medium ">
          <Plus size={16} /> Upload Document
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl card shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Upload Document</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input required type="text" value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <select required value={form.course} onChange={e => setForm(p => ({ ...p, course: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Select course</option>
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <select value={form.class} onChange={e => setForm(p => ({ ...p, class: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Select class</option>
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">File <span className="text-red-500">*</span></label>
              <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm text-gray-600" />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={submitting}
                className="btn-brand text-white px-5 py-2 rounded-xl text-sm font-medium  disabled:opacity-50">
                {submitting ? 'Uploading…' : 'Upload'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="border border-gray-200 px-5 py-2 rounded-xl text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl card shadow-sm p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={FileText} message="No documents uploaded yet." card={false} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div key={item.id} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                    <FileText size={18} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{item.title}</p>
                    {item.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>}
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {item.course && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{item.course}</span>}
                      {item.class && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{item.class}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{new Date(item.createdAt ?? item.created_at).toLocaleDateString()}</span>
                  <div className="flex gap-2">
                    <a href={item.file_url ? `/api${item.file_url}` : '#'}
                      download
                      target="_blank" rel="noreferrer"
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Download size={15} />
                    </a>
                    <button onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
