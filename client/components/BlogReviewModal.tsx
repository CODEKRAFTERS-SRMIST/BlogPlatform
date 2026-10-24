"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  CheckCircle,
  XCircle,
  Loader2,
  Send,
  Clock,
  Mail,
  GraduationCap,
  Briefcase,
  IdCard,
  ShieldCheck,
  ImageOff,
  Maximize2,
} from "lucide-react";
import { Post } from "@/lib/api";

/**
 * The full story, opened from a card in the review queue, with the decision
 * attached to the bottom of it.
 *
 * Reviewing used to happen in a split pane: a strip of chips above a reading
 * area. On a phone that meant the story, the queue and the buttons competed
 * for the same short screen and none of them had room. Reading is now a
 * separate step - tap a card, read the whole thing, decide, and come back to
 * the stack - which is the same shape as opening a post in the public feed.
 */

interface BlogReviewModalProps {
  blog: Post;
  onClose: () => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  busy?: boolean;
}

/** True only for a genuine http(s) address, so nothing else gets hyperlinked. */
function isWebLink(value?: string | null): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Longest a profile value can get before it is allowed to wrap mid-word. */
function AuthorField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 shrink-0 text-gray-400">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[9px] font-black uppercase tracking-widest text-gray-400">
          {label}
        </span>
        <span className="wrap-anywhere block text-[12px] font-bold text-gray-700">
          {value}
        </span>
      </span>
    </div>
  );
}

