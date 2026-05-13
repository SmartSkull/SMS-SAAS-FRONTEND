'use client';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/StateDisplay';
import { useToast } from '@/components/ui/Toast';
import { api, endpoints, getImageUrl } from '@/lib/api';
import { Edit2, Image, Newspaper, Plus, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Post {
  id: number; title: string; content: string; image?: string;
  author_name: string; likes: number; comments: number; created_at: string;
}

interface PostForm { text: string; image?: File | null; }
const EMPTY: PostForm = { text: '', image: null };

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; post?: Post }>({ open: false });
  const [form, setForm] = useState<PostForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    api.get<any>(endpoints.admin.posts)
      .then((r) => setPosts(Array.isArray(r.data) ? r.data : (r.data?.posts ?? [])))
      .catch(() => toast.error('Failed to load posts'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY); setModal({ open: true }); };
  const openEdit = (p: Post) => { setForm({ text: p.content, image: null }); setModal({ open: true, post: p }); };

  const save = async () => {
    if (!form.text.trim()) return;
    setSaving(true);
    try {
      if (form.image) {
        const fd = new FormData();
        fd.append('text', form.text);
        fd.append('image', form.image);
        if (modal.post) await api.upload(`${endpoints.admin.posts}/${modal.post.id}`, fd, 'PUT');
        else await api.upload(endpoints.admin.posts, fd);
      } else {
        if (modal.post) await api.put(`${endpoints.admin.posts}/${modal.post.id}`, { text: form.text });
        else await api.post(endpoints.admin.posts, { text: form.text });
      }
      toast.success(modal.post ? 'Post updated' : 'Post created');
      setModal({ open: false }); load();
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? 'Failed to save');
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!confirmId) return;
    try { await api.delete(`${endpoints.admin.posts}/${confirmId}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
    finally { setConfirmId(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700">
          <Plus size={16} /> New Post
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 bg-white rounded-2xl card shadow-sm animate-pulse" />)}</div>
      ) : posts.length === 0 ? (
        <EmptyState icon={Newspaper} message="No posts yet." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-20 lg:grid-cols-3 gap-4">
          {posts.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl card shadow-sm p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{p.title}</h3>
                  </div>
                  <p className="text-gray-600 text-sm line-clamp-2">{p.content}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                    <span>{p.author_name}</span>
                    <span>{new Date(p.created_at).toLocaleDateString()}</span>
                    <span>❤️ {p.likes}</span>
                    <span>💬 {p.comments}</span>
                  </div>
                </div>
                {getImageUrl(p.image) && (
                  <img src={getImageUrl(p.image)!} alt={p.title} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                )}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-800"><Edit2 size={16} /></button>
                  <button onClick={() => setConfirmId(p.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl card shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{modal.post ? 'Edit Post' : 'New Post'}</h2>
              <button onClick={() => setModal({ open: false })}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Post Text</label>
                <textarea value={form.text} onChange={(e) => setForm((p) => ({ ...p, text: e.target.value }))} rows={6}
                  className="w-full px-3 py-2 border text-black border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image (optional)</label>
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 text-sm text-gray-500">
                  <Image size={16} />
                  {form.image ? form.image.name : 'Choose image'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setForm((p) => ({ ...p, image: e.target.files?.[0] ?? null }))} />
                </label>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setModal({ open: false })} className="flex-1 px-4 py-2 border border-gray-200 text-black rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-60">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmId !== null && (
        <ConfirmModal onConfirm={remove} onCancel={() => setConfirmId(null)} />
      )}
    </div>
  );
}
