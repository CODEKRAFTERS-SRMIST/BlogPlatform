import prisma from '../db/db.js';
import { sendMail, emailTemplates } from '../middleware/mail.js';
import * as adminService from '../services/admin.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AppError } from '../utils/AppError.js';
import { logAuditEvent, AuditActions } from '../services/audit.service.js';

export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getDashboardStats();
  res.json({ success: true, data: stats });
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await adminService.getAllUsers();
  res.json({ success: true, data: { count: users.length, users } });
});

export const getPendingUsers = asyncHandler(async (req, res) => {
  const users = await adminService.getPendingUsers();
  res.json({ success: true, data: { count: users.length, users } });
});

export const approveUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await adminService.approveUser(id);
  logAuditEvent({ userId: req.user?.id, action: AuditActions.USER_APPROVE, entity: 'User', entityId: id, ip: req.ip });
  res.json({ success: true, data: result });
});

export const getBlogs = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const where = status ? { status } : undefined;
  const blogs = await prisma.blog.findMany({
    where,
    // The reviewer sees the writer's full profile beside the story, so the
    // card and the detail view do not need a second request per author.
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          reg_no: true,
          year: true,
          domain: true,
          role: true,
          is_super_admin: true,
          status: true,
          created_at: true,
        },
      },
    },
    orderBy: { created_at: 'desc' }
  });
  res.json({ success: true, data: { count: blogs.length, blogs } });
});

export const approveBlog = asyncHandler(async (req, res) => {
  logAuditEvent({ userId: req.user?.id, action: AuditActions.BLOG_APPROVE, entity: 'Blog', entityId: req.params.id, ip: req.ip });
  const { id } = req.params;
  const blog = await prisma.blog.findUnique({ where: { id } });

  if (!blog) throw new AppError('Blog not found', 404, 'NOT_FOUND');
  if (blog.status !== 'pending_review') throw new AppError('Blog not pending review', 400, 'BAD_REQUEST');

  const updated = await prisma.blog.update({
    where: { id },
    data: { status: 'published' }
  });

  const author = await prisma.user.findUnique({ where: { id: blog.author_id } });
  if (author) {
    sendMail(author.email, 'Blog Post Approved', emailTemplates.blogApproval(blog.title));
  }

  res.json({ success: true, data: { message: 'Blog approved and published', blog: updated } });
});

export const promoteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await adminService.promoteToAdmin(id);
  logAuditEvent({ userId: req.user?.id, action: AuditActions.USER_PROMOTE, entity: 'User', entityId: id, ip: req.ip });
  res.json({ success: true, data: result });
});

export const demoteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (id === req.user.id) {
    throw new AppError('You cannot demote yourself', 400, 'BAD_REQUEST');
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new AppError('User not found', 404, 'NOT_FOUND');
  if (target.is_super_admin) {
    throw new AppError('Cannot demote a super admin', 403, 'FORBIDDEN');
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role: 'member' },
    select: { id: true, email: true, name: true, role: true },
  });

  await prisma.refreshToken.updateMany({
    where: { user_id: id, revoked: false },
    data: { revoked: true },
  });

  logAuditEvent({ userId: req.user?.id, action: AuditActions.USER_DEMOTED, entity: 'User', entityId: id, ip: req.ip });

  res.json({ success: true, data: updated });
});

export const rejectBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  logAuditEvent({ userId: req.user?.id, action: AuditActions.BLOG_REJECT, entity: 'Blog', entityId: id, metadata: { reason }, ip: req.ip });

  if (!reason || !reason.trim()) {
    throw new AppError('Rejection reason is required', 400, 'VALIDATION_ERROR');
  }

  const blog = await prisma.blog.findUnique({ where: { id } });
  if (!blog) throw new AppError('Blog not found', 404, 'NOT_FOUND');
  if (blog.status !== 'pending_review') throw new AppError('Blog not pending review', 400, 'BAD_REQUEST');

  const updated = await prisma.blog.update({
    where: { id },
    data: { status: 'rejected', rejection_reason: reason }
  });

  const author = await prisma.user.findUnique({ where: { id: blog.author_id } });
  if (author) {
    sendMail(author.email, 'Blog Post Update', emailTemplates.blogRejection(blog.title, reason));
  }

  res.json({
    success: true,
    data: { message: 'Blog rejected', blog: { id, title: blog.title, status: 'rejected', rejection_reason: reason } }
  });
});
