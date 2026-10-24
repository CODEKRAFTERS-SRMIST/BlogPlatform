'use client';

import { useState, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Heart, Trash2, Share2, ImageIcon } from 'lucide-react';
import { Post } from '@/types/blog';
import ShareModal from '@/components/ShareModal';

interface PostCardProps {
  post: Post;
  onClick: () => void;
  onDelete?: () => void;
  onLike: (id: string) => void;
  isLiked: boolean;
  showDelete?: boolean;
}

const PostCard = forwardRef<HTMLDivElement, PostCardProps>(
  ({ post, onClick, onDelete, onLike, isLiked, showDelete = false }, ref) => {
    const [showShareModal, setShowShareModal] = useState(false);
    const [coverFailed, setCoverFailed] = useState(false);
    const cover = post.image || post.coverImage;
    const hasCover = Boolean(cover) && !coverFailed;
    return (
      <motion.div
        ref={ref}
        key={post.id}
        layoutId={`card-container-${post.id}`}
        // Only transform is animated here. Colour and shadow used to be
        // animated too, and those repaint the card on every frame of the
        // hover - multiplied by a gridful of cards, that was most of the
        // jank. They are plain CSS transitions below, which look the same
        // and cost the compositor nothing.
        whileHover={{ scale: 1.02, y: -8 }}
        onClick={onClick}
        className="h-full bg-white/85 hover:bg-white hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] transition-[background-color,box-shadow] duration-300 p-3 sm:p-4 md:p-6 rounded-3xl sm:rounded-[2rem] border border-white/60 shadow-sm cursor-pointer group relative overflow-hidden flex flex-col gap-3 sm:gap-4"
        transition={{ 
          duration: 0.3,
          ease: [0.4, 0, 0.2, 1]
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-[#f5b800]/15 via-amber-100/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        
        {/* Image Section */}
        <motion.div 
          layoutId={`card-image-${post.id}`}
          className="w-full aspect-[16/9] rounded-2xl sm:rounded-[1.5rem] overflow-hidden shadow-md relative z-10 bg-gray-100"
        >
          {/* A story with no cover gets the empty frame, not the same
               Unsplash photograph as every other story without one. */}
          {hasCover ? (
            <motion.img
              src={cover}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              alt={post.title}
              loading="lazy"
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-300">
              <ImageIcon size={28} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </motion.div>
        
        {/* Content Section */}
        <div className="flex-1 flex flex-col items-start gap-3 relative z-10">
          {/* Status Badge */}
          {post.status && post.status !== 'published' && (
            <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${
              post.status === 'pending_review' ? 'bg-amber-50 text-amber-600 border-amber-100' :
              post.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' :
              'bg-gray-50 text-gray-600 border-gray-100'
            }`}>
              {post.status.replace('_', ' ')}
            </div>
          )}

          {/* The reason belongs on the card, not one click away: the author
              scanning their library wants to know what to fix without opening
              every rejected story. Clamped to two lines here; the full text is
              in the detail view. Only the author is ever served this field. */}
          {post.status === 'rejected' && post.rejectionReason && (
            <div className="w-full rounded-xl border border-red-100 bg-red-50/70 px-2.5 py-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-red-400">
                Why it was rejected
              </p>
              <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-snug text-red-700 wrap-anywhere">
                {post.rejectionReason}
              </p>
            </div>
          )}
          
          <motion.h3 
            layoutId={`card-title-${post.id}`}
            className="text-lg sm:text-xl md:text-2xl font-black text-gray-900 leading-tight group-hover:text-[#f5b800] transition-colors duration-300 line-clamp-2 wrap-anywhere"
          >
            {post.title}
          </motion.h3>
          
          {/* Rendered only when there is one. It used to reserve two lines
              whether or not the story had a subtitle, which left a blank gap
              under every bare title - very obvious on a phone, where each
              card stands alone. The divider below carries `mt-auto`, so the
              footer still sits at the bottom without this propping it up. */}
          {post.subtitle && (
            <p className="text-[13px] sm:text-sm text-gray-500 font-medium line-clamp-2 leading-relaxed wrap-anywhere">
              {post.subtitle}
            </p>
          )}
          
          <div className="w-full h-px bg-gray-100 mt-auto mb-2 group-hover:bg-gray-200 transition-colors" />
          
          <div className="flex items-center justify-between gap-2 w-full text-xs md:text-sm font-bold text-gray-400">
            <div className="flex items-center gap-2 text-gray-600">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#f5b800] to-amber-500 flex items-center justify-center text-white text-[10px]">
                {post.author.charAt(0)}
              </div>
              <span className="truncate max-w-[72px] sm:max-w-[100px]">{post.author}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <button 
                onClick={(e) => { e.stopPropagation(); onLike(post.id); }}
                className="flex items-center gap-1 hover:text-rose-500 transition-colors group/like"
              >
                <Heart 
                  size={14} 
                  className={`transition-all duration-300 ${isLiked ? 'fill-rose-500 text-rose-500 scale-110' : 'group-hover/like:text-rose-500'}`}
                /> 
                <span className="tabular-nums">{post.likes}</span>
              </button>

              {/* Only a published story has a public page to share. Drafts,
                  anything still in review and rejected stories appear in the
                  author's own library, where a share link would hand someone
                  a URL that shows them nothing. */}
              {post.status === 'published' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowShareModal(true);
                  }}
                  className="p-2 rounded-full hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                  title="Share Story"
                >
                  <Share2 size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ShareModal portals into document.body, but React events still bubble
            through this tree, so the wrapper keeps clicks out of the card. */}
        {showShareModal && (
          <div onClick={(e) => e.stopPropagation()}>
            <ShareModal
              isOpen={showShareModal}
              onClose={() => setShowShareModal(false)}
              post={post}
            />
          </div>
        )}

        {showDelete && onDelete && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.1, backgroundColor: '#fee2e2', color: '#ef4444' }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/90 backdrop-blur border border-red-200 text-red-500 flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
            title="Delete Blog"
          >
            <Trash2 size={16} />
          </motion.button>
        )}
      </motion.div>
    );
  }
);

PostCard.displayName = 'PostCard';

export default PostCard;