import prisma from "../db/db.js";
import { AppError } from "../utils/AppError.js";

export async function toggleLike(blogId, userId) {
  const blog = await prisma.blog.findUnique({ where: { id: blogId } });
  if (!blog) throw new AppError("Blog not found", 404, "NOT_FOUND");
  if (blog.status !== "published") throw new AppError("Blog not available", 400, "BAD_REQUEST");

  const existingLike = await prisma.like.findUnique({
    where: {
      blog_id_user_id: {
        blog_id: blogId,
        user_id: userId,
      },
    },
  });

  if (existingLike) {
    await prisma.like.delete({ where: { id: existingLike.id } });
    const count = await prisma.like.count({ where: { blog_id: blogId } });
    return { liked: false, count };
  } else {
    await prisma.like.create({
      data: { blog_id: blogId, user_id: userId },
    });
    const count = await prisma.like.count({ where: { blog_id: blogId } });
    return { liked: true, count };
  }
}

export async function getBlogLikes(blogId, userId = null) {
  const count = await prisma.like.count({ where: { blog_id: blogId } });
  let userLiked = false;
  
  if (userId) {
    const like = await prisma.like.findUnique({
      where: {
        blog_id_user_id: {
          blog_id: blogId,
          user_id: userId,
        },
      },
    });
    userLiked = !!like;
  }

  return { count, userLiked };
}

export async function addComment(blogId, userId, content, parentId = null) {
  const blog = await prisma.blog.findUnique({ where: { id: blogId } });
  if (!blog) throw new AppError("Blog not found", 404, "NOT_FOUND");
  if (blog.status !== "published") throw new AppError("Blog not available", 400, "BAD_REQUEST");

  // If parentId is provided, verify it exists and is for the same blog
  if (parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: parentId } });
    if (!parent) throw new AppError("Parent comment not found", 404, "NOT_FOUND");
    if (parent.blog_id !== blogId) throw new AppError("Invalid parent comment", 400, "BAD_REQUEST");
  }

  const comment = await prisma.comment.create({
    data: { blog_id: blogId, user_id: userId, content, parent_id: parentId },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  return comment;
}

export async function getBlogComments(blogId) {
  // We fetch comments flattened but with parent info, 
  // or we could fetch root comments with included replies.
  // For 2 levels, we fetch root comments (parent_id: null) and their replies.
  return prisma.comment.findMany({
    where: { 
      blog_id: blogId,
      parent_id: null // Root comments
    },
    include: {
      user: { select: { id: true, name: true } },
      replies: {
        include: {
          user: { select: { id: true, name: true } }
        },
        orderBy: { created_at: "asc" }
      }
    },
    orderBy: { created_at: "desc" },
  });
}

export async function deleteComment(commentId, userId, isAdmin = false) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new AppError("Comment not found", 404, "NOT_FOUND");
  if (comment.user_id !== userId && !isAdmin) {
    throw new AppError("Not authorized to delete this comment", 403, "FORBIDDEN");
  }

  await prisma.comment.delete({ where: { id: commentId } });
  return true;
}

export async function getUserStats(userId) {
  const [blogCount, likesGiven, commentsCount] = await Promise.all([
    prisma.blog.count({ where: { author_id: userId, status: "published" } }),
    prisma.like.count({ where: { user_id: userId } }),
    prisma.comment.count({ where: { user_id: userId } }),
  ]);

  return { blogCount, likesGiven, commentsCount };
}

/**
 * How long the landing-page band may be stale. Nothing on it moves fast
 * enough for a minute to matter.
 */
const PLATFORM_STATS_TTL_MS = 60_000;
let platformStatsCache = { value: null, expires: 0 };
let platformStatsInFlight = null;

async function computePlatformStats() {
  const [totalUsers, totalBlogs, totalPublished, totalLikes, totalComments, wordRows] =
    await Promise.all([
      prisma.user.count({ where: { role: "member", status: "approved" } }),
      prisma.blog.count(),
      prisma.blog.count({ where: { status: "published" } }),
      prisma.like.count(),
      prisma.comment.count(),
      /*
       * Counted in the database rather than here. This used to select the
       * content of every published post and count the words in JavaScript,
       * so the entire blog archive crossed the wire on every visit to the
       * landing page - on a public endpoint, needing no session, that any
       * visitor could ask for as often as they liked. Postgres returns one
       * number instead.
       *
       * The trim is a regular expression rather than trim(), because
       * Postgres trim() strips spaces and nothing else: a post ending in a
       * newline kept it, split into a trailing empty element, and counted
       * as one word more than the loop this replaces. Posts left empty
       * after trimming are dropped rather than counted, since splitting an
       * empty string yields one empty element that would read as a word.
       *
       * Checked against the old loop over the development database: 6,427
       * words across 17 posts, both ways.
       */
      prisma.$queryRaw`
        SELECT COALESCE(SUM(array_length(regexp_split_to_array(t, '[[:space:]]+'), 1)), 0)::int AS total
        FROM (
          SELECT regexp_replace(content, '^[[:space:]]+|[[:space:]]+$', '', 'g') AS t
          FROM "Blog"
          WHERE status = 'published'
        ) trimmed
        WHERE t <> ''
      `,
    ]);

  const totalWords = Number(wordRows?.[0]?.total ?? 0);

  return { totalUsers, totalBlogs, totalPublished, totalLikes, totalComments, totalWords };
}

/**
 * The numbers behind the landing-page band, cached for a minute.
 *
 * Requests arriving while the first one is still running share it instead of
 * starting their own. That matters most on a free Render instance: the
 * server wakes from sleep, a dozen requests land together, and without this
 * every one of them would do the whole job.
 */
export async function getPlatformStats() {
  if (platformStatsCache.value && Date.now() < platformStatsCache.expires) {
    return platformStatsCache.value;
  }
  if (platformStatsInFlight) return platformStatsInFlight;

  platformStatsInFlight = (async () => {
    try {
      const stats = await computePlatformStats();
      platformStatsCache = { value: stats, expires: Date.now() + PLATFORM_STATS_TTL_MS };
      return stats;
    } finally {
      platformStatsInFlight = null;
    }
  })();

  return platformStatsInFlight;
}
