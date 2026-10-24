"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ShieldCheck,
  Clock,
  CheckCircle,
  Loader2,
  ImageIcon,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { adminApi, handleApiError, Post } from "@/lib/api";
import { ChevronLeft } from "lucide-react";
import { truncateChars } from "@/lib/blogLimits";
import BlogReviewModal from "@/components/BlogReviewModal";
import { toast } from "react-hot-toast";

/**
 * The queue of stories waiting on an admin, as a stack of cards.
 *
 * Tapping a card opens the whole story with the approve and reject buttons
 * under it, the same way a reader opens a post in the public feed. The older
 * split pane tried to show the queue, the story and the decision at once,
 * which does not fit a phone: the story got a few lines and the buttons sat
 * under the bottom nav.
 */

interface AdminPipelineSectionProps {
  onApproveSuccess?: () => void;
  onAction?: (id: string) => void;
  blogs?: Post[];
  setBlogs?: React.Dispatch<React.SetStateAction<Post[]>>;
  /** Bumped by the page's Refresh button to pull the queue again. */
  refreshSignal?: number;
}

function ReviewCard({
  blog,
  onOpen,
}: {
  blog: Post;
  onOpen: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const cover = blog.image || blog.coverImage;
  const author = blog.author || ({} as Post["author"]);
  const summary =
    blog.subtitle?.trim() || blog.content?.trim() || "";

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      whileTap={{ scale: 0.985 }}
      className="group flex h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white text-left transition-colors hover:border-amber-300 hover:shadow-lg sm:rounded-[1.5rem]"
    >
      <div className="relative h-32 w-full shrink-0 overflow-hidden bg-gray-100 sm:h-40">
        {cover && !imageFailed ? (
          <img
            src={cover}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <ImageIcon size={26} />
          </div>
        )}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-lg bg-white/95 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-amber-700 shadow-sm backdrop-blur-sm">
          <Clock size={9} className="shrink-0" />
          Pending
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
        <h3 className="wrap-anywhere line-clamp-2 text-[13px] font-black leading-snug text-gray-900 sm:text-[15px]">
          {blog.title}
        </h3>

        {summary && (
          <p className="wrap-anywhere mt-1.5 text-[11px] font-medium leading-relaxed text-gray-500 sm:text-xs">
            {truncateChars(summary, 100)}
          </p>
        )}

        <div className="mt-3 flex min-w-0 items-center gap-2 border-t border-gray-100 pt-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#f5b800] to-amber-500 text-[11px] font-black text-white">
            {author.name?.charAt(0)?.toUpperCase() || "U"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[11px] font-black text-gray-800">
              {author.name || "Unknown author"}
            </span>
            <span className="block truncate text-[9px] font-bold uppercase tracking-widest text-gray-400">
              {blog.created_at
                ? new Date(blog.created_at).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                  })
                : "—"}
              {author.domain ? ` · ${author.domain}` : ""}
            </span>
          </span>
          <ChevronRight
            size={15}
            className="shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-500"
          />
        </div>
      </div>
    </motion.button>
  );
}

