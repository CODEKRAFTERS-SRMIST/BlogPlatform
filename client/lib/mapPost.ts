import { Post } from '@/types/blog';

/**
 * Formats a date the same way on the server and in the browser.
 *
 * /blogs/[id] is rendered on the server and then hydrated. With the locale
 * left to the runtime the two can format the same date differently, and
 * React reports a hydration mismatch on a page that is otherwise fine.
 */
export function formatPostDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * One blog from the API, in the shape the interface reads.
 *
 * There were three near-identical copies of this. Two of them read
 * `p.publishedAt` - a field the API has never sent - and fell back to
 * `new Date()` when it came back undefined, which is why every story in the
 * feed and on the dashboard was dated today. The same two read
 * `p.viewCount`, equally absent, so every story reported nought views.
 *
 * One copy now: a fix lands everywhere at once, and there is nowhere for a
 * fourth to drift to.
 */
export function mapPost(p: any): Post {
  return {
    id: p.id,
    title: p.title ?? '',
    subtitle: p.subtitle || '',
    content: p.content || '',
    /*
     * No stock-photo stand-in. A story with no cover used to be given the
     * same Unsplash photograph as every other story with no cover - and on
     * the way in it was written into the database, so the placeholder
     * became the post's real cover. A missing cover now draws the quiet
     * gradient instead.
     */
    coverImage: p.image || p.coverImage || '',
    image: p.image || undefined,
    author:
      p.author?.name || (typeof p.author === 'string' ? p.author : '') || 'Unknown',
    date: formatPostDate(p.created_at ?? p.createdAt),
    status: p.status || 'published',
    // Only /blogs/my returns this, and only to the story's own author.
    rejectionReason: p.rejection_reason || p.rejectionReason || undefined,
    likes: p._count?.likes ?? p.likes ?? 0,
    comments: p._count?.comments ?? p.comments ?? 0,
    userLiked: Boolean(p.userLiked),
  };
}
