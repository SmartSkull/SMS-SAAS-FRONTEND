'use client';
import { useState } from 'react';
import { Heart, MessageCircle, Calendar, Newspaper, Send, X } from 'lucide-react';
import { useStaffPosts } from '@/hooks/staff';
import { api } from '@/lib/api';
import { EmptyState } from '@/components/ui/StateDisplay';
import { useToast } from '@/components/ui/Toast';

export default function StaffPosts() {
  const { posts, setPosts, loading, hasMore, loadMore } = useStaffPosts();
  const [commentModal, setCommentModal] = useState<{ id: number; text: string; comments: any[] } | null>(null);
  const toast = useToast();

  const openComments = async (id: number) => {
    try {
      const r = await api.get<any>(`/staff/posts/${id}`);
      setCommentModal({ id, text: '', comments: r.data?.comments ?? [] });
    } catch { toast.error('Failed to load comments'); }
  };

  const like = async (id: number) => {
    try {
      await api.post(`/staff/posts/${id}/like`, {});
      setPosts(p => p.map(post => post.id === id
        ? { ...post, liked: !post.liked, likes: post.liked ? post.likes - 1 : post.likes + 1 }
        : post));
    } catch { toast.error('Failed to like'); }
  };

  const submitComment = async () => {
    if (!commentModal?.text.trim()) return;
    try {
      await api.post(`/staff/posts/${commentModal.id}/comment`, { comment: commentModal.text });
      setPosts(p => p.map(post => post.id === commentModal.id ? { ...post, comments: post.comments + 1 } : post));
      toast.success('Comment posted');
      await openComments(commentModal.id); // refresh comments list
    } catch { toast.error('Failed to post comment'); }
  };

  if (loading) return <div className="h-64 bg-gray-200 rounded-2xl animate-pulse" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Posts</h1>

      {posts.length === 0 ? (
        <EmptyState icon={Newspaper} message="No posts available." />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-2xl card shadow-sm overflow-hidden flex flex-col">
                {post.image && <img src={post.image} alt={post.title} className="w-full h-48 object-cover" />}
                <div className="p-5 flex flex-col flex-1">
                  <h2 className="text-base font-semibold text-gray-800 mb-2 line-clamp-2">{post.title}</h2>
                  <p className="text-gray-600 text-sm leading-relaxed line-clamp-4 flex-1">{post.content}</p>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 text-xs font-semibold">{post.author_name?.[0]}</span>
                      </div>
                      <span className="truncate max-w-24">{post.author_name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <button onClick={() => like(post.id)} className="flex items-center gap-1 hover:text-red-500 transition-colors">
                        <Heart size={15} className={post.liked ? 'fill-red-500 text-red-500' : ''} />
                        {post.likes}
                      </button>
                      <button onClick={() => openComments(post.id)} className="flex items-center gap-1 hover:text-blue-500 transition-colors">
                        <MessageCircle size={15} />
                        {post.comments}
                      </button>
                      <span className="flex items-center gap-1 text-xs">
                        <Calendar size={13} />
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center">
              <button onClick={loadMore} className="border border-gray-200 px-6 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                Load More
              </button>
            </div>
          )}
        </>
      )}

      {commentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl card shadow-xl w-full max-w-sm flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Comments</h3>
              <button onClick={() => setCommentModal(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {commentModal.comments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No comments yet</p>
              ) : commentModal.comments.map((c: any) => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-xs font-bold text-blue-600">
                    {c.author?.firstName?.[0]}
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                    <p className="text-xs font-semibold text-gray-700">{c.author?.firstName} {c.author?.lastName}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100 space-y-3">
              <textarea value={commentModal.text} onChange={e => setCommentModal(p => p ? { ...p, text: e.target.value } : null)}
                rows={2} placeholder="Write a comment…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              <button onClick={submitComment} className="w-full py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
                <Send size={14} /> Post Comment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