export default function BlogReviewModal({
  blog,
  onClose,
  onApprove,
  onReject,
  busy = false,
}: BlogReviewModalProps) {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Escape closes, and the page behind must not scroll while this is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose, busy]);

  // A different story opened in the same modal starts at the top, not wherever
  // the previous one was scrolled to.
  useEffect(() => {
    setRejectMode(false);
    setRejectReason("");
    setImageFailed(false);
    setShowFullImage(false);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [blog.id]);

  const author = blog.author || ({} as Post["author"]);
  const cover = blog.image || blog.coverImage;
  const initial = author.name?.charAt(0)?.toUpperCase() || "U";
  const submitted = blog.created_at
    ? new Date(blog.created_at).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    /* The root is a motion element on purpose: AnimatePresence only runs the
       exit animation when the child it is given is one. */
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-stretch justify-center sm:items-center sm:p-4 md:p-6"
    >
      <div
        onClick={() => !busy && onClose()}
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ type: "spring", damping: 26, stiffness: 240 }}
        className="relative flex h-full w-full min-w-0 flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-3xl sm:rounded-[1.75rem] lg:max-w-4xl"
      >
        {/* Header. Stays put so the close button is always reachable on a long
            story, and the title is repeated small so you know what you are in. */}
        <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 px-3 py-3 sm:px-5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Clock size={13} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
              Awaiting review
            </p>
            <p className="truncate text-[11px] font-black text-gray-700 sm:text-xs">
              {blog.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
          >
            <X size={17} />
          </button>
        </div>

        {/* The story */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {cover && !imageFailed && (
            /* The whole picture, not a banner crop of it. A reviewer is
               deciding whether to publish this image, so cropping it to a
               fixed strip hid part of what they were judging. object-contain
               with a height cap shows an ordinary landscape cover complete
               and edge to edge; only an unusually tall one gets letterboxed,
               and "Full image" is there for that. */
            <div className="relative flex items-center justify-center bg-gray-100">
              <img
                src={cover}
                alt=""
                onError={() => setImageFailed(true)}
                className="h-auto max-h-[50vh] w-auto max-w-full object-contain sm:max-h-[55vh]"
              />
              <button
                type="button"
                onClick={() => setShowFullImage(true)}
                className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur transition-colors hover:bg-black/75"
                title="View the full image"
              >
                <Maximize2 size={13} />
                Full image
              </button>
            </div>
          )}
          {cover && imageFailed && (
            <div className="flex h-24 w-full items-center justify-center gap-2 bg-gray-50 text-gray-300 sm:h-32">
              <ImageOff size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Cover image did not load
              </span>
            </div>
          )}

          <div className="px-3 py-5 sm:px-6 sm:py-7 lg:px-10">
            {!!blog.tags?.length && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {blog.tags.map((t, i) => (
                  <span
                    key={i}
                    className="wrap-anywhere rounded-md bg-gray-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-gray-500"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            <h1 className="wrap-anywhere text-xl font-black leading-tight tracking-tight text-gray-900 sm:text-3xl lg:text-4xl">
              {blog.title}
            </h1>

            {blog.subtitle && (
              <p className="wrap-anywhere mt-2 text-sm font-semibold leading-snug text-gray-500 sm:mt-3 sm:text-lg">
                {blog.subtitle}
              </p>
            )}

            {/* Who wrote it. Everything the roster knows, so the reviewer does
                not have to go and look the person up separately. */}
            <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50/70 p-3 sm:mt-6 sm:p-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f5b800] to-amber-500 text-sm font-black text-white sm:h-11 sm:w-11 sm:text-base">
                  {initial}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span className="wrap-anywhere text-sm font-black text-gray-900 sm:text-base">
                      {author.name || "Unknown author"}
                    </span>
                    {(author.role === "admin" || author.is_super_admin) && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-indigo-600">
                        <ShieldCheck size={9} />
                        {author.is_super_admin ? "Super" : "Admin"}
                      </span>
                    )}
                  </div>
                  {submitted && (
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      Submitted {submitted}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2.5 border-t border-gray-200 pt-3 min-[380px]:grid-cols-2">
                <AuthorField icon={<Mail size={12} />} label="Email" value={author.email} />
                <AuthorField icon={<IdCard size={12} />} label="Reg No" value={author.reg_no} />
                <AuthorField
                  icon={<GraduationCap size={12} />}
                  label="Year"
                  value={author.year ? `Year ${author.year}` : null}
                />
                <AuthorField
                  icon={<Briefcase size={12} />}
                  label="Department"
                  value={author.domain}
                />
              </div>
            </div>

            {/* A submission can run to 20,000 characters. Letting the browser
                skip the part that is scrolled out of view keeps reading and
                scrolling responsive. */}
            <div
              style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 1200px' }}
              className="mt-5 whitespace-pre-wrap wrap-anywhere text-[14px] font-medium leading-relaxed text-gray-800 sm:mt-7 sm:text-base lg:text-[17px]"
            >
              {blog.content}
            </div>

            {isWebLink(blog.links) && (
              <a
                href={blog.links}
                target="_blank"
                rel="noopener noreferrer"
                className="wrap-anywhere mt-5 block text-xs font-bold text-amber-600 underline hover:no-underline"
              >
                {blog.links}
              </a>
            )}
          </div>
        </div>

        {/* The decision. Part of the panel rather than floating over the page,
            so it cannot end up underneath the phone's bottom nav. */}
        <div
          className="shrink-0 border-t border-gray-100 bg-white px-3 py-3 sm:px-5 sm:py-4"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          {!rejectMode ? (
            <div className="flex flex-col gap-2 min-[380px]:flex-row min-[380px]:justify-end">
              <button
                type="button"
                onClick={() => setRejectMode(true)}
                disabled={busy}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-rose-50 px-4 py-3 text-[13px] font-black text-rose-600 transition-colors hover:bg-rose-100 disabled:opacity-50 min-[380px]:w-auto"
              >
                <XCircle size={15} className="shrink-0" />
                Send back
              </button>
              <button
                type="button"
                onClick={() => onApprove(blog.id)}
                disabled={busy}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-3 text-[13px] font-black text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 min-[380px]:w-auto"
              >
                {busy ? (
                  <Loader2 className="shrink-0 animate-spin" size={15} />
                ) : (
                  <CheckCircle size={15} className="shrink-0" />
                )}
                <span className="truncate">Approve &amp; publish</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">
                Why is it going back? The writer will see this.
              </label>
              <textarea
                autoFocus
                rows={2}
                placeholder="e.g. Please add sources for the figures in section 2"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[13px] font-semibold focus:border-rose-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectMode(false);
                    setRejectReason("");
                  }}
                  disabled={busy}
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-3 text-[13px] font-black text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => onReject(blog.id, rejectReason)}
                  disabled={busy || !rejectReason.trim()}
                  className="flex flex-[2] items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-3 text-[13px] font-black text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="shrink-0 animate-spin" size={15} />
                  ) : (
                    <Send size={15} className="shrink-0" />
                  )}
                  Send back
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {showFullImage && cover && !imageFailed && (
        <div
          onClick={() => setShowFullImage(false)}
          className="fixed inset-0 z-[260] flex items-center justify-center bg-black/90 p-3 sm:p-8"
        >
          <button
            type="button"
            onClick={() => setShowFullImage(false)}
            aria-label="Close image"
            className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/30"
          >
            <X size={20} />
          </button>
          {/* object-contain: the whole picture, never cropped */}
          <img
            src={cover}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}
    </motion.div>
  );
}
