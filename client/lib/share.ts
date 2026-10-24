export interface ShareablePost {
  id: string;
  title: string;
  author: string;
  subtitle?: string;
  content?: string;
}

export const HASHTAGS = "#CodeKrafters #CampusDevelopers #Engineering";

function getOrigin(): string {
  return typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
}

/**
 * Public URL for a single post. The feed at /blogs reads the `post` query
 * param on load and opens that article, so the link lands on the story
 * itself instead of the top of the feed.
 */
export function getPostUrl(postId: string): string {
  const origin = getOrigin();
  return postId ? `${origin}/blogs?post=${encodeURIComponent(postId)}` : `${origin}/blogs`;
}

/** Plain-text excerpt, with markdown punctuation stripped out. */
export function getExcerpt(post: ShareablePost, maxLength = 200): string {
  const source = post.content?.trim() || post.subtitle?.trim() || "";
  if (!source) return "";
  const stripped = source
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*`_~>\[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length > maxLength ? `${stripped.slice(0, maxLength).trimEnd()}…` : stripped;
}

/** Caption for Instagram and other apps that cannot be pre-filled by URL. */
export function buildCaption(post: ShareablePost): string {
  const excerpt = getExcerpt(post, 180);
  return [
    post.title,
    `By ${post.author}`,
    excerpt,
    `Read it here: ${getPostUrl(post.id)}`,
    HASHTAGS,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function shareToWhatsApp(post: ShareablePost) {
  const excerpt = getExcerpt(post, 280);
  const message =
    `*${post.title}*\n` +
    `✍️ By ${post.author}\n\n` +
    (excerpt ? `${excerpt}\n\n` : "") +
    `👉 Read it here:\n${getPostUrl(post.id)}\n\n` +
    HASHTAGS;

  window.open(
    `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`,
    "_blank",
    "noopener,noreferrer",
  );
}

/** True when the browser can open the device's own share sheet. */
export function canNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export type NativeShareResult = "shared" | "cancelled" | "unsupported" | "failed";

/**
 * Opens the phone's share sheet (Instagram Stories, WhatsApp, Messages, …).
 * Instagram cannot be pre-filled from a URL, so on mobile this is the only
 * way to hand a post to it directly.
 */
export async function shareNative(post: ShareablePost): Promise<NativeShareResult> {
  if (!canNativeShare()) return "unsupported";
  try {
    await navigator.share({
      title: post.title,
      text: buildCaption(post),
      url: getPostUrl(post.id),
    });
    return "shared";
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
    return "failed";
  }
}

async function writeToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the textarea fallback below
  }
  // Fallback for browsers that block the async clipboard API
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export async function copyPostLink(postId: string): Promise<boolean> {
  return writeToClipboard(getPostUrl(postId));
}

export async function copyCaption(post: ShareablePost): Promise<boolean> {
  return writeToClipboard(buildCaption(post));
}
