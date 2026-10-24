import * as interactionService from "../services/interaction.service.js";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export const toggleLike = asyncHandler(async (req, res) => {
  const { blogId } = req.params;
  const userId = req.user.id;
  const result = await interactionService.toggleLike(blogId, userId);
  res.json({ success: true, data: result });
});

export const getComments = asyncHandler(async (req, res) => {
  const { blogId } = req.params;
  const comments = await interactionService.getBlogComments(blogId);
  res.json({ success: true, data: { comments } });
});

export const addComment = asyncHandler(async (req, res) => {
  const { blogId } = req.params;
  const { content, parentId } = req.body;
  const userId = req.user.id;

  if (!content || !content.trim()) {
    return res.status(400).json({
      success: false,
      error: { message: "Comment content is required" },
    });
  }

  const comment = await interactionService.addComment(blogId, userId, content, parentId);
  res.status(201).json({ success: true, data: { comment } });
});

export const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user.id;
  const isAdmin = req.user.role === "admin";

  await interactionService.deleteComment(commentId, userId, isAdmin);
  res.json({ success: true, data: { message: "Comment deleted" } });
});

export const getLikes = asyncHandler(async (req, res) => {
  const { blogId } = req.params;
  const userId = req.user?.id || null;
  const result = await interactionService.getBlogLikes(blogId, userId);
  res.json({ success: true, data: result });
});

export const getUserStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const stats = await interactionService.getUserStats(userId);
  res.json({ success: true, data: stats });
});

export const getPublicUserStats = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const stats = await interactionService.getUserStats(userId);
  res.json({ success: true, data: stats });
});

export const getPlatformStats = asyncHandler(async (req, res) => {
  const stats = await interactionService.getPlatformStats();
  // Public, slow-moving and identical for everybody, so let the browser and
  // any CDN in front of us hold it for the same minute the server does.
  res.set("Cache-Control", "public, max-age=60");
  res.json({ success: true, data: stats });
});