export default function AdminPipelineSection({
  onApproveSuccess,
  onAction,
  blogs,
  setBlogs,
  refreshSignal = 0,
}: AdminPipelineSectionProps) {
  const [internalPending, setInternalPending] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openBlog, setOpenBlog] = useState<Post | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const displayBlogs = blogs || internalPending;

  /**
   * The queue is paged in the browser, not on the server.
   *
   * The admin endpoint hands back the whole pending list in one request, so
   * splitting it here costs no extra round trip and switching page is
   * instant. If the queue ever grows past a few hundred this should move
   * server-side, the way the public feed already works.
   */
  const PAGE_SIZE = 9;
  const totalPages = Math.max(Math.ceil(displayBlogs.length / PAGE_SIZE), 1);
  const safePage = Math.min(page, totalPages);
  const pageBlogs = displayBlogs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Clearing the last card on a page should not leave you staring at nothing.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const fetchPending = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getBlogs("pending_review");
      setInternalPending(data);
      setPage(1);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!blogs) fetchPending();
  }, [blogs]);

  // The page's Refresh button bumps this; the first render is skipped because
  // the effect above has already fetched.
  useEffect(() => {
    if (refreshSignal > 0) fetchPending();
  }, [refreshSignal]);

  /** Drops a story from whichever list is driving the view. */
  const removeFromQueue = (id: string) => {
    const without = (prev: Post[]) => prev.filter((b) => b.id !== id);
    if (setBlogs) setBlogs(without);
    setInternalPending(without);
    setOpenBlog((current) => (current?.id === id ? null : current));
  };

  const handleApprove = async (id: string) => {
    if (actionLoading) return; // guard against double taps
    setActionLoading(id);
    try {
      await adminApi.approveBlog(id);
      removeFromQueue(id);
      toast.success("Story approved and published!");
      onAction?.(id);
      onApproveSuccess?.();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    if (actionLoading) return;
    if (!reason.trim()) {
      toast.error("Please say why it is going back");
      return;
    }

    setActionLoading(id);
    try {
      await adminApi.rejectBlog(id, reason);
      removeFromQueue(id);
      toast.success("Sent back to the writer.");
      onAction?.(id);
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && displayBlogs.length === 0) {
    return (
      <div className="flex w-full flex-col items-center justify-center py-16 sm:py-20">
        <Loader2 className="mb-4 h-9 w-9 animate-spin text-[#f5b800]" />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Loading submissions...
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 max-w-7xl flex-col">
      {/* The count sits on its own line so the title never has to share a
          cramped row with it on a phone. */}
      <div className="mb-5 flex min-w-0 items-start justify-between gap-3 sm:mb-8">
        <div className="min-w-0">
          <h1 className="flex min-w-0 items-center gap-2 text-lg font-black tracking-tight text-gray-900 min-[380px]:text-xl sm:text-3xl lg:text-4xl">
            <ShieldCheck className="h-5 w-5 shrink-0 text-amber-600 sm:h-8 sm:w-8" />
            <span className="truncate">Review Pipeline</span>
          </h1>
          <p className="mt-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
            {displayBlogs.length === 0
              ? "Nothing waiting"
              : `${displayBlogs.length} ${displayBlogs.length === 1 ? "story" : "stories"} waiting${
                  totalPages > 1 ? ` · page ${safePage} of ${totalPages}` : ""
                } · tap to read`}
          </p>
        </div>
        <button
          type="button"
          onClick={fetchPending}
          disabled={loading}
          aria-label="Refresh queue"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:border-amber-300 hover:text-amber-600 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-[13px] font-bold text-rose-700 sm:px-4">
          <span className="wrap-anywhere">{error}</span>{" "}
          <button onClick={fetchPending} className="underline hover:no-underline">
            Try again
          </button>
        </div>
      )}

      {displayBlogs.length === 0 ? (
        <div className="rounded-[1.5rem] border-4 border-dashed border-gray-100 bg-white/70 px-4 py-12 text-center sm:rounded-[2.5rem] sm:py-20">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-200 sm:h-20 sm:w-20" />
          <h2 className="text-base font-black uppercase tracking-tight text-gray-400 sm:text-2xl">
            Nothing to review
          </h2>
          <p className="mt-2 text-[13px] font-bold text-gray-400">
            Every submission has been dealt with.
          </p>
        </div>
      ) : (
        /* One column on the narrowest phones, two once there is room, three on
           a wide screen. No fixed widths anywhere, so 300px still works. */
        <div className="grid grid-cols-1 gap-3 min-[560px]:auto-rows-fr min-[560px]:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {pageBlogs.map((blog) => (
              <ReviewCard
                key={blog.id}
                blog={blog}
                onOpen={() => setOpenBlog(blog)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-5 flex min-w-0 flex-wrap items-center justify-center gap-1.5 sm:mt-7 sm:gap-2">
          <button
            type="button"
            onClick={() => setPage((n) => Math.max(n - 1, 1))}
            disabled={safePage === 1}
            aria-label="Previous page"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:border-amber-300 hover:text-amber-600 disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-500"
          >
            <ChevronLeft size={15} />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              aria-current={n === safePage ? "page" : undefined}
              className={`h-9 min-w-[2.25rem] shrink-0 rounded-xl px-2 text-[12px] font-black transition-colors ${
                n === safePage
                  ? "bg-gray-900 text-white"
                  : "border border-gray-200 bg-white text-gray-500 hover:border-amber-300 hover:text-amber-600"
              }`}
            >
              {n}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setPage((n) => Math.min(n + 1, totalPages))}
            disabled={safePage === totalPages}
            aria-label="Next page"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:border-amber-300 hover:text-amber-600 disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-500"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      <AnimatePresence>
        {openBlog && (
          <BlogReviewModal
            key={openBlog.id}
            blog={openBlog}
            busy={actionLoading === openBlog.id}
            onClose={() => setOpenBlog(null)}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
