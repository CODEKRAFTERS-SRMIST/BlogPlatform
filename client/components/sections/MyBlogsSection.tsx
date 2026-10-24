// Save this as: components/sections/BlogSections.tsx
// This replaces HomeSection.tsx and MyBlogsSection.tsx

'use client';

import { motion, LayoutGroup, AnimatePresence, Variants } from 'framer-motion';
import { Home, PenTool, BookHeart } from 'lucide-react';
import { Post, Section } from '@/types/blog';
import PostCard from '../PostCard';

// Enhanced animation variants
/*
 * The cascade is per card, so its total length is however many stories this
 * grid holds. At 0.045s a library of 22 took a second to settle, and the last
 * row was still arriving while you were already reading the first. 0.02s keeps
 * the cards from landing as one flat slab without making you wait for them.
 *
 * There is no `exit` here any more: the sections are swapped with a plain
 * conditional in BlogPlatform.tsx (see the note there), so nothing animates
 * the grid out and an exit variant would only ever be dead weight.
 */
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02,
      delayChildren: 0
    }
  }
};

/*
 * Fade and rise only - deliberately no `scale` and no `rotateX`.
 *
 * Those two made every card in the grid look like a different size while
 * the entry stagger was still running. `rotateX` tilts the card in 3D, and
 * under the container's `perspective` a tilted card is drawn smaller the
 * further it sits from the perspective origin, so the bottom row rendered
 * about a quarter shorter than the top one - measured 457 / 398 / 339px for
 * three rows whose real layout height was 460px each. `scale` added to it,
 * and because the cards are staggered no two were ever at the same point of
 * the animation, so at any instant they genuinely were different sizes.
 *
 * How long that lasted depended on how fast the machine could draw frames,
 * which is why the same page looked fine in one browser and ragged in
 * another. Opacity and transform-Y change nothing about a card's apparent
 * size, so the grid now reads as one even set of boxes from the first frame.
 * This matches what the public feed in BlogFeed.tsx already did.
 */
const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 24
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24
    }
  },
  exit: {
    opacity: 0,
    y: -24,
    transition: { duration: 0.12 }
  }
};

// Home Section Component
interface HomeSectionProps {
  posts: Post[];
  likedPosts: Set<string>;
  handleLike: (id: string) => void;
  handlePostClick: (post: Post) => void;
  setActiveSection: (section: Section) => void;
  total?: number;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

export function HomeSection({ 
  posts, 
  likedPosts, 
  handleLike, 
  handlePostClick,
  setActiveSection,
  total,
  hasMore,
  loadingMore,
  onLoadMore,
}: HomeSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      className="w-full max-w-7xl"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-12 gap-4">
        <motion.h1
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="text-2xl sm:text-3xl md:text-5xl font-black text-gray-900 flex items-center gap-2.5 sm:gap-4"
        >
          <motion.div whileHover={{ rotate: 360, scale: 1.15 }} transition={{ duration: 0.55 }}>
            <Home className="text-[#f5b800] w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 shrink-0" />
          </motion.div>
          All Blogs
        </motion.h1>
        <motion.button
          whileHover={{ scale: 1.08, rotate: 6 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveSection('new')}
          className="px-5 py-3 rounded-2xl bg-black text-white font-black shadow-lg inline-flex items-center gap-3"
        >
          <PenTool size={18} /> Write
        </motion.button>
      </div>

      <LayoutGroup>
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-5 md:auto-rows-fr md:grid-cols-2 sm:gap-6 md:gap-8 xl:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {posts.map((post) => (
              <motion.div
                key={post.id}
                className="h-full"
                variants={itemVariants}
                layout
              >
                <PostCard
                  post={post}
                  isLiked={likedPosts.has(post.id)}
                  onLike={handleLike}
                  onClick={() => handlePostClick(post)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>

      {typeof total === 'number' && posts.length > 0 && (
        <div className="mt-10 sm:mt-14 flex flex-col items-center gap-3">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
            Showing {posts.length} of {total}
          </p>
          {hasMore ? (
            <button
              onClick={onLoadMore}
              disabled={loadingMore}
              className="rounded-2xl bg-gray-900 px-7 py-3.5 text-sm font-black text-white transition-colors hover:bg-[#f5b800] disabled:opacity-60"
            >
              {loadingMore ? 'Loading...' : 'Load more stories'}
            </button>
          ) : (
            <p className="text-xs font-medium text-gray-400">You have reached the end</p>
          )}
        </div>
      )}
    </motion.div>
  );
}

// My Blogs Section Component
interface MyBlogsSectionProps {
  myPosts: Post[];
  likedPosts: Set<string>;
  handleLike: (id: string) => void;
  handlePostClick: (post: Post) => void;
  handleDeletePost: (id: string) => void;
  setActiveSection: (section: Section) => void;
}

export function MyBlogsSection({ 
  myPosts, 
  likedPosts, 
  handleLike, 
  handlePostClick,
  handleDeletePost,
  setActiveSection 
}: MyBlogsSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 25, stiffness: 260 }}
      className="w-full max-w-7xl"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-12 gap-4">
        <motion.h1 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="text-4xl md:text-5xl font-black text-gray-900 flex items-center gap-4"
        >
          <BookHeart className="text-[#f5b800] w-8 h-8 md:w-10 md:h-10" />
          My Library
        </motion.h1>
        <motion.button 
          whileHover={{ scale: 1.1 }}
          onClick={() => setActiveSection('new')}
          className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center shadow-lg"
        >
          <PenTool size={20} />
        </motion.button>
      </div>

      <LayoutGroup>
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-6 md:auto-rows-fr md:grid-cols-2 md:gap-8 xl:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {myPosts.length > 0 ? (
              myPosts.map((post) => (
                <motion.div
                  key={post.id}
                  className="h-full"
                  variants={itemVariants}
                  layout
                >
                  <PostCard
                    post={post}
                    isLiked={likedPosts.has(post.id)}
                    onLike={handleLike}
                    onClick={() => handlePostClick(post)}
                    showDelete
                    onDelete={() => handleDeletePost(post.id)}
                  />
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20 opacity-50 col-span-full"
              >
                <p className="text-2xl font-bold">No stories yet.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>
    </motion.div>
  );
}

export default { HomeSection, MyBlogsSection };