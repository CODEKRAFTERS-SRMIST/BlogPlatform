import jwt from "jsonwebtoken";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

export function signJwt(payload, expiresIn = "15m") {
	if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not set in environment");
	return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

export function verifyJwt(token) {
	if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not set in environment");
	return jwt.verify(token, process.env.JWT_SECRET);
}

export function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getRefreshTokenExpiry() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

const revokedTokens = new Set();

export function revokeJwt(token) {
  if (!token) return;
  revokedTokens.add(token);
}

export function isRevoked(token) {
  return revokedTokens.has(token);
}
