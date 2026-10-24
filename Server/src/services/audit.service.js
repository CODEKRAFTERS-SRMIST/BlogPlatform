import prisma from "../db/db.js";

export async function logAuditEvent({ userId, action, entity, entityId, metadata, ip }) {
  try {
    await prisma.auditLog.create({
      data: {
        user_id: userId || null,
        action,
        entity: entity || null,
        entity_id: entityId || null,
        metadata: metadata || null,
        ip: ip || null,
      },
    });
  } catch (error) {
    console.error('Audit log write failed:', error.message);
  }
}

export const AuditActions = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  REGISTER: 'REGISTER',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PASSWORD_RESET: 'PASSWORD_RESET',
  TOKEN_REFRESH: 'TOKEN_REFRESH',
  USER_APPROVE: 'USER_APPROVE',
  USER_REJECT: 'USER_REJECT',
  USER_PROMOTE: 'USER_PROMOTE',
  USER_DEMOTED: 'USER_DEMOTED',
  BLOG_CREATE: 'BLOG_CREATE',
  BLOG_UPDATE: 'BLOG_UPDATE',
  BLOG_DELETE: 'BLOG_DELETE',
  BLOG_APPROVE: 'BLOG_APPROVE',
  BLOG_REJECT: 'BLOG_REJECT',
  BLOG_SUBMIT: 'BLOG_SUBMIT',
};
