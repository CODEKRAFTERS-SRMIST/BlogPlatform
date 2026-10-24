'use client';

import { useEffect, useState } from 'react';

/**
 * How much animation this visitor should be given.
 *
 *   full     everything: the per-letter choreography, the floating glyphs,
 *            the parallax. What a laptop gets.
 *   reduced  the same page, told plainly. Lines fade and slide as whole
 *            lines, decoration holds still, nothing loops. What a phone
 *            gets, because a phone was being asked to re-measure and
 *            re-blur several hundred moving pieces per frame to deliver an
 *            effect too small to see at that size.
 *   off      no motion at all beyond what is needed to not look broken.
 *            What somebody gets who has asked their device for it.
 *
 * Until now there was only "full", for everybody, always.
 */
export type MotionMode = 'full' | 'reduced' | 'off';

const STORAGE_KEY = 'motion_mode';

/*
 * Resolved once and remembered for the life of the page.
 *
 * The first component to mount settles this in its effect, so everything
 * mounting later - the whole below-the-fold half of the landing page, which
 * is loaded on demand - reads the answer on its very first render and never
 * renders the expensive version at all.
 */
let cached: MotionMode | null = null;

function detect(): MotionMode {
  if (typeof window === 'undefined') return 'full';

  // An explicit choice always wins. Nothing writes this yet; it is the hook
  // a settings toggle would use.
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'full' || stored === 'reduced' || stored === 'off') {
      return stored;
    }
  } catch {
    // private browsing can refuse storage; detection still works
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 'off';
  }

  /*
   * What the device admits to. Both are advisory and both can be missing -
   * Safari reports neither - so an absent value is read as "capable" and the
   * pointer check below is what actually catches phones.
   */
  const nav = navigator as Navigator & { deviceMemory?: number };
  if ((nav.hardwareConcurrency ?? 8) <= 4) return 'reduced';
  if ((nav.deviceMemory ?? 8) <= 4) return 'reduced';

  /*
   * A touch screen under 768px is a phone, and a phone gets the reduced
   * version whatever its specification says. The heavy choreography is
   * text flying in letter by letter at 7xl; at phone width that text is
   * 3xl and most of the effect is invisible, so the work buys nothing even
   * on hardware that could afford it.
   */
  if (window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 768) {
    return 'reduced';
  }

  return 'full';
}

export function useMotionMode(): MotionMode {
  /*
   * 'full' on the server and on the first client render, unless this page
   * has already settled it. Guessing differently here would mean the server
   * and the browser rendering different trees, which React rejects.
   */
  const [mode, setMode] = useState<MotionMode>(() => cached ?? 'full');

  useEffect(() => {
    const apply = () => {
      const resolved = detect();
      cached = resolved;
      setMode((prev) => (prev === resolved ? prev : resolved));
    };

    apply();

    // Somebody turning "reduce motion" on in their settings should be obeyed
    // without reloading the page.
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  return mode;
}

/** The common question: should this render its cheap version? */
export function useIsLiteMotion(): boolean {
  return useMotionMode() !== 'full';
}
