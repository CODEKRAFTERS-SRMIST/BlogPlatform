import * as blogsService from "../services/blogs.service.js";
import { AppError } from "../utils/AppError.js";

export async function createDraft(req, res, next) {
  try {
    const authorId = req.user.id;
    const payload = req.body;
    // Explicitly true, not merely truthy: this decides whether a story goes
    // in front of an admin, so a stray string should not stand in for a yes.
    const submit = payload.submit === true;
    const blog = await blogsService.createDraft(authorId, payload, { submit });
    res.status(201).json({
      success: true,
      data: blog
    });
  } catch (err) {
    next(err);
  }
}

export async function editDraft(req, res, next) {
  try {
    const authorId = req.user.id;
    const { id } = req.params;
    const payload = req.body;
    const updated = await blogsService.editDraft(authorId, id, payload);
    res.json({
      success: true,
      data: updated
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteDraft(req, res, next) {
  try {
    const authorId = req.user.id;
    const { id } = req.params;
    await blogsService.deleteBlog(authorId, id);
    res.json({
      success: true,
      data: { message: "Blog deleted successfully" }
    });
  } catch (err) {
    next(err);
  }
}
export async function submitForReview(req, res, next) {
  try {
    const authorId = req.user.id;
    const { id } = req.params;
    await blogsService.submitForReview(authorId, id);
    res.json({
      success: true,
      data: { message: "Submitted for review" }
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyBlogs(req, res, next) {
  try {
    const authorId = req.user.id;
    const blogs = await blogsService.getByAuthor(authorId);
    res.json({
      success: true,
      data: blogs
    });
  } catch (err) {
    next(err);
  }
}

export async function getPublicBlogs(req, res, next) {
  try {
    const userId = req.user?.id;
    const { page, limit } = req.query;
    const { blogs, pagination } = await blogsService.getPublishedBlogs(userId, { page, limit });
    res.json({
      success: true,
      data: {
        count: blogs.length,
        blogs,
        pagination
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getPublicBlogById(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;
    const blog = await blogsService.getBlogById(id, userId);
    
    if (!blog) {
      throw new AppError("Blog not found", 404, "NOT_FOUND");
    }

    if (blog.status !== "published") {
      throw new AppError("Blog not available", 404, "NOT_FOUND");
    }

    res.json({
      success: true,
      data: blog
    });
  } catch (err) {
    next(err);
  }
}
