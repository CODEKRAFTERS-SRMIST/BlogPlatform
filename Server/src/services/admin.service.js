import prisma from "../db/db.js";
import { AppError } from "../utils/AppError.js";

export async function getDashboardStats() {
  const [totalUsers, pendingUsers, approvedUsers, totalBlogs, pendingBlogs, totalLikes, totalComments] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'pending' } }),
    prisma.user.count({ where: { status: 'approved' } }),
    prisma.blog.count(),
    prisma.blog.count({ where: { status: 'pending_review' } }),
    prisma.like.count(),
    prisma.comment.count()
  ]);

  return {
    totalUsers,
    pendingUsers,
    approvedUsers,
    totalBlogs,
    pendingBlogs,
    totalLikes,
    totalComments
  };
}

export async function getAllUsers() {
  return prisma.user.findMany({
    select: { 
      id: true, 
      name: true, 
      email: true, 
      reg_no: true, 
      year: true, 
      domain: true, 
      status: true, 
      role: true, 
      is_super_admin: true,
      created_at: true 
    },
    orderBy: { created_at: 'desc' }
  });
}

export async function getPendingUsers() {
  return prisma.user.findMany({
    where: { status: 'pending' },
    select: { id: true, name: true, email: true, reg_no: true, year: true, domain: true, ref_code: true, created_at: true },
    orderBy: { created_at: 'desc' }
  });
}

export async function approveUser(id) {
  const user = await prisma.user.update({ 
    where: { id }, 
    data: { status: 'approved' } 
  });

  return { message: 'User approved successfully', user: { id: user.id, email: user.email, status: user.status } };
}

/**
 * Turns a registration down.
 *
 * Everything that acts on a rejected account was already here - login
 * refuses it, a refresh refuses it and revokes the tokens, every protected
 * route refuses it, and the browser has a page that explains it. The one
 * missing piece was anything that could set the status in the first place,
 * so an unwanted registration could only be left in the pending list for
 * ever, still being told to wait.
 *
 * Deliberately reversible: approveUser works on a rejected account and puts
 * it back, so a misclick is not permanent.
 */
export async function rejectUser(id, { actingUserId } = {}) {
  if (id === actingUserId) {
    throw new AppError('You cannot reject your own account', 400, 'BAD_REQUEST');
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new AppError('User not found', 404, 'NOT_FOUND');
  if (target.is_super_admin) {
    throw new AppError('Cannot reject a super admin', 403, 'FORBIDDEN');
  }
  if (target.status === 'rejected') {
    throw new AppError('This account has already been rejected', 400, 'ALREADY_REJECTED');
  }

  const user = await prisma.user.update({
    where: { id },
    data: { status: 'rejected' },
    select: { id: true, email: true, name: true, status: true },
  });

  /*
   * Out now, not in fifteen minutes.
   *
   * Authorisation is read from the database on every request, so the account
   * loses access on its very next click either way. This is about the
   * session itself: with the refresh tokens revoked, the access token cannot
   * be renewed when it expires, so the browser is sent to the page that
   * explains what happened instead of silently carrying on.
   */
  await prisma.refreshToken.updateMany({
    where: { user_id: id, revoked: false },
    data: { revoked: true },
  });

  return { message: 'Registration rejected', user };
}

export async function promoteToAdmin(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
  if (user.is_super_admin) throw new AppError('User is already a super admin', 400, 'ALREADY_SUPER_ADMIN');

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      role: 'admin',
      status: 'approved',
    },
    select: { id: true, email: true, name: true, role: true, status: true },
  });

  await prisma.refreshToken.updateMany({
    where: { user_id: userId, revoked: false },
    data: { revoked: true },
  });

  return updated;
}
