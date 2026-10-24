'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Maximize2, X } from 'lucide-react';
import { Post } from '@/types/blog';

interface BlogArticleProps {
  post: Post;
  /**
   * Shared-layout ids, so the card in the feed can grow into this. Only the
   * modal wants them: on a page reached by its own URL there is no card to
   * grow from, and an unmatched layoutId makes Framer hunt for a partner
   * that will never appear.
   */
  morph?: boolean;
  /** Buttons beside the author line. The feed passes share and like; My
   *  Library passes none, because neither belongs on an unpublished draft. */
  actions?: React.ReactNode;
  /** A banner above the title - the rejection reason, in My Library. */
  notice?: React.ReactNode;
  /** Anything after the body. The modal puts the discussion here. */
  children?: React.ReactNode;
}

/**
 * One story, rendered the same way wherever it is read.
 *
 * This used to live inside BlogDetailModal, which meant the standalone page
 * at /blogs/[id] would have needed its own copy of the same markup - and
 * this codebase has already been bitten by that: three separate copies of
 * the post mapper drifted apart until two of them dated every post "today".
 * One component, three callers.
 */
export default function BlogArticle({
  post,
  morph = false,
  actions,
  notice,
  children,
}: BlogArticleProps) {
  const [heroFailed, setHeroFailed] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const heroImage = post.image || post.coverImage;
  const hasHero = Boolean(heroImage) && !heroFailed;

  // Escape closes the full-size image before anything else reacts to it.
  useEffect(() => {
    if (!showFullImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setShowFullImage(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [showFullImage]);

  return (
    <>
      <div
        className={`relative ${
          hasHero
            ? 'h-[200px] sm:h-[320px] md:h-[460px]'
            : 'h-16 sm:h-20 bg-gradient-to-br from-[#f5b800]/15 to-transparent'
        }`}
      >
        {hasHero && (
          <motion.div
            layoutId={morph ? `card-image-${post.id}` : undefined}
            style={morph ? { willChange: 'transform' } : undefined}
            className="h-full w-full"
          >
            <img
              src={heroImage}
              alt={post.title}
              onError={() => setHeroFailed(true)}
              className="h-full w-full object-cover"
            />
          </motion.div>
        )}

        {/* The hero is cropped to fit, so offer the whole picture */}
        {hasHero && (
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

      <div
        className={`relative z-10 px-5 pb-10 sm:px-8 sm:pb-12 md:px-16 ${
          hasHero ? '-mt-12 sm:-mt-16 md:-mt-20' : 'mt-2'
        }`}
      >
        {notice}

        <motion.h1
          layoutId={morph ? `card-title-${post.id}` : undefined}
          style={morph ? { willChange: 'transform' } : undefined}
          className="wrap-anywhere mb-4 text-2xl font-black leading-[1.15] text-gray-900 sm:mb-6 sm:text-4xl sm:leading-[1.1] md:text-6xl"
        >
          {post.title}
        </motion.h1>

        {post.subtitle && (
          <p className="wrap-anywhere mb-7 max-w-3xl text-base font-medium leading-relaxed text-gray-500 sm:mb-10 sm:text-xl md:text-2xl">
            {post.subtitle}
          </p>
        )}

        <div className="mb-8 flex flex-col gap-5 border-b border-gray-100 pb-8 sm:mb-12 sm:flex-row sm:items-center sm:justify-between sm:pb-12">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f5b800] to-amber-500 text-base font-black text-white shadow-lg shadow-amber-200 sm:h-14 sm:w-14 sm:text-xl">
              {post.author.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-black text-gray-900 sm:text-lg">
                {post.author}
              </div>
              <div className="text-xs font-bold text-gray-400 sm:text-sm">{post.date}</div>
            </div>
          </div>

          {actions && (
            <div className="flex shrink-0 items-center gap-2 sm:gap-3 md:gap-4">{actions}</div>
          )}
        </div>

        <div
          style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 1200px' }}
          className="wrap-anywhere prose prose-sm mb-12 max-w-none whitespace-pre-wrap text-[15px] font-medium leading-[1.75] text-gray-800 sm:prose-base sm:mb-20 sm:text-base sm:leading-[1.8] md:prose-xl md:text-xl"
        >
          {post.content}
        </div>

        {children}
      </div>

      {/*
       * Portalled to the body on purpose. Its parent in the modal carries a
       * transform, and a transform creates a containing block for `fixed`
       * children - so rendered in place this would be trapped inside the
       * panel instead of covering the screen.
       */}
      {mounted && showFullImage && hasHero &&
        createPortal(
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
              src={heroImage}
              alt={post.title}
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full object-contain"
            />
            <p className="pointer-events-none absolute bottom-4 left-0 right-0 text-center text-[11px] text-white/60">
              Tap anywhere to close
            </p>
          </div>,
          document.body,
        )}
    </>
  );
}
