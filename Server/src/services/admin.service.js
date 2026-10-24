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
