import prisma from "../db/db.js";
import { AppError } from "../utils/AppError.js";

/**
 * Length limits for a post. Enforced here as well as in the browser, so they
 * cannot be skipped by calling the API directly. Change the numbers in one
 * place: client/lib/blogLimits.ts mirrors them for the live counters.
 *
 * Only the content has a floor worth enforcing - a post shorter than a short
 * paragraph is not a story. The title is capped so it still fits a card and a
 * link preview, but has no minimum beyond "not empty".
 */
export const BLOG_LIMITS = {
  title: { min: 1, max: 70 },
  subtitle: { min: 0, max: 200 },
  content: { min: 100, max: 20000 },
};

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

/** Throws a readable error when a field is too short or too long. */
function validateBlogPayload(payload) {
  const title = clean(payload.title);
  const subtitle = clean(payload.subtitle);
  const content = clean(payload.content);

  if (title.length < BLOG_LIMITS.title.min) {
    throw new AppError("Please give your post a title", 400, "TITLE_TOO_SHORT");
  }
  if (title.length > BLOG_LIMITS.title.max) {
    throw new AppError(`Title must be ${BLOG_LIMITS.title.max} characters or fewer`, 400, "TITLE_TOO_LONG");
  }
  if (subtitle.length > BLOG_LIMITS.subtitle.max) {
    throw new AppError(`Subtitle must be ${BLOG_LIMITS.subtitle.max} characters or fewer`, 400, "SUBTITLE_TOO_LONG");
  }
  if (content.length < BLOG_LIMITS.content.min) {
    throw new AppError(`Your post must be at least ${BLOG_LIMITS.content.min} characters`, 400, "CONTENT_TOO_SHORT");
  }
  if (content.length > BLOG_LIMITS.content.max) {
    throw new AppError(`Your post must be ${BLOG_LIMITS.content.max} characters or fewer`, 400, "CONTENT_TOO_LONG");
  }

  return { title, subtitle: subtitle || null, content };
}

/**
 * Creates a story, and optionally puts it straight into review.
 *
 * The editor used to create a draft and then call submitForReview as a
 * separate request. When the second one failed the browser logged it to the
 * console, told the writer their story was submitted, and showed a pending
 * badge - over a row that was still a draft no admin would ever see. One
 * write, one status, nothing in between to fall into.
 */
export async function createDraft(authorId, payload, { submit = false } = {}) {
  const { title, subtitle, content } = validateBlogPayload(payload);

  const blog = await prisma.blog.create({
    data: {
      title,
      subtitle,
      content,
      image: payload.image || null,
      links: payload.links || null,
      author_id: authorId,
      status: submit ? "pending_review" : "draft"
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
      _count: { select: { likes: true, comments: true } }
    }
  });
  return blog;
}

export async function editDraft(authorId, id, payload) {
  const blog = await prisma.blog.findUnique({ where: { id } });
  if (!blog) throw new AppError("Blog not found", 404, "NOT_FOUND");
  if (blog.author_id !== authorId) throw new AppError("Not authorized", 403, "FORBIDDEN");
  if (blog.status === "published") throw new AppError("Cannot edit published blogs", 400, "BAD_REQUEST");
  if (blog.status === "pending_review") throw new AppError("Cannot edit blog while under review", 400, "BAD_REQUEST");
  /*
   * A rejected story stays rejected.
   *
   * Editing one used to quietly turn it back into a draft, which could then
   * be submitted again - so a rejection could be undone by anybody calling
   * this endpoint, whatever the interface offered. The decision belongs to
   * the admin who made it; writing a new story is the way forward.
   */
  if (blog.status === "rejected") throw new AppError("A rejected story cannot be edited. Please write a new one.", 400, "BLOG_REJECTED");

  const { title, subtitle, content } = validateBlogPayload(payload);

  const updated = await prisma.blog.update({
    where: { id },
    data: {
      title,
      subtitle,
      content,
      image: payload.image || blog.image,
      links: payload.links || null
    }
  });
  return updated;
}

export async function deleteBlog(authorId, id) {
  const blog = await prisma.blog.findUnique({ where: { id } });
  if (!blog) throw new AppError("Blog not found", 404, "NOT_FOUND");
  if (blog.author_id !== authorId) throw new AppError("Not authorized", 403, "FORBIDDEN");

  await prisma.blog.delete({
    where: { id }
  });
  return { success: true };
}

