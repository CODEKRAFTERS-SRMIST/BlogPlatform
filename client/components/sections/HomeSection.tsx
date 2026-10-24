'use client';

import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';
import { Home, PenTool } from 'lucide-react';
import { Post, Section } from '@/types/blog';
import PostCard from '../PostCard';

interface HomeSectionProps {
  posts: Post[];
  likedPosts: Set<string>;
  handleLike: (id: string) => void;
  handlePostClick: (post: Post) => void;
  setActiveSection: (section: Section) => void;
}

export default function HomeSection({ 
  posts, 
  likedPosts, 
  handleLike, 
  handlePostClick,
  setActiveSection 
}: HomeSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="w-full max-w-7xl"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-12 gap-4">
        <motion.h1
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl font-black text-gray-900 flex items-center gap-4"
        >
          <motion.div 
            whileHover={{ rotate: 360, scale: 1.15 }} 
            transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
          >
            <Home className="text-[#f5b800] w-8 h-8 md:w-10 md:h-10" />
          </motion.div>
          All Blogs
        </motion.h1>
        <motion.button
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.08, rotate: 3 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveSection('new')}
          className="px-5 py-3 rounded-2xl bg-black text-white font-black shadow-lg inline-flex items-center gap-3"
        >
          <PenTool size={18} /> Write
        </motion.button>
      </div>

      <LayoutGroup>
        <motion.div 
          className="grid auto-rows-fr grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8"
          layout
        >
          <AnimatePresence mode="popLayout">
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                className="h-full"
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -30 }}
                transition={{ 
                  duration: 0.4,
                  delay: index * 0.08,
                  ease: [0.4, 0, 0.2, 1]
                }}
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
    </motion.div>
  );
}