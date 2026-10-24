'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, LayoutGroup, AnimatePresence, Variants } from 'framer-motion';
import { Home, Search, Filter } from 'lucide-react';
import { Post } from '@/types/blog';
import PostCard from './PostCard';
import BlogDetailModal from './BlogDetailModal';
import { blogApi, interactionApi, handleApiError, Pagination } from '@/lib/api';
import { toast } from 'react-hot-toast';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function BlogFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const hasOpenedSharedPost = useRef(false);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const mapPost = (p: any): Post => ({
    id: p.id,
    title: p.title,
    subtitle: p.subtitle || p.excerpt || '',
    content: p.content || '',
    coverImage: p.image || p.coverImage || 'https://images.unsplash.com/photo-1499750789039-ca2a2f92c815?w=800&h=400&fit=crop',
    author: p.author?.name || 'Unknown',
    date: p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : new Date().toLocaleDateString(),
    tags: p.tags?.map((t: any) => t.tag?.name || t.name) || [],
    status: p.status || 'published',
    likes: p._count?.likes || 0,
    comments: p._count?.comments || 0,
    views: p.viewCount || 0,
  });

  /** Loads one page. `append` keeps what is already on screen. */
  const loadPage = useCallback(async (page: number, append: boolean) => {
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const { posts: fetched, pagination: info } = await blogApi.getPostsPage(page);

      setLikedPosts((prev) => {
        const next = append ? new Set(prev) : new Set<string>();
        fetched.forEach((p: any) => {
          if (p.userLiked) next.add(p.id);
        });
        return next;
      });

      const mapped = fetched.map(mapPost);
      setPosts((prev) => {
        if (!append) return mapped;
        // Guard against a post arriving twice if one is published mid-scroll
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...mapped.filter((p) => !seen.has(p.id))];
      });
      setPagination(info);
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      append ? setLoadingMore(false) : setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPage(1, false);
  }, [loadPage]);

  // Open the article named by a shared link (/blogs?post=<id>) once the feed loads
  useEffect(() => {
    if (hasOpenedSharedPost.current || posts.length === 0) return;
    if (typeof window === 'undefined') return;

    const sharedId = new URLSearchParams(window.location.search).get('post');
    if (!sharedId) return;

    hasOpenedSharedPost.current = true;
    const shared = posts.find((p) => p.id === sharedId);
    if (shared) setSelectedPost(shared);
  }, [posts]);

  const handleLike = async (id: string) => {
    try {
      const result = await interactionApi.toggleLike(id);
      const newLiked = new Set(likedPosts);
      if (result.liked) newLiked.add(id);
      else newLiked.delete(id);
      setLikedPosts(newLiked);
      setPosts(prev => prev.map(p => p.id === id ? { ...p, likes: result.count } : p));
    } catch (err) {
      console.error('Failed to like:', err);
    }
  };

  const filteredPosts = posts.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
        <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Loading Feed...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 sm:mb-12 gap-4 sm:gap-6">
        <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-gray-900 flex items-center gap-2.5 sm:gap-4">
          <Home className="text-[#f5b800] w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 shrink-0" />
          Public Feed
        </h1>
        
        <div className="relative w-full md:flex-1 md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search stories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 sm:pl-12 pr-4 py-3 sm:py-4 text-sm sm:text-base bg-white/70 backdrop-blur-md border border-white rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all font-medium"
          />
        </div>
      </div>

      <LayoutGroup>
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-5 md:auto-rows-fr md:grid-cols-2 sm:gap-6 xl:grid-cols-3 xl:gap-8"
        >
          <AnimatePresence mode="popLayout">
            {filteredPosts.map((post) => (
              <motion.div key={post.id} variants={itemVariants} className="h-full">
                <PostCard
                  post={post}
                  isLiked={likedPosts.has(post.id)}
                  onLike={handleLike}
                  onClick={() => setSelectedPost(post)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>

      {/* Paging: searching filters only what is already loaded, so the
          control is hidden while a search is active to avoid confusion. */}
      {pagination && !searchQuery.trim() && (
        <div className="mt-10 sm:mt-14 flex flex-col items-center gap-3">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
            Showing {posts.length} of {pagination.total}
          </p>
          {pagination.hasMore ? (
            <button
              onClick={() => loadPage(pagination.page + 1, true)}
              disabled={loadingMore}
              className="rounded-2xl bg-gray-900 px-7 py-3.5 text-sm font-black text-white transition-colors hover:bg-[#f5b800] disabled:opacity-60"
            >
              {loadingMore ? 'Loading...' : 'Load more stories'}
            </button>
          ) : (
            posts.length > 0 && (
              <p className="text-xs font-medium text-gray-400">You have reached the end</p>
            )
          )}
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="py-20 text-center">
          <p className="font-black text-gray-400">No stories published yet.</p>
        </div>
      )}

      {/* AnimatePresence holds the modal in the tree until its exit finishes,
          so closing shrinks the post back into the card it came from. Without
          it React unmounted the node on the same tick and the post vanished. */}
      <AnimatePresence>
        {selectedPost && (
          <BlogDetailModal
            key={selectedPost.id}
            selectedPost={selectedPost}
            setSelectedPost={setSelectedPost}
            onLike={() => handleLike(selectedPost.id)}
            isLiked={likedPosts.has(selectedPost.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
