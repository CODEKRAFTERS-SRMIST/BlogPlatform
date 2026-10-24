import { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, MessageCircle, Send, Loader2, Share2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Post } from '@/types/blog';
import { interactionApi, Comment, handleApiError } from '@/lib/api';
import { useAuth } from '@/lib/useAuth';
import ShareModal from '@/components/ShareModal';
import BlogArticle from '@/components/BlogArticle';


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
  /**
   * Which of the public actions belong here.
   *
   * My Library opens the same story the public feed does, but liking,
   * sharing and discussing a draft nobody can read makes no sense - and a
   * share link to an unpublished story leads to a 404. All three are on by
   * default, because the feed is the common case.
   */
  showLike?: boolean;
  showShare?: boolean;
  showComments?: boolean;
}

export default function BlogDetailModal({
  selectedPost,
  setSelectedPost,
  onLike,
  isLiked,
  showLike = true,
  showShare = true,
  showComments = true,
}: BlogDetailModalProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [loadingComments, setLoadingComments] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

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
    // Not fetched at all where the discussion is not shown: My Library opens
    // this same panel for a draft, and there is nothing to discuss on a story
    // nobody can read yet.
    if (selectedPost && morphDone && showComments) {
      fetchComments();
    }
  }, [selectedPost?.id, morphDone, showComments]);

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
          <BlogArticle
            post={selectedPost}
            morph
            notice={
              selectedPost.status === 'rejected' && selectedPost.rejectionReason ? (
                /* Above the title, because it is the first thing the author
                   needs. A rejected story is only ever opened by its own
                   author, so nobody else sees this. There is no way back from
                   here: a rejected story cannot be edited or resubmitted, so
                   the note says to start a new one. */
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 sm:mb-7 sm:p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">
                    Why this was rejected
                  </p>
                  <p className="wrap-anywhere mt-2 text-sm font-semibold leading-relaxed text-red-800 sm:text-base">
                    {selectedPost.rejectionReason}
                  </p>
                  <p className="mt-3 text-[11px] font-medium leading-relaxed text-red-400">
                    This story is closed. Write a new one to submit again.
                  </p>
                </div>
              ) : null
            }
            actions={
              showShare || showLike ? (
                <>
                  {showShare && isPublished && (
                    <button
                      type="button"
                      onClick={() => setShowShareModal(true)}
                      className="flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2.5 text-[13px] font-black text-white transition-all hover:bg-black active:scale-95 sm:px-5 sm:py-3 sm:text-sm"
                      title="Share Story"
                    >
                      <Share2 size={18} />
                      <span>Share</span>
                    </button>
                  )}

                  {showLike && (
                    <button
                      onClick={() => onLike(selectedPost.id)}
                      className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-[13px] font-black transition-all sm:px-6 sm:py-3 sm:text-sm ${
                        isLiked
                          ? 'border border-rose-100 bg-rose-50 text-rose-500'
                          : 'border border-transparent bg-gray-50 text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      <Heart size={18} className={isLiked ? 'fill-rose-500' : ''} />
                      {selectedPost.likes}
                    </button>
                  )}
                </>
              ) : null
            }
          >
            {showComments && (
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
            )}
          </BlogArticle>
        </div>
      </motion.div>

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
