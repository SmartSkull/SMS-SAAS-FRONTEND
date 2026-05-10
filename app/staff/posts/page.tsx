'use client';
import { Heart, MessageCircle, Calendar, Newspaper } from 'lucide-react';
import { useStaffPosts } from '@/hooks/staff';
import { EmptyState } from '@/components/ui/StateDisplay';

export default function StaffPosts() {
  const { posts, loading, hasMore, loadMore } = useStaffPosts();

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800">Posts</h1>

      {posts.length === 0 ? (
        <EmptyState icon={Newspaper} message="No posts available." />
      ) : (
        <>
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-2xl card shadow-sm overflow-hidden">
                {post.image && (
                  <img src={post.image} alt={post.title}
                    className="w-full h-48 object-cover" />
                )}
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-2">{post.title}</h2>
                  <p className="text-gray-600 text-sm leading-relaxed line-clamp-4">{post.content}</p>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 text-xs font-semibold">{post.author_name[0]}</span>
                      </div>
                      <span>{post.author_name}</span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Heart size={15} className={post.liked ? 'fill-red-500 text-red-500' : ''} />
                        {post.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle size={15} />
                        {post.comments}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={15} />
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
              <button onClick={loadMore}
                className="border border-gray-200 px-6 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
