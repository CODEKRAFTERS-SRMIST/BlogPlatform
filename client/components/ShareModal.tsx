"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { Link2, Check, X, Copy, Loader2 } from "lucide-react";
import {
  shareToWhatsApp,
  copyPostLink,
  copyCaption,
  buildCaption,
  getPostUrl,
  getExcerpt,
} from "@/lib/share";
import {
  generateStoryCard,
  storyFileName,
  downloadBlob,
  canShareFile,
} from "@/lib/storyCard";

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: {
    id: string;
    title: string;
    author: string;
    subtitle?: string;
    content?: string;
    coverImage?: string;
    image?: string;
  };
}

export default function ShareModal({ isOpen, onClose, post }: ShareModalProps) {
  const [copied, setCopied] = useState<"link" | "caption" | null>(null);
  const [busy, setBusy] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  // Close on Escape, and stop the page behind from scrolling
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  const flashCopied = useCallback((which: "link" | "caption") => {
    setCopied(which);
    setTimeout(() => setCopied((c) => (c === which ? null : c)), 2000);
  }, []);

  if (!isOpen || !mounted) return null;

  const postUrl = getPostUrl(post.id);
  const rawImage = post.image || post.coverImage;
  const isValidUrl =
    typeof rawImage === "string" &&
    rawImage.trim() !== "" &&
    rawImage.trim() !== "test" &&
    (rawImage.startsWith("http://") ||
      rawImage.startsWith("https://") ||
      rawImage.startsWith("/") ||
      rawImage.startsWith("data:image"));
  const hasValidImage = isValidUrl && !imgError;
  const previewExcerpt = getExcerpt(post, 120);

  /**
   * Instagram cannot be pre-filled from a web page, so the only way in is to
   * hand it a finished image. On a phone that means the OS share sheet, where
   * picking Instagram opens Stories with the card already loaded. Desktop
   * browsers cannot do that, so we save the image and copy the caption instead.
   */
  const handleInstagram = async () => {
    setBusy(true);
    try {
      const card = await generateStoryCard(post, hasValidImage ? rawImage : undefined);
      if (!card) {
        toast.error("Could not build the Instagram image");
        return;
      }

      const file = new File([card.blob], storyFileName(post.title), { type: "image/png" });

      if (canShareFile(file)) {
        try {
          await navigator.share({ files: [file], text: buildCaption(post) });
          onClose();
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          // fall through to the download route below
        }
      }

      downloadBlob(card.blob, storyFileName(post.title));
      const captionCopied = await copyCaption(post);
      window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
      toast.success(
        captionCopied
          ? "Image saved and caption copied - upload it on Instagram"
          : "Image saved - upload it on Instagram",
      );
    } catch (err) {
      console.error("Instagram share failed:", err);
      toast.error("Could not prepare the Instagram image");
    } finally {
      setBusy(false);
    }
  };

  const handleCopyLink = async () => {
    if (await copyPostLink(post.id)) {
      flashCopied("link");
      toast.success("Link copied");
    } else {
      toast.error("Could not copy the link");
    }
  };

  const handleCopyCaption = async () => {
    if (await copyCaption(post)) {
      flashCopied("caption");
      toast.success("Caption and hashtags copied");
    } else {
      toast.error("Could not copy the caption");
    }
  };

  // Rendered into document.body: the dialog is `position: fixed`, and inside a
  // PostCard it would otherwise be positioned against (and clipped by) that
  // card's transform and overflow-hidden.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Share ${post.title}`}
      className="fixed inset-0 z-[250] flex items-end justify-center sm:items-center sm:p-4"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="relative z-10 w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl ring-1 ring-gray-900/5 max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto overscroll-contain"
      >
        {/* Grab handle, mobile only */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="h-1.5 w-10 rounded-full bg-gray-200" />
        </div>

        <div className="flex items-start justify-between gap-4 px-5 pt-4 sm:px-7 sm:pt-6">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-gray-900">
              Share this story
            </h2>
            <p className="mt-0.5 text-[13px] text-gray-500 line-clamp-1">{post.title}</p>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 grid place-items-center h-9 w-9 rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-6 pt-5 sm:px-7 sm:pb-7 flex gap-5 sm:gap-6">
          {/* What the Instagram image will look like */}
          <div className="shrink-0">
            <div className="w-[92px] sm:w-[116px] aspect-[9/16] rounded-xl overflow-hidden relative bg-[#0b0c10] ring-1 ring-gray-900/10">
              <div className="absolute inset-0">
                {hasValidImage ? (
                  <img
                    src={rawImage}
                    alt=""
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-black" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10] via-[#0b0c10]/85 to-transparent" />
              </div>
              <div className="relative h-full flex flex-col justify-between p-2">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-[2px] bg-[#f5b800]" />
                  <span className="text-[5px] font-bold tracking-[0.1em] text-white">
                    CODEKRAFTERS
                  </span>
                </div>
                <div>
                  <span className="block h-[2px] w-4 bg-[#f5b800] mb-1" />
                  <h3 className="text-[8px] font-bold leading-tight text-white line-clamp-3 break-words">
                    {post.title}
                  </h3>
                  {previewExcerpt && (
                    <p className="mt-1 text-[6px] leading-tight text-white/55 line-clamp-2 break-words">
                      {previewExcerpt}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-gray-400">Story image</p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2.5 min-w-0 flex-1">
            <button
              onClick={handleInstagram}
              disabled={busy}
              className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-white transition-opacity hover:opacity-95 active:scale-[0.99] disabled:opacity-60"
              style={{
                background:
                  "linear-gradient(90deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
              }}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20">
                {busy ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <svg className="h-[18px] w-[18px] fill-white" viewBox="0 0 24 24">
                    <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.72-2.13 1.38C1.35 2.68.93 3.35.63 4.14.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.72 1.46 1.38 2.13.67.66 1.34 1.08 2.13 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.3 1.46-.72 2.13-1.38.66-.67 1.08-1.34 1.38-2.13.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91-.3-.79-.72-1.46-1.38-2.13C21.32 1.35 20.65.93 19.86.63 19.1.33 18.22.13 16.95.07 15.67.01 15.26 0 12 0z" />
                    <path d="M12 5.84a6.16 6.16 0 100 12.32 6.16 6.16 0 000-12.32zm0 10.16a4 4 0 110-8 4 4 0 010 8z" />
                    <circle cx="18.41" cy="5.59" r="1.44" />
                  </svg>
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">
                  {busy ? "Preparing..." : "Instagram"}
                </span>
                <span className="block text-[11px] text-white/75">
                  Opens with the story image ready
                </span>
              </span>
            </button>

            <button
              onClick={() => shareToWhatsApp(post)}
              className="w-full flex items-center gap-3 rounded-2xl bg-[#25D366] px-4 py-3.5 text-left text-white transition-colors hover:bg-[#1eb855] active:scale-[0.99]"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20">
                <svg className="h-[20px] w-[20px] fill-white" viewBox="0 0 24 24">
                  <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.38-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.45 9.45 0 01-4.82-1.32l-.35-.2-3.58.94.96-3.49-.23-.36a9.42 9.42 0 01-1.44-5.03c0-5.2 4.24-9.44 9.47-9.44a9.4 9.4 0 016.69 2.77 9.38 9.38 0 012.77 6.68c0 5.2-4.24 9.45-9.46 9.45zM20.52 3.49A11.78 11.78 0 0012.04 0C5.46 0 .1 5.35.1 11.93c0 2.1.55 4.15 1.6 5.96L0 24l6.26-1.64a11.92 11.92 0 005.77 1.47h.01c6.58 0 11.93-5.35 11.94-11.93a11.86 11.86 0 00-3.46-8.41z" />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">WhatsApp</span>
                <span className="block text-[11px] text-white/80">
                  Title, summary and link
                </span>
              </span>
            </button>

            <button
              onClick={handleCopyCaption}
              className="w-full flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:border-gray-300 hover:bg-gray-50 active:scale-[0.99]"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-100">
                {copied === "caption" ? (
                  <Check size={16} className="text-emerald-600" />
                ) : (
                  <Copy size={16} className="text-gray-600" />
                )}
              </span>
              <span className="text-sm font-bold text-gray-900">
                {copied === "caption" ? "Caption copied" : "Copy caption"}
              </span>
            </button>

            <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-1.5 pl-3">
              <Link2 size={15} className="shrink-0 text-gray-400" />
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-gray-500">
                {postUrl}
              </span>
              <button
                onClick={handleCopyLink}
                className="shrink-0 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-gray-900 ring-1 ring-gray-200 transition-colors hover:bg-gray-900 hover:text-white"
              >
                {copied === "link" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
