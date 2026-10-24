import { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, MessageCircle, Send, Trash2, Loader2, Share2, Maximize2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Post } from '@/types/blog';
import { interactionApi, Comment, handleApiError } from '@/lib/api';
import { useAuth } from '@/lib/useAuth';
import ShareModal from '@/components/ShareModal';


interface CommentItemProps {
  comment: Comment;
  isReply?: boolean;
  parentId?: string;
  currentUser: { id?: string; role?: string } | null;
  onReply: (comment: Comment) => void;
  onDelete: (id: string, parentId?: string) => void;
}

/**
 * Defined at module scope on purpose.
 *
 * When this lived inside BlogDetailModal it was a different function on every
 * render, so typing a single character made React throw away and rebuild every
 * comment - replaying their entrance animations, which looked like the whole
 * page blinking.
 */
const CommentItem = memo(function CommentItem({
  comment,
  isReply = false,
  parentId,
  currentUser,
  onReply,
  onDelete,
}: CommentItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: isReply ? 12 : 0 }}
      animate={{ opacity: 1, x: 0 }}
      layout
      className={`p-4 sm:p-5 md:p-6 bg-white border border-gray-100 rounded-3xl sm:rounded-[2rem] hover:shadow-lg transition-all group/comment ${isReply ? 'ml-3 sm:ml-4 md:ml-8 border-l-4 border-l-[#f5b800]/30' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 sm:gap-4 min-w-0">
        <div className="flex gap-3 sm:gap-4 min-w-0">
          <div className={`w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 font-black shrink-0 ${isReply ? 'w-8 h-8 text-xs' : ''}`}>
            {comment.user.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-gray-900 text-sm md:text-base wrap-anywhere">{comment.user.name}</span>
              {isReply && <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-md font-black uppercase">Reply</span>}
            </div>
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">
              {new Date(comment.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </div>
            <p className="text-gray-600 leading-relaxed font-medium text-sm md:text-base wrap-anywhere">
              {comment.content}
            </p>

            <div className="flex items-center gap-4 mt-4">
              {!isReply && (
                <button
                  onClick={() => onReply(comment)}
                  className="text-[10px] font-black uppercase text-[#f5b800] hover:text-black transition-colors"
                >
                  Reply
                </button>
              )}
              {(currentUser?.id === comment.user.id || currentUser?.role === 'admin') && (
                <button
                  onClick={() => onDelete(comment.id, parentId)}
                  className="text-gray-300 hover:text-rose-500 opacity-0 group-hover/comment:opacity-100 transition-all text-[10px] font-black uppercase"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

interface BlogDetailModalProps {
  selectedPost: Post;
  setSelectedPost: (post: Post | null) => void;
  onLike: (id: string) => void;
  isLiked: boolean;
}

export default function BlogDetailModal({ selectedPost, setSelectedPost, onLike, isLiked }: BlogDetailModalProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [loadingComments, setLoadingComments] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [heroFailed, setHeroFailed] = useState(false);

  /**
   * True once the card has finished growing into this panel.
   *
   * Everything expensive waits for it. The morph is a layout animation, so
   * any React render during it re-measures the whole subtree mid-flight.
   */
  const [morphDone, setMorphDone] = useState(false);

  /**
   * Stops the backdrop taking clicks the moment closing starts.
   *
   * While the exit animation plays the backdrop is still in the tree, and a
   * half-faded full-screen layer that still accepts clicks is indistinguishable
   * from a frozen page. Dropping pointer events immediately also means that if
   * the animation ever fails to finish - a tab backgrounded mid-close pauses
   * the frame loop that drives it - the leftover layer is inert rather than
   * blocking the whole page.
   */
  const [closing, setClosing] = useState(false);
  const closeModal = () => {
    setClosing(true);
    setSelectedPost(null);
  };

  useEffect(() => {
    // The discussion arrives after the morph. Fetching it immediately meant
    // the response landed mid-animation, and rendering a thread of avatars
    // and nested replies at that moment is the one render guaranteed to be
    // competing with the card as it grows.
    if (selectedPost && morphDone) {
      fetchComments();
    }
  }, [selectedPost?.id, morphDone]);

  useEffect(() => {
    // Safety net: nothing must depend on an animation callback alone. If the
    // layout animation never reports back - reduced motion, a tab put in the
    // background mid-open, an interrupted morph - the discussion still loads.
    const timer = window.setTimeout(() => setMorphDone(true), 450);
    return () => window.clearTimeout(timer);
  }, []);

  // Keep the feed behind from scrolling while this modal is open
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;

    // Hiding the page scrollbar widens the viewport by its width, and every
    // card in the feed behind re-flows to the new width at that exact moment.
    // Each of those cards is a Framer `layout` element, so they do not just
    // re-flow - they each start their own layout animation, while this panel
    // is mid-morph. Holding the width steady keeps the feed completely still.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
    };
  }, []);

  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      const data = await interactionApi.getComments(selectedPost.id);
      setComments(data);
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    } finally {
      setLoadingComments(false);
    }
  };

  const heroImage = selectedPost.image || selectedPost.coverImage;

  // A draft, a story still in review and a rejected one have no public page,
  // so a share link to any of them leads nowhere. `published` is the only
  // status the public feed serves (blogs.service.js) and the only one an
  // admin approval produces.
  const isPublished = selectedPost.status === 'published';

  const handleReplyTo = useCallback((comment: Comment) => {
    setReplyingTo(comment);
    document.querySelector('textarea')?.focus();
  }, []);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmittingComment(true);
      const comment = await interactionApi.addComment(selectedPost.id, newComment, replyingTo?.id);
      
      if (replyingTo) {
        // Find the parent and add it to its replies
        setComments(prev => prev.map(c => {
          if (c.id === replyingTo.id) {
            return {
              ...c,
              replies: [...(c.replies || []), comment]
            };
          }
          return c;
        }));
      } else {
        setComments(prev => [comment, ...prev]);
      }
      
      setNewComment("");
      setReplyingTo(null);
      setError(null);
      toast.success(replyingTo ? 'Reply posted' : 'Comment posted');
    } catch (err) {
      // Shown as a toast as well, because the inline message sits below the
      // fold on a phone and is easy to miss.
      const message = handleApiError(err);
      setError(message);
      toast.error(message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (id: string, parentId?: string) => {
    try {
      await interactionApi.deleteComment(id);
      toast.success('Comment deleted');
      if (parentId) {
        setComments(prev => prev.map(c => {
          if (c.id === parentId) {
            return {
              ...c,
              replies: c.replies?.filter(r => r.id !== id)
            };
          }
          return c;
        }));
      } else {
        setComments(prev => prev.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete comment:", err);
      toast.error(handleApiError(err));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={closeModal}
      className={`fixed inset-0 bg-black/85 z-[200] flex items-center justify-center p-2 sm:p-4 md:p-8 ${
        closing ? 'pointer-events-none' : ''
      }`}
    >
      <motion.div
        layoutId={`card-container-${selectedPost.id}`}
        transition={{ type: 'spring', damping: 32, stiffness: 260 }}
        onLayoutAnimationComplete={() => setMorphDone(true)}
        style={{ willChange: 'transform', backfaceVisibility: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl sm:rounded-[2rem] md:rounded-[3rem] max-w-5xl w-full max-h-[96dvh] sm:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col relative"
      >
        {/* Close Button */}
        <button
          onClick={closeModal}
          className="absolute top-3 right-3 sm:top-5 sm:right-5 z-50 w-10 h-10 sm:w-12 sm:h-12 bg-black/60 hover:bg-black/80 ring-2 ring-white/70 backdrop-blur rounded-full flex items-center justify-center transition-all group"
        >
          <X size={20} className="text-white group-hover:scale-110 transition-transform sm:w-6 sm:h-6" />
        </button>

        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar">
          <div
            className={`relative ${
              heroImage && !heroFailed
                ? 'h-[200px] sm:h-[320px] md:h-[460px]'
                : 'h-16 sm:h-20 bg-gradient-to-br from-[#f5b800]/15 to-transparent'
            }`}
          >
            {heroImage && !heroFailed && (
              <motion.div
                layoutId={`card-image-${selectedPost.id}`}
                style={{ willChange: 'transform' }}
                className="w-full h-full"
              >
                <img
                  src={heroImage}
                  alt={selectedPost.title}
                  onError={() => setHeroFailed(true)}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </motion.div>
            )}

            {/* The hero is cropped to fit, so offer the whole picture */}
            {heroImage && !heroFailed && (
              <button
                type="button"
                onClick={() => setShowFullImage(true)}
                className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur transition-colors hover:bg-black/75"
                title="View the full image"
              >
                <Maximize2 size={13} />
                Full image
              </button>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
          </div>
          
          <div className={`px-5 sm:px-8 md:px-16 pb-10 sm:pb-12 relative z-10 ${heroImage && !heroFailed ? "-mt-12 sm:-mt-16 md:-mt-20" : "mt-2"}`}>
            <div className="flex flex-wrap gap-2 mb-5 sm:mb-8">
              {selectedPost.tags.map((tag, i) => (
                <span 
                  key={i}
                  className="px-3 sm:px-4 py-1 sm:py-1.5 bg-[#f5b800]/10 text-[#f5b800] border border-[#f5b800]/20 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest"
                >
                  {tag}
                </span>
              ))}
            </div>
            
            {/* Shown above the title because it is the first thing the
                author needs; a rejected story is only ever opened by its
                own author, so nobody else sees this. Editing a rejected
                story moves it back to drafts (blogs.service.js), which is
                why the note says to resubmit rather than appeal. */}
            {selectedPost.status === 'rejected' && selectedPost.rejectionReason && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 sm:mb-7 sm:p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">
                  Why this was rejected
                </p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-red-800 wrap-anywhere sm:text-base">
                  {selectedPost.rejectionReason}
                </p>
                <p className="mt-3 text-[11px] font-medium leading-relaxed text-red-400">
                  Editing this story puts it back in your drafts, ready to submit for review again.
                </p>
              </div>
            )}

            <motion.h1 
              layoutId={`card-title-${selectedPost.id}`}
              style={{ willChange: 'transform' }}
              className="text-2xl sm:text-4xl md:text-6xl font-black text-gray-900 mb-4 sm:mb-6 leading-[1.15] sm:leading-[1.1] wrap-anywhere"
            >
              {selectedPost.title}
            </motion.h1>
            
            <p className="text-base sm:text-xl md:text-2xl text-gray-500 font-medium mb-7 sm:mb-10 leading-relaxed max-w-3xl wrap-anywhere">
              {selectedPost.subtitle}
            </p>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 mb-8 sm:mb-12 pb-8 sm:pb-12 border-b border-gray-100">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-11 h-11 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-gradient-to-br from-[#f5b800] to-amber-500 flex items-center justify-center text-white text-base sm:text-xl font-black shadow-lg shadow-amber-200">
                  {selectedPost.author.charAt(0)}
                </div>
                <div>
                  <div className="font-black text-gray-900 text-base sm:text-lg truncate">{selectedPost.author}</div>
                  <div className="text-xs sm:text-sm text-gray-400 font-bold">{selectedPost.date}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4 shrink-0">
                {isPublished && (
                  <button
                    type="button"
                    onClick={() => setShowShareModal(true)}
                    className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl font-black bg-gray-900 text-white hover:bg-black transition-all text-[13px] sm:text-sm active:scale-95"
                    title="Share Story"
                  >
                    <Share2 size={18} />
                    <span>Share</span>
                  </button>
                )}

                <button 
                  onClick={() => onLike(selectedPost.id)}
                  className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl font-black transition-all text-[13px] sm:text-sm ${
                    isLiked 
                    ? 'bg-rose-50 text-rose-500 border border-rose-100' 
                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  <Heart size={18} className={isLiked ? 'fill-rose-500' : ''} />
                  {selectedPost.likes}
                </button>
              </div>
            </div>
            
            <div
              style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 1200px' }}
              className="prose prose-sm sm:prose-base md:prose-xl max-w-none mb-12 sm:mb-20 text-[15px] sm:text-base md:text-xl text-gray-800 font-medium leading-[1.75] sm:leading-[1.8] whitespace-pre-wrap wrap-anywhere"
            >
              {selectedPost.content}
            </div>

            {/* Discussion Section */}
            <div className="border-t border-gray-100 pt-16">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-2 sm:gap-3">
                  <MessageCircle size={32} className="text-[#f5b800]" />
                  Discussion
                  <span className="text-gray-300 ml-1">
                    {comments.reduce((acc, curr) => acc + 1 + (curr.replies?.length || 0), 0)}
                  </span>
                </h2>
              </div>

              {/* Comment Input */}
              <form onSubmit={handleAddComment} className="mb-12">
                <div className="relative group">
                  {replyingTo && (
                    <div className="absolute -top-10 left-0 flex items-center gap-2 px-4 py-1.5 bg-amber-50 border border-amber-100 rounded-t-xl text-[10px] font-black uppercase text-amber-600">
                      Replying to @{replyingTo.user.name}
                      <button type="button" onClick={() => setReplyingTo(null)} className="hover:text-black">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  {error && (
                    <div
                      role="alert"
                      className="mb-3 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
                    >
                      <span className="mt-0.5 shrink-0">!</span>
                      <span className="min-w-0 wrap-anywhere">{error}</span>
                    </div>
                  )}
                  <textarea
                    value={newComment}
                    onChange={(e) => {
                      setNewComment(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder={replyingTo ? `Add to the conversation with @${replyingTo.user.name}...` : "Add to the conversation..."}
                    className={`w-full bg-gray-50/50 border-2 border-gray-100 ${replyingTo ? 'rounded-b-3xl rounded-tr-3xl' : 'rounded-3xl'} p-4 sm:p-6 md:p-8 pb-20 sm:pb-24 text-[15px] sm:text-base md:text-lg focus:outline-none focus:border-[#f5b800] focus:bg-white transition-all resize-none min-h-[140px] sm:min-h-[170px] font-medium`}
                    required
                  />
                  <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6">
                    <button
                      type="submit"
                      disabled={submittingComment || !newComment.trim()}
                      className="bg-[#f5b800] hover:bg-black text-white px-5 sm:px-8 py-3 sm:py-4 text-sm sm:text-base rounded-2xl font-black shadow-xl shadow-amber-200 hover:shadow-gray-200 transition-all flex items-center gap-2 sm:gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      {submittingComment ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <>
                          {replyingTo ? 'Post Reply' : 'Share Thought'} 
                          <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {/* Comment List */}
              <div
                style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 800px' }}
                className="space-y-8 pb-10"
              >
                {loadingComments ? (
                  <div className="flex flex-col items-center py-20 gap-4">
                    <Loader2 className="animate-spin text-[#f5b800]" size={40} />
                    <p className="text-gray-400 font-bold">Fetching discussions...</p>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-20 bg-gray-50/50 rounded-[2rem] border-2 border-dashed border-gray-100">
                    <p className="text-xl font-bold text-gray-400">No thoughts shared yet. Be the first!</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {comments.map((comment) => (
                      <div key={comment.id} className="space-y-4">
                        <CommentItem
                          comment={comment}
                          currentUser={user}
                          onReply={handleReplyTo}
                          onDelete={handleDeleteComment}
                        />
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="space-y-4">
                            {comment.replies.map((reply) => (
                              <CommentItem
                                key={reply.id}
                                comment={reply}
                                isReply
                                parentId={comment.id}
                                currentUser={user}
                                onReply={handleReplyTo}
                                onDelete={handleDeleteComment}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {showFullImage && heroImage && !heroFailed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={(e) => {
            e.stopPropagation();
            setShowFullImage(false);
          }}
          className="fixed inset-0 z-[260] flex items-center justify-center bg-black/90 p-3 sm:p-8"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowFullImage(false);
            }}
            aria-label="Close image"
            className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/30"
          >
            <X size={20} />
          </button>
          {/* object-contain: the whole picture, never cropped */}
          <img
            src={heroImage}
            alt={selectedPost.title}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full object-contain"
          />
          <p className="pointer-events-none absolute bottom-4 left-0 right-0 text-center text-[11px] text-white/60">
            Tap anywhere to close
          </p>
        </motion.div>
      )}

      {showShareModal && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          post={selectedPost}
        />
      )}
    </motion.div>
  );
}
