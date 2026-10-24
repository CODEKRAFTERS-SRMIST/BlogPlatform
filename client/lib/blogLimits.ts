/**
 * Length limits for a post, mirroring BLOG_LIMITS in
 * Server/src/services/blogs.service.js. The server enforces them for real;
 * these drive the live counters so people see the limit while typing.
 *
 * Only the content has a floor worth enforcing - a post shorter than a short
 * paragraph is not a story. The title is capped so it still fits a card and a
 * link preview, but has no minimum beyond "not empty".
 */
export const BLOG_LIMITS = {
  title: { min: 1, max: 70 },
  subtitle: { min: 0, max: 200 },
  content: { min: 100, max: 20000 },
} as const;

export type BlogField = keyof typeof BLOG_LIMITS;

/** Counter text plus whether the value is currently acceptable. */
export function counterFor(field: BlogField, value: string) {
  const { min, max } = BLOG_LIMITS[field];
  const length = value.trim().length;
  // A minimum of 1 means "not empty", which the counter should not nag about:
  // an empty field is obviously unfinished and the Publish button covers it.
  const tooShort = min > 1 && length > 0 && length < min;
  const tooLong = length > max;
  return {
    length,
    min,
    max,
    tooShort,
    tooLong,
    ok: !tooShort && !tooLong,
    label: tooShort ? `${length}/${min} minimum` : `${length}/${max}`,
  };
}

/**
 * How much of the content a preview shows before trailing off.
 *
 * Clamping by line count instead would put an ellipsis on text that fits
 * comfortably, because how many lines a paragraph takes depends on the width
 * of the column it lands in. Counting characters gives the same result on a
 * phone and on a desktop.
 */
export const PREVIEW_CHARS = 100;

/**
 * Shortens `text` to roughly `max` characters, breaking at a word so the
 * ellipsis never lands mid-word. Text already short enough is returned
 * untouched, with no ellipsis.
 */
export function truncateChars(text: string, max = PREVIEW_CHARS): string {
  const value = (text || "").trim();
  if (value.length <= max) return value;

  const cut = value.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  // Only break at a space when one is reasonably near the end, otherwise a
  // long unbroken run would be chopped back to almost nothing.
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.trimEnd()}…`;
}