export async function submitForReview(authorId, id) {
  const blog = await prisma.blog.findUnique({ where: { id } });
  if (!blog) throw new AppError("Blog not found", 404, "NOT_FOUND");
  if (blog.author_id !== authorId) throw new AppError("Not authorized", 403, "FORBIDDEN");
  if (blog.status !== "draft") throw new AppError("Can only submit drafts for review", 400, "BAD_REQUEST");

  await prisma.blog.update({
    where: { id },
    data: { status: "pending_review" }
  });
  return true;
}

export async function getByAuthor(authorId) {
  return prisma.blog.findMany({
    where: { author_id: authorId },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      title: true,
      subtitle: true,
      content: true,
      image: true,
      links: true,
      status: true,
      created_at: true,
      updated_at: true,
      rejection_reason: true,
      /*
       * The author, on the author's own stories.
       *
       * This select listed every column the library needs except this one,
       * so each row arrived with no author at all and the mapper fell back
       * to its last resort - every story in My Library was written by
       * "Unknown", including the one you had just finished writing.
       *
       * Name and id only: the reader here is the author, and the email adds
       * nothing to a page about your own work.
       */
      author: {
        select: {
          id: true,
          name: true
        }
      },
      _count: {
        select: {
          likes: true,
          comments: true
        }
      }
    }
  });
}

export const BLOG_PAGE_SIZE = 9;
export const BLOG_PAGE_SIZE_MAX = 50;

/**
 * Published blogs, newest first, one page at a time.
 *
 * Returning every row stops scaling the moment the club has a few hundred
 * posts: the payload, the JSON parse and the render all grow without bound.
 */
export async function getPublishedBlogs(userId = null, { page = 1, limit = BLOG_PAGE_SIZE } = {}) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || BLOG_PAGE_SIZE, 1), BLOG_PAGE_SIZE_MAX);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const total = await prisma.blog.count({ where: { status: "published" } });

  const blogs = await prisma.blog.findMany({
    where: { status: "published" },
    skip,
    take: safeLimit,
    include: {
      /*
       * Name only. The email was travelling to every browser that asked for
       * the feed - invisible on screen, plainly readable in the response -
       * on an endpoint that needs no session at all. Nothing public has ever
       * rendered it, and with a server-rendered story page it would be baked
       * into the HTML for anyone to read.
       *
       * The admin review endpoint still returns it (admin.controller.js):
       * that one is behind requireRole and a reviewer needs to know who
       * wrote the thing.
       */
      author: {
        select: {
          id: true,
          name: true
        }
      },
      _count: {
        select: {
          likes: true,
          comments: true
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });

  const pagination = {
    page: safePage,
    limit: safeLimit,
    total,
    totalPages: Math.max(Math.ceil(total / safeLimit), 1),
    hasMore: skip + blogs.length < total,
  };

  if (!userId) {
    return { blogs: blogs.map(b => ({ ...b, userLiked: false })), pagination };
  }

  // Efficiently check likes for all fetched blogs
  const userLikes = await prisma.like.findMany({
    where: {
      user_id: userId,
      blog_id: { in: blogs.map(b => b.id) }
    },
    select: { blog_id: true }
  });

  const likedBlogIds = new Set(userLikes.map(l => l.blog_id));

  return {
    blogs: blogs.map(b => ({
      ...b,
      userLiked: likedBlogIds.has(b.id),
    })),
    pagination,
  };
}

export async function getBlogById(id, userId = null) {
  const blog = await prisma.blog.findUnique({
    where: { id },
    include: {
      /*
       * Name only. The email was travelling to every browser that asked for
       * the feed - invisible on screen, plainly readable in the response -
       * on an endpoint that needs no session at all. Nothing public has ever
       * rendered it, and with a server-rendered story page it would be baked
       * into the HTML for anyone to read.
       *
       * The admin review endpoint still returns it (admin.controller.js):
       * that one is behind requireRole and a reviewer needs to know who
       * wrote the thing.
       */
      author: {
        select: {
          id: true,
          name: true
        }
      },
      _count: {
        select: {
          likes: true,
          comments: true
        }
      }
    }
  });

  if (!blog) return null;

  let userLiked = false;
  if (userId) {
    const like = await prisma.like.findUnique({
      where: {
        blog_id_user_id: {
          blog_id: id,
          user_id: userId,
        },
      },
    });
    userLiked = !!like;
  }

  return { ...blog, userLiked };
}
