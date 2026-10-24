import express from 'express';
import { authenticate, requireRole, requireSuperAdmin } from '../middleware/auth.js';
import { getPendingUsers, approveUser, promoteUser, demoteUser, getBlogs, approveBlog, rejectBlog, getDashboardStats, getAllUsers } from '../controllers/admin.controller.js';

const router = express.Router();

router.get('/stats', authenticate, requireRole('admin'), getDashboardStats);
// Any admin may READ the roster: it carries no secrets (no password hashes,
// no tokens) and an admin already sees emails when approving registrations.
// Changing someone's role stays super-admin only, below.
router.get('/users/all', authenticate, requireRole('admin'), getAllUsers);
router.get('/users/pending', authenticate, requireRole('admin'), getPendingUsers);
router.patch('/users/:id/approve', authenticate, requireRole('admin'), approveUser);
router.patch('/users/:id/promote', authenticate, requireSuperAdmin, promoteUser);
router.patch('/users/:id/demote', authenticate, requireSuperAdmin, demoteUser);
router.get('/blogs', authenticate, requireRole('admin'), getBlogs);
router.patch('/blogs/:id/approve', authenticate, requireRole('admin'), approveBlog);
router.patch('/blogs/:id/reject', authenticate, requireRole('admin'), rejectBlog);

export default router;
