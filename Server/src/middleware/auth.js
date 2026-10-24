import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
import { isRevoked } from './jwt.js';
import prisma from '../db/db.js';

/**
 * Optional authentication middleware
 * Validates JWT if present, but doesn't require it
 * Attaches decoded user to req.user { id, role, email } if valid token provided
 */
export function optionalAuth(req, res, next) {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }
  
  if (!token && process.env.USE_COOKIES === 'true') {
    token = req.cookies?.auth_token;
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (isRevoked(token)) {
      req.user = null;
      return next();
    }
    req.user = payload;
    next();
  } catch (err) {
    req.user = null;
    next();
  }
}

/**
 * Authentication middleware
 * Validates JWT from Authorization header (Bearer token) or HttpOnly cookie
 * Attaches decoded user to req.user { id, role, email }
 */
export function authenticate(req, res, next) {
  let token;

  // Try to get token from Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }
  
  // If not in header, try to get from cookie
  if (!token && process.env.USE_COOKIES === 'true') {
    token = req.cookies?.auth_token;
  }

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // reject tokens that have been revoked server-side
    if (isRevoked(token)) return res.status(401).json({ error: 'Invalid token' });
    req.user = payload; // { id, role, email }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
}

/**
 * Helper to create role-checking middleware
 * Usage: requireRole('admin') or requireRole(['admin', 'member'])
 * @param {string|string[]} allowedRoles - Role(s) allowed to access the route
 * @returns {Function} Express middleware
 */
/**
 * Loads the user's current role straight from the database.
 *
 * The JWT is a snapshot taken up to 15 minutes ago, so it cannot be trusted
 * for authorisation decisions: a user demoted a minute ago still carries a
 * token that says "admin". Permission is therefore always read fresh, which
 * also picks up promotions immediately.
 */
async function loadCurrentUser(req) {
  if (!req.user?.id) return null;
  const freshUser = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { role: true, is_super_admin: true, status: true },
  });
  if (!freshUser) return null;

  // Keep the request in step with what the database actually says
  req.user.role = freshUser.role;
  req.user.is_super_admin = freshUser.is_super_admin;
  req.user.status = freshUser.status;
  return freshUser;
}

/**
 * Refuses a request because of the account's standing, not its role.
 *
 * "You are not an admin" and "this account is no longer in good standing"
 * are different facts and need different screens: the first is a page
 * somebody should not have opened, the second means they should be signed
 * out and told why. Both used to come back as a bare "Forbidden", which the
 * browser could only turn into a generic error toast over a half-loaded
 * page.
 */
function denyForStanding(res, status) {
  const rejected = status === 'rejected';
  return res.status(403).json({
    success: false,
    error: {
      code: rejected ? 'ACCOUNT_REJECTED' : 'PENDING_APPROVAL',
      status,
      message: rejected
        ? 'This account has been rejected and can no longer be used.'
        : 'This account is waiting for an admin to approve it.',
    },
  });
}

export function requireRole(allowedRoles) {
  // Convert single role to array
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const forbidden = () =>
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `This action requires one of the following roles: ${roles.join(', ')}`,
        },
      });

    let freshUser;
    try {
      freshUser = await loadCurrentUser(req);
    } catch (dbErr) {
      // Deny rather than fall back to the token: trusting stale claims here is
      // exactly how a demoted admin keeps their powers.
      console.error("requireRole DB check failed:", dbErr);
      return res.status(503).json({
        error: "Service unavailable",
        message: "Could not verify your permissions. Please try again.",
      });
    }

    if (!freshUser) return forbidden();
    if (freshUser.status !== 'approved') return denyForStanding(res, freshUser.status);
    if (roles.includes(freshUser.role) || freshUser.is_super_admin) return next();

    return forbidden();
  };
}

/**
 * Super Admin check middleware
 * Restricts access strictly to Super Administrators (is_super_admin === true)
 */
export async function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  let freshUser;
  try {
    freshUser = await loadCurrentUser(req);
  } catch (err) {
    console.error("requireSuperAdmin DB check error:", err);
    return res.status(503).json({
      error: "Service unavailable",
      message: "Could not verify your permissions. Please try again.",
    });
  }

  if (freshUser && freshUser.status !== 'approved') {
    return denyForStanding(res, freshUser.status);
  }

  if (freshUser && freshUser.is_super_admin) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: {
      code: 'FORBIDDEN',
      message: "This action is restricted to Super Administrators only.",
    },
  });
}
