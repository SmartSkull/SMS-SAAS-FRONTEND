'use client';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/StateDisplay';
import { useToast } from '@/components/ui/Toast';
import { api, endpoints, getImageUrl } from '@/lib/api';
import { Bold, Edit2, Image, Italic, List, Newspaper, Plus, Trash2, Underline, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Post {
  id: number; title: string; content: string; image?: string;
  author_name: string; likes: number; comments: number; created_at: string; audience?: string;
}

interface PostForm { html: string; image?: File | null; audience: string; }
const EMPTY: PostForm = { html: '', image: null, audience: 'all' };

function RichEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value;
  }, []);

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    ref.current?.focus();
    onChange(ref.current?.innerHTML ?? '');
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('bold'); }} className="p-1.5 hover:bg-gray-200 rounded text-gray-700"><Bold size={14} /></button>
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('italic'); }} className="p-1.5 hover:bg-gray-200 rounded text-gray-700"><Italic size={14} /></button>
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('underline'); }} className="p-1.5 hover:bg-gray-200 rounded text-gray-700"><Underline size={14} /></button>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('insertUnorderedList'); }} className="p-1.5 hover:bg-gray-200 rounded text-gray-700"><List size={14} /></button>
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('formatBlock', 'h3'); }} className="p-1.5 hover:bg-gray-200 rounded text-gray-700 text-xs font-bold">H</button>
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('formatBlock', 'p'); }} className="p-1.5 hover:bg-gray-200 rounded text-gray-700 text-xs">¶</button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(ref.current?.innerHTML ?? '')}
        className="min-h-[120px] px-3 py-2 text-sm text-black focus:outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_h3]:font-bold [&_h3]:text-base"
      />
    </div>
  );
}

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
  const openEdit = (p: Post) => { setForm({ html: p.content, image: null, audience: p.audience ?? 'all' }); setModal({ open: true, post: p }); };

  const save = async () => {
    if (!form.html.replace(/<[^>]*>/g, '').trim()) return;
    setSaving(true);
    try {
      if (form.image) {
        const fd = new FormData();
        fd.append('text', form.html);
        fd.append('audience', form.audience);
        fd.append('image', form.image);
        if (modal.post) await api.upload(`${endpoints.admin.posts}/${modal.post.id}`, fd, 'PUT');
        else await api.upload(endpoints.admin.posts, fd);
      } else {
        if (modal.post) await api.put(`${endpoints.admin.posts}/${modal.post.id}`, { text: form.html, audience: form.audience });
        else await api.post(endpoints.admin.posts, { text: form.html, audience: form.audience });
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
                  <div className="text-gray-800 text-sm [&_b]:font-bold [&_i]:italic [&_u]:underline [&_ul]:list-disc [&_ul]:pl-4 [&_h3]:font-bold [&_h3]:text-base line-clamp-3"
                    dangerouslySetInnerHTML={{ __html: p.content }} />
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                    <span>{p.author_name}</span>
                    <span>{new Date(p.created_at).toLocaleDateString()}</span>
                    <span>❤️ {p.likes}</span>
                    <span>💬 {p.comments}</span>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${p.audience === 'staff' ? 'bg-blue-100 text-blue-700' : p.audience === 'student' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {p.audience === 'staff' ? 'Staff' : p.audience === 'student' ? 'Students' : 'Everyone'}
                    </span>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Visible To</label>
                <select value={form.audience} onChange={e => setForm(p => ({ ...p, audience: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
                  <option value="all">Everyone (Students & Staff)</option>
                  <option value="student">Students only</option>
                  <option value="staff">Staff only</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Post Text</label>
                <RichEditor value={form.html} onChange={html => setForm(p => ({ ...p, html }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image (optional)</label>
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 text-sm text-gray-500">
                  <Image size={16} />
                  {form.image ? form.image.name : 'Choose image'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setForm((p) => ({ ...p, image: e.target.files?.[0] ?? null }))} />
                </label>
                {form.image && (
                  <img src={URL.createObjectURL(form.image)} alt="preview" className="mt-2 w-full max-h-48 object-cover rounded-xl" />
                )}
                {!form.image && modal.post?.image && getImageUrl(modal.post.image) && (
                  <img src={getImageUrl(modal.post.image)!} alt="current" className="mt-2 w-full max-h-48 object-cover rounded-xl" />
                )}
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
