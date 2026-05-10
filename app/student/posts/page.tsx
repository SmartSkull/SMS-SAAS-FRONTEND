'use client';
import { Heart, MessageCircle, Newspaper } from 'lucide-react';
import { usePosts } from '@/hooks/student';
import { EmptyState } from '@/components/ui/StateDisplay';

export default function StudentPosts() {
  const { posts, loading, like } = usePosts();

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-gray-200 rounded-2xl animate-pulse" />)}</div>
      ) : posts.length === 0 ? (
        <EmptyState icon={Newspaper} message="No posts yet." />
      ) : (
        posts.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl card shadow-sm border border-gray-100 overflow-hidden">
            {p.image && <img src={`https://www.florierenparklaneis.com.ng${p.image}`} alt={p.title} className="w-full h-48 object-cover" />}
            <div className="p-5">
              <h3 className="font-bold text-gray-900 mb-1">{p.title}</h3>
              <p className="text-xs text-gray-400 mb-3">By {p.author_name} · {new Date(p.created_at).toLocaleDateString()}</p>
              <p className="text-gray-600 text-sm line-clamp-3">{p.content}</p>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-50">
                <button onClick={() => like(p.id)}
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${p.liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}>
                  <Heart size={16} fill={p.liked ? 'currentColor' : 'none'} /> {p.likes}
                </button>
                <span className="flex items-center gap-1.5 text-sm text-gray-400">
                  <MessageCircle size={16} /> {p.comments}
                </span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
