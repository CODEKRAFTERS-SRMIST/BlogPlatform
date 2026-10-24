import bcrypt from "bcrypt";
import crypto from "crypto";
import prisma from "../db/db.js";
import { AppError } from "../utils/AppError.js";
import { signJwt, generateRefreshToken, hashToken, getRefreshTokenExpiry } from "../middleware/jwt.js";
import { sendMail } from "../middleware/mail.js";

function generateRefCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'SC-';
  for (let i = 0; i < 9; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function generatePasswordToken() {
  return crypto.randomBytes(32).toString('hex');
}

/** Emails are stored lowercase and trimmed so one address means one account. */
export function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : email;
}

/**
 * Looks a user up by email, ignoring case.
 *
 * New rows are stored lowercase, but rows created before that was enforced may
 * hold mixed case, so matching case-insensitively keeps those accounts working.
 */
export async function findUserByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return prisma.user.findFirst({
    where: { email: { equals: normalized, mode: 'insensitive' } },
  });
}

export async function register(payload) {
  const email = normalizeEmail(payload.email);

  const existingEmail = await findUserByEmail(email);
  if (existingEmail) throw new AppError('This email is already registered', 409, 'EMAIL_EXISTS');

  const existingRegNo = await prisma.user.findUnique({ where: { reg_no: payload.reg_no } });
  if (existingRegNo) throw new AppError('This registration number is already registered', 409, 'REG_NO_EXISTS');

  let ref_code;
  for (let i = 0; i < 10; i++) {
    ref_code = generateRefCode();
    const e = await prisma.user.findUnique({ where: { ref_code } });
    if (!e) break;
  }

  let passwordHash = null;
  if (payload.password) {
    passwordHash = await bcrypt.hash(payload.password, 12);
  }

  const { password, ...userData } = payload;

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email,
      reg_no: payload.reg_no,
      year: payload.year ? String(payload.year) : '1',
      domain: payload.domain,
      ref_code,
      status: 'pending',
      password_hash: passwordHash,
    }
  });

  return { id: user.id, email: user.email, ref_code: user.ref_code, status: user.status, message: 'Registration successful! Please wait for admin approval.' };
}

export async function setPassword(token, password) {
  const user = await prisma.user.findFirst({
    where: {
      set_password_token: token,
      set_password_expires: { gt: new Date() },
    },
  });

  if (!user) {
    throw new AppError('Invalid or expired password reset token', 400, 'INVALID_TOKEN');
  }

  if (user.status !== "approved") {
    throw new AppError('Your account has not been approved yet', 403, 'NOT_APPROVED');
  }

  const hash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password_hash: hash,
      set_password_token: null,
      set_password_expires: null,
      failed_login_attempts: 0,
      lock_until: null,
    },
  });

  return true;
}


export async function login(email, password) {
  const user = await findUserByEmail(email);
  if (!user) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  if (user.lock_until && user.lock_until > new Date()) {
    const minutesLeft = Math.ceil((user.lock_until - new Date()) / 60000);
    throw new AppError(`Account locked. Try again in ${minutesLeft} minutes`, 429, 'ACCOUNT_LOCKED');
  }

  if (user.status !== 'approved') throw new AppError('Your account is awaiting admin approval', 403, 'PENDING_APPROVAL');
  if (!user.password_hash) throw new AppError('Password not set for this account. Please contact an admin.', 400, 'NO_PASSWORD');

  const ok = await bcrypt.compare(password, user.password_hash);

  if (!ok) {
    const attempts = user.failed_login_attempts + 1;
    const lockUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failed_login_attempts: attempts,
        lock_until: lockUntil,
      },
    });

    if (lockUntil) {
      throw new AppError('Too many failed attempts. Account locked for 15 minutes', 429, 'ACCOUNT_LOCKED');
    }
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failed_login_attempts: 0,
      lock_until: null,
    },
  });

  const accessToken = signJwt({ id: user.id, role: user.role, email: user.email, is_super_admin: user.is_super_admin });

  const refreshTokenValue = generateRefreshToken();
  const tokenHash = hashToken(refreshTokenValue);
  await prisma.refreshToken.create({
    data: {
      token_hash: tokenHash,
      user_id: user.id,
      expires_at: getRefreshTokenExpiry(),
    },
  });

  return {
    accessToken,
    refreshToken: refreshTokenValue,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, is_super_admin: user.is_super_admin }
  };
}

export async function refreshAccessToken(refreshTokenValue) {
  const tokenHash = hashToken(refreshTokenValue);
  const stored = await prisma.refreshToken.findFirst({
    where: { token_hash: tokenHash },
    include: { user: true },
  });

  if (!stored) {
    throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');
  }

  if (stored.revoked) {
    throw new AppError('Session invalidated. Please log in again.', 401, 'SESSION_REVOKED');
  }

  if (stored.expires_at <= new Date()) {
    throw new AppError('Refresh token expired', 401, 'TOKEN_EXPIRED');
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revoked: true },
  });

  const newAccessToken = signJwt({ id: stored.user.id, role: stored.user.role, email: stored.user.email, is_super_admin: stored.user.is_super_admin });

  const newRefreshValue = generateRefreshToken();
  const newTokenHash = hashToken(newRefreshValue);
  await prisma.refreshToken.create({
    data: {
      token_hash: newTokenHash,
      user_id: stored.user.id,
      expires_at: getRefreshTokenExpiry(),
    },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshValue,
    user: { id: stored.user.id, email: stored.user.email, name: stored.user.name, role: stored.user.role, is_super_admin: stored.user.is_super_admin }
  };
}

export async function revokeAllUserRefreshTokens(userId) {
  await prisma.refreshToken.updateMany({
    where: { user_id: userId, revoked: false },
    data: { revoked: true },
  });
}

export async function getUserById(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, reg_no: true, year: true, domain: true, role: true, is_super_admin: true, status: true, created_at: true }
  });
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
  return user;
}

export async function verifyEmail(token) {
  const user = await prisma.user.findFirst({
    where: { verification_token: token }
  });

  if (!user) {
    throw new AppError('Invalid or expired verification link', 400, 'INVALID_TOKEN');
  }

  if (user.email_verified) {
    throw new AppError('This email is already verified', 400, 'ALREADY_VERIFIED');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      email_verified: true,
      verification_token: null,
    },
  });

  return true;
}

export async function requestPasswordReset(email) {
  const user = await findUserByEmail(email);

  if (!user) {
    return { message: 'If an account exists with this email, a reset link has been sent' };
  }

  if (user.status !== 'approved') {
    throw new AppError('Your account is awaiting admin approval', 403, 'PENDING_APPROVAL');
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      set_password_token: resetToken,
      set_password_expires: expiresAt,
    },
  });

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const resetUrl = `${appUrl}/auth/reset-password?token=${resetToken}`;

  const { emailTemplates } = await import('../middleware/mail.js');
  await sendMail(user.email, 'Password Reset Request', emailTemplates.passwordReset(user.name, resetUrl));

  return { message: 'If an account exists with this email, a reset link has been sent' };
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
  if (!user.password_hash) throw new AppError('Password not set for this account. Please contact an admin.', 400, 'NO_PASSWORD');

  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');

  const newHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { password_hash: newHash }
  });

  await revokeAllUserRefreshTokens(userId);

  return { message: 'Password updated successfully' };
}