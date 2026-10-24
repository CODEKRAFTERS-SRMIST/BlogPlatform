import * as authService from "../services/auth.service.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { AppError } from "../utils/AppError.js";
import { logAuditEvent, AuditActions } from "../services/audit.service.js";


/**
 * Signup rules. Keep these in sync with client/lib/validators.ts.
 * They are enforced here too so they cannot be skipped by calling the API
 * directly instead of using the signup form.
 */
const ALLOWED_EMAIL_DOMAIN = 'gmail.com';
const REG_NO_PREFIX = 'RA';
const DOMAIN_OPTIONS = [
  'Development',
  'Web3',
  'Cybersecurity',
  'PR and Management',
  'Content',
  'Creative',
];

export const register = asyncHandler(async (req, res) => {
  const { name, year, domain, password } = req.body;
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : req.body.email;
  const reg_no = typeof req.body.reg_no === 'string' ? req.body.reg_no.trim().toUpperCase() : req.body.reg_no;

  if (!name || !email || !reg_no || !year || !domain) {
    throw new AppError('Missing required fields: name, email, reg_no, year, domain', 400, 'VALIDATION_ERROR');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError('Invalid email format', 400, 'INVALID_EMAIL_FORMAT');
  }

  if (email.split('@')[1] !== ALLOWED_EMAIL_DOMAIN) {
    throw new AppError(
      `Only @${ALLOWED_EMAIL_DOMAIN} addresses are allowed. Please change your email.`,
      400,
      'INVALID_EMAIL_DOMAIN'
    );
  }

  if (!reg_no.startsWith(REG_NO_PREFIX)) {
    throw new AppError(
      `Registration number must start with ${REG_NO_PREFIX}.`,
      400,
      'INVALID_REG_NO'
    );
  }

  if (!DOMAIN_OPTIONS.includes(String(domain).trim())) {
    throw new AppError(
      `Please select a department from the list: ${DOMAIN_OPTIONS.join(', ')}.`,
      400,
      'INVALID_DOMAIN'
    );
  }

  const result = await authService.register({
    name,
    email,
    reg_no,
    year,
    domain: String(domain).trim(),
    password,
  });

  res.status(201).json({
    success: true,
    data: result
  });
});

export const setPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!password) {
    throw new AppError('Password is required', 400, 'VALIDATION_ERROR');
  }
  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters', 400, 'VALIDATION_ERROR');
  }
  if (!token) {
    throw new AppError('Token is required', 400, 'VALIDATION_ERROR');
  }

  await authService.setPassword(token, password);

  logAuditEvent({ action: AuditActions.PASSWORD_CHANGE, entity: 'User', entityId: '(set-password)', ip: req.ip });

  res.json({
    success: true,
    data: { message: "Password set successfully. You can now login." }
  });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new AppError('Verification token is required', 400, 'VALIDATION_ERROR');
  }

  await authService.verifyEmail(token);

  res.json({
    success: true,
    data: { message: "Email verified successfully. Please wait for admin approval." }
  });
});

export const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('Email is required', 400, 'VALIDATION_ERROR');
  }

  const result = await authService.requestPasswordReset(email);

  res.json({
    success: true,
    data: result
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Missing required fields: email, password', 400, 'VALIDATION_ERROR');
  }

  const result = await authService.login(email, password);

  logAuditEvent({ userId: result.user.id, action: AuditActions.LOGIN, entity: 'User', entityId: result.user.id, ip: req.ip });

  const cookieSecure = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';
  const cookieSameSite = process.env.COOKIE_SAME_SITE || 'lax';

  res.cookie('auth_token', result.accessToken, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    maxAge: 15 * 60 * 1000,
    path: '/',
  });

  res.cookie('refresh_token', result.refreshToken, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });

  // The access token is deliberately NOT in the body: it is already set as an
  // httpOnly cookie above. Returning it as well would expose it to any script
  // on the page, which is exactly what httpOnly exists to prevent.
  res.json({
    success: true,
    data: {
      user: result.user
    }
  });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const refreshTokenValue = req.cookies?.refresh_token;

  if (!refreshTokenValue) {
    throw new AppError('Refresh token required', 401, 'UNAUTHORIZED');
  }

  const result = await authService.refreshAccessToken(refreshTokenValue);

  logAuditEvent({ userId: result.user.id, action: AuditActions.TOKEN_REFRESH, entity: 'User', entityId: result.user.id, ip: req.ip });

  const cookieSecure = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';
  const cookieSameSite = process.env.COOKIE_SAME_SITE || 'lax';

  res.cookie('auth_token', result.accessToken, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    maxAge: 15 * 60 * 1000,
    path: '/',
  });

  res.cookie('refresh_token', result.refreshToken, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });

  res.json({
    success: true,
    data: { user: result.user }
  });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await authService.getUserById(req.user.id);

  res.json({
    success: true,
    data: { user }
  });
});

export const logout = asyncHandler(async (req, res) => {
  const tokenFromCookie = req.cookies?.auth_token;
  const authHeader = req.headers?.authorization;
  const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const tokenToRevoke = tokenFromCookie || tokenFromHeader;

  if (tokenToRevoke) {
    try {
      const { revokeJwt } = await import('../middleware/jwt.js');
      revokeJwt(tokenToRevoke);
    } catch (e) {
      console.error('Warning: failed to revoke token', e);
    }
  }

  const refreshTokenValue = req.cookies?.refresh_token;
  if (refreshTokenValue) {
    try {
      const { hashToken } = await import('../middleware/jwt.js');
      const tokenHash = hashToken(refreshTokenValue);
      const prisma = (await import('../db/db.js')).default;
      await prisma.refreshToken.updateMany({
        where: { token_hash: tokenHash, revoked: false },
        data: { revoked: true },
      });
    } catch (e) {
      console.error('Warning: failed to revoke refresh token', e);
    }
  }

  const cookieSecure = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';
  const cookieSameSite = process.env.COOKIE_SAME_SITE || 'lax';

  if (req.user) {
    logAuditEvent({ userId: req.user.id, action: AuditActions.LOGOUT, entity: 'User', entityId: req.user.id, ip: req.ip });
  }

  res.cookie('auth_token', '', { httpOnly: true, secure: cookieSecure, sameSite: cookieSameSite, maxAge: 0, path: '/' });
  res.cookie('refresh_token', '', { httpOnly: true, secure: cookieSecure, sameSite: cookieSameSite, maxAge: 0, path: '/api/auth' });

  res.json({
    success: true,
    data: { message: "Logged out successfully" }
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError('Current and new passwords are required', 400, 'VALIDATION_ERROR');
  }

  if (newPassword.length < 8) {
    throw new AppError('New password must be at least 8 characters', 400, 'VALIDATION_ERROR');
  }

  const result = await authService.changePassword(req.user.id, currentPassword, newPassword);

  logAuditEvent({ userId: req.user.id, action: AuditActions.PASSWORD_CHANGE, entity: 'User', entityId: req.user.id, ip: req.ip });

  res.json({
    success: true,
    data: result
  });
});


