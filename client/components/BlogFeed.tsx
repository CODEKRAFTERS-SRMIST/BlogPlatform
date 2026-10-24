'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, LayoutGroup, AnimatePresence, Variants } from 'framer-motion';
import { Home, Search, Filter } from 'lucide-react';
import { Post } from '@/types/blog';
import PostCard from './PostCard';
import BlogDetailModal from './BlogDetailModal';
import { blogApi, interactionApi, handleApiError, Pagination } from '@/lib/api';
import { mapPost } from '@/lib/mapPost';
import { useAuth } from '@/lib/useAuth';
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
  const { isLoggedIn, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const hasOpenedSharedPost = useRef(false);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<Pagination | null>(null);

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

  /*
   * Waits for the session before asking for the feed.
   *
   * /blogs/public takes an optional session: with a valid one it marks the
   * stories you have already liked, and without one it answers as though you
   * were a stranger - a 200, not a 401. So an access token that had quietly
   * expired produced a feed of white hearts with nothing anywhere to notice
   * it, while the like button itself still worked, because that endpoint
   * does answer 401 and the token gets renewed on the way through. Tapping a
   * heart you had already given then took the like away.
   *
   * useAuth settles first, and renewing the token is part of settling, so by
   * the time this runs the request carries a session that is actually valid,
   * or none at all.
   */
  useEffect(() => {
    if (authLoading) return;
    loadPage(1, false);
  }, [loadPage, authLoading, isLoggedIn]);

  /*
   * Opening a story puts its address in the bar without navigating.
   *
   * pushState is not a route change: nothing is fetched, nothing re-renders,
   * and the panel opens from the story already in memory. The feed stays as
   * quick as it was, the Share button always has a real link to hand out,
   * and the back button lands on the feed instead of leaving the site.
   */
  const openPost = useCallback((post: Post) => {
    setSelectedPost(post);
    if (typeof window === 'undefined') return;
    try {
      window.history.pushState({ storyId: post.id }, '', '/blogs/' + post.id);
    } catch {
      // Some embedded browsers refuse history writes; opening still works.
    }
  }, []);

  const closePost = useCallback(() => {
    setSelectedPost(null);
    if (typeof window === 'undefined') return;
    // Only step back if we were the ones who pushed, or a visitor who
    // arrived here directly would be sent back out of the site.
    if (window.history.state && window.history.state.storyId) {
      window.history.back();
    }
  }, []);

  // The back button closes the panel rather than leaving the feed.
  useEffect(() => {
    const onPop = () => {
      const state = window.history.state;
      if (!state || !state.storyId) setSelectedPost(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  /*
   * Opens the story named by an older share link, /blogs?post=<id>.
   *
   * New links are /blogs/<id> and have a page of their own. These are the
   * ones already sent to people, and they used to work only by accident: the
   * story had to be among the nine the feed had loaded, so a link to
   * anything older opened the feed and quietly did nothing. Anything not on
   * the page is fetched by id now.
   */
  useEffect(() => {
    if (hasOpenedSharedPost.current || loading) return;
    if (typeof window === 'undefined') return;

    const sharedId = new URLSearchParams(window.location.search).get('post');
    if (!sharedId) return;
    hasOpenedSharedPost.current = true;

    const alreadyHere = posts.find((p) => p.id === sharedId);
    if (alreadyHere) {
      openPost(alreadyHere);
      return;
    }

    let cancelled = false;
    blogApi
      .getPostById(sharedId)
      .then((raw) => {
        if (!cancelled && raw) openPost(mapPost(raw));
      })
      .catch(() => {
        if (!cancelled) toast.error('That story is no longer available.');
      });

    return () => {
      cancelled = true;
    };
  }, [posts, loading, openPost]);

  const handleLike = async (id: string) => {
    /*
     * Asked before firing. A signed-out visitor tapping a heart used to send
     * a request that could only answer 401, which the API layer met by
     * trying to renew a session that was never there and then redirecting to
     * the login page - so a guest reading the feed was thrown out of it with
     * no explanation at all.
     */
    if (!isLoggedIn) {
      toast('Sign in to like this story');
      return;
    }

    const wasLiked = likedPosts.has(id);
    const previousCount = posts.find((p) => p.id === id)?.likes ?? 0;

    // Moves on the tap, then settles on whatever the server says.
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(id);
      else next.add(id);
      return next;
    });
    setPosts((prev) =>
      prev.map((post) =>
        post.id === id
          ? { ...post, likes: Math.max(post.likes + (wasLiked ? -1 : 1), 0) }
          : post,
      ),
    );

    try {
      const result = await interactionApi.toggleLike(id);
      setLikedPosts((prev) => {
        const next = new Set(prev);
        if (result.liked) next.add(id);
        else next.delete(id);
        return next;
      });
      setPosts((prev) =>
        prev.map((post) => (post.id === id ? { ...post, likes: result.count } : post)),
      );
    } catch (err) {
      setLikedPosts((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.add(id);
        else next.delete(id);
        return next;
      });
      setPosts((prev) =>
        prev.map((post) => (post.id === id ? { ...post, likes: previousCount } : post)),
      );
      toast.error(handleApiError(err));
    }
  };

  // Title and subtitle. The tag arm this replaces could never match:
  // tags were never stored, so every post carried an empty list.
  const filteredPosts = posts.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      p.title.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q)
    );
  });

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
                  onClick={() => openPost(post)}
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
            setSelectedPost={closePost}
            onLike={() => handleLike(selectedPost.id)}
            isLiked={likedPosts.has(selectedPost.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
