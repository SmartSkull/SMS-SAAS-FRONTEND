'use client';
import { useState } from 'react';
import { Heart, MessageCircle, Newspaper, Send, Calendar, User, Pencil, Trash2, Check, X } from 'lucide-react';
import { usePosts } from '@/hooks/student';
import { EmptyState } from '@/components/ui/StateDisplay';
import { getImageUrl, api } from '@/lib/api';
import { auth } from '@/lib/auth';
import clsx from 'clsx';

export default function StudentPosts() {
  const { posts, loading, like, decrementComments, incrementComments } = usePosts();
  const currentUser = auth.getUser();
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [openComment, setOpenComment] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<Record<string, any[]>>({});
  const [editingComment, setEditingComment] = useState<{ id: string; text: string } | null>(null);

  const toggleComments = async (id: number) => {
    const pid = String(id);
    if (openComment === pid) { setOpenComment(null); return; }
    setOpenComment(pid);
    if (!postComments[pid]) {
      try {
        const r = await api.get<any>(`/student/posts/${id}`);
        setPostComments((p) => ({ ...p, [pid]: r.data?.comments ?? [] }));
      } catch {}
    }
  };

  const handleComment = async (id: number) => {
    const pid = String(id);
    const text = commentText[pid]?.trim();
    if (!text) return;
    // Add optimistic entry
    const tempId = `temp_${Date.now()}`;
    setPostComments((p) => ({
      ...p,
      [pid]: [...(p[pid] ?? []), { id: tempId, text, author: { firstName: currentUser?.firstname ?? 'You', lastName: currentUser?.lastname ?? '' }, createdAt: new Date().toISOString(), optimistic: true }],
    }));
    setCommentText((p) => ({ ...p, [pid]: '' }));
    try {
      const r = await api.post<any>(`/student/posts/${id}/comment`, { comment: text });
      const realId = r.data?.id;
      setPostComments((p) => ({
        ...p,
        [pid]: p[pid].map((c) => c.id === tempId ? { ...c, id: realId, optimistic: false } : c),
      }));
      incrementComments(id);
    } catch { 
      setPostComments((p) => ({ ...p, [pid]: p[pid].filter((c) => c.id !== tempId) }));
    }
  };

  const saveEdit = async (postId: string, commentId: string) => {
    if (!editingComment?.text.trim()) return;
    try {
      await api.put(`/student/posts/${postId}/comment/${commentId}`, { comment: editingComment.text });
      setPostComments((p) => ({
        ...p,
        [postId]: p[postId].map((c) => c.id === commentId ? { ...c, text: editingComment.text } : c),
      }));
      setEditingComment(null);
    } catch {}
  };

  const deleteComment = async (postId: string, commentId: string) => {
    try {
      await api.delete(`/student/posts/${postId}/comment/${commentId}`);
      setPostComments((p) => ({ ...p, [postId]: p[postId].filter((c) => String(c.id) !== commentId) }));
      decrementComments(Number(postId));
    } catch {}
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">School Posts</h1>
        <p className="text-sm text-gray-400 mt-1">Latest news and announcements</p>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl card border border-gray-100 overflow-hidden">
              <div className="h-44 bg-gray-200 animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="shimmer h-4 w-3/4 rounded" />
                <div className="shimmer h-3 w-full rounded" />
                <div className="shimmer h-3 w-2/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState icon={Newspaper} message="No posts yet." />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {posts.map((p) => {
            const pid = String(p.id);
            const isCommentOpen = openComment === pid;
            const imgSrc = p.image
              ? p.image.startsWith('http') ? p.image : getImageUrl(p.image.replace('/uploads/', ''))
              : null;

            return (
              <article key={pid} className="bg-white rounded-2xl card border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden">
                {/* Image */}
                {imgSrc ? (
                  <div className="h-44 overflow-hidden shrink-0">
                    <img src={imgSrc} alt={p.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-500 shrink-0" />
                )}

                {/* Body */}
                <div className="flex flex-col flex-1 p-5">
                  {/* Author + date */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <User size={13} className="text-blue-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-600 truncate">{p.author_name}</span>
                    <span className="text-gray-300 text-xs">·</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
                      <Calendar size={11} />
                      {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>

                  {/* Content */}
                  <p className="text-gray-900 text-sm leading-relaxed line-clamp-4 flex-1">{p.content}</p>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-4">
                    <button
                      onClick={() => like(p.id)}
                      className={clsx(
                        'flex items-center gap-1.5 text-sm font-medium transition-all',
                        p.liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
                      )}
                    >
                      <Heart size={15} fill={p.liked ? 'currentColor' : 'none'} className="transition-transform active:scale-125" />
                      <span>{p.likes ?? 0}</span>
                    </button>

                    <button
                      onClick={() => toggleComments(p.id)}
                      className={clsx(
                        'flex items-center gap-1.5 text-sm font-medium transition-colors',
                        isCommentOpen ? 'text-blue-500' : 'text-gray-400 hover:text-blue-400'
                      )}
                    >
                      <MessageCircle size={15} />
                      <span>{p.comments ?? 0}</span>
                    </button>
                  </div>

                  {/* Comments list + input */}
                  {isCommentOpen && (
                    <div className="mt-3 space-y-2">
                      {(postComments[pid] ?? []).map((c: any) => {
                        const cid = String(c.id);
                        const isOwn = !c.optimistic && (c.author?.firstName === 'You' || String(c.authorId) === String(currentUser?.id));
                        const isEditing = editingComment?.id === cid;
                        return (
                          <div key={cid} className="flex gap-2 text-xs">
                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                              <User size={11} className="text-gray-400" />
                            </div>
                            <div className="bg-gray-50 rounded-xl px-3 py-1.5 flex-1">
                              {isEditing ? (
                                <div className="flex gap-1.5 items-center">
                                  <input
                                    autoFocus
                                    value={editingComment.text}
                                    onChange={(e) => setEditingComment({ id: cid, text: e.target.value })}
                                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(pid, cid); if (e.key === 'Escape') setEditingComment(null); }}
                                    className="flex-1 bg-white border border-blue-300 rounded-lg px-2 py-0.5 text-xs focus:outline-none"
                                  />
                                  <button onClick={() => saveEdit(pid, cid)} className="text-blue-500 hover:text-blue-700"><Check size={12} /></button>
                                  <button onClick={() => setEditingComment(null)} className="text-gray-400 hover:text-gray-600"><X size={12} /></button>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-gray-600">
                                    <span className="font-semibold text-gray-700">{c.author?.firstName} {c.author?.lastName} </span>
                                    {c.text}
                                  </span>
                                  {isOwn && (
                                    <div className="flex gap-1 shrink-0">
                                      <button onClick={() => setEditingComment({ id: cid, text: c.text })} className="text-gray-400 hover:text-blue-500"><Pencil size={11} /></button>
                                      <button onClick={() => deleteComment(pid, cid)} className="text-gray-400 hover:text-red-500"><Trash2 size={11} /></button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex gap-2 pt-1">
                        <input
                          autoFocus
                          value={commentText[pid] || ''}
                          onChange={(e) => setCommentText((prev) => ({ ...prev, [pid]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && handleComment(p.id)}
                          placeholder="Write a comment…"
                          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
                        />
                        <button
                          onClick={() => handleComment(p.id)}
                          disabled={!commentText[pid]?.trim()}
                          className="p-2 btn-brand text-white rounded-xl disabled:opacity-40"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
