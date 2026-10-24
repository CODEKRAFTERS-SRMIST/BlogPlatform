import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';

/**
 * One IPv6 customer usually holds an entire /64, so counting single
 * addresses there would let them step around any limit. Count the block.
 */
function normaliseIp(ip) {
  if (!ip) return 'unknown';
  // Express reports an IPv4 client on an IPv6 socket as ::ffff:1.2.3.4
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(ip);
  if (mapped) return mapped[1];
  if (!ip.includes(':')) return ip;
  return `${ip.split(':').slice(0, 4).join(':')}::/64`;
}

/**
 * Who a request is counted against.
 *
 * Counting per IP address does not work on this deployment. The browser
 * never talks to the API directly - every call arrives through the Next
 * proxy - so the address the server sees belongs to the proxy rather than
 * to the member. A college club compounds it: a great many people sit on
 * one campus WiFi and share a single public address between them. Counting
 * by address therefore pools strangers together, so one person's burst
 * spends everybody else's allowance and the limit protects nobody.
 *
 * A signed-in request is counted against the account it belongs to instead,
 * which stays the same whichever network it arrived from. The signature is
 * verified rather than merely decoded: an unchecked token would let anyone
 * invent user ids and mint themselves a fresh allowance per request. A
 * visitor with no session falls back to the address, which is all there is
 * to go on for somebody who has not signed in.
 */
function sessionOrIpKey(req) {
  const header = req.headers.authorization;
  const token =
    (header?.startsWith('Bearer ') ? header.slice(7) : null) ||
    req.cookies?.auth_token;

  if (token && process.env.JWT_SECRET) {
    try {
      // Expiry is ignored on purpose. This decides which bucket to count
      // against, not whether to let anybody in, and the signature still
      // proves whose token it is. Refreshing happens precisely when the
      // access token has just expired, so checking expiry here would push
      // every refresh back onto the shared proxy address - the one case
      // this key generator exists to avoid.
      const { id } = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
      if (id) return `user:${id}`;
    } catch {
      // Expired, forged, or signed with a different secret: fall through.
    }
  }

  return `ip:${normaliseIp(req.ip)}`;
}

function ipKey(req) {
  return normaliseIp(req.ip);
}

function message(text) {
  return { success: false, error: { message: text, code: 'RATE_LIMIT' } };
}

function onLimit(label) {
  return (req, res, next, options) => {
    logger.warn('Rate limit exceeded', { limiter: label, path: req.path });
    res.status(429).json(options.message);
  };
}

const base = { standardHeaders: true, legacyHeaders: false };

/**
 * Everything that reaches the API.
 *
 * 500 a quarter of an hour is per account, not per address, so how big the
 * club grows makes no difference to it. A member browsing hard makes
 * something like sixty calls in that time, which leaves this sitting about
 * eight times above normal use. It is here to stop a runaway script, not to
 * ration anybody.
 */
export const generalLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: 500,
  keyGenerator: sessionOrIpKey,
  message: message('Too many requests, please try again later'),
  handler: onLimit('general'),
});

/**
 * Sign-in attempts. Successful ones are not counted, so this only ever sees
 * wrong passwords and a whole club signing in at once costs it nothing.
 *
 * It stays keyed by address deliberately: there is no session to count
 * against yet, and the person worth slowing down is the one with no account
 * at all. 100 failures a quarter of an hour cuts guessing from roughly
 * 144,000 attempts a day to 9,600, while leaving far more room than a room
 * full of people fumbling their passwords will ever need.
 *
 * The real protection is not here. Five wrong passwords lock that one
 * account for fifteen minutes (see login in services/auth.service.js),
 * which is per person and so unbothered by a shared campus address.
 */
export const loginLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: ipKey,
  skipSuccessfulRequests: true,
  message: message('Too many login attempts, please try again after 15 minutes'),
  handler: onLimit('login'),
});

/**
 * New accounts. Sized for a recruitment drive: forty people signing up in
 * one room on one WiFi is an ordinary evening for a club, and this leaves
 * room for three times that. Abuse is cheap to absorb here anyway - an
 * account needs a unique email and registration number, and an admin has to
 * approve it before it can do anything at all.
 */
export const registrationLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  max: 150,
  keyGenerator: ipKey,
  message: message('Too many registration attempts, please try again after an hour'),
  handler: onLimit('registration'),
});

/**
 * The endpoints that take a token out of an email - setting a password,
 * verifying an address, asking for a reset - which had no limit at all.
 *
 * Not for the token's sake: those are 32 random bytes and no amount of
 * guessing finds one. It is the lookup that needs protecting. Neither token
 * column is indexed, so every attempt scans the whole user table, and
 * unlimited attempts mean unlimited scans against Neon.
 */
export const tokenLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  max: 50,
  keyGenerator: ipKey,
  message: message('Too many attempts, please try again later'),
  handler: onLimit('token'),
});

/**
 * Image uploads: up to 5 MB each, every one a write to R2. Counted per
 * account like the general limiter, and set well above what writing a post
 * needs.
 *
 * This replaces a second application of generalLimiter on the same route,
 * which only meant each upload was counted twice against the same budget.
 */
export const uploadLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  max: 40,
  keyGenerator: sessionOrIpKey,
  message: message('Too many uploads, please try again later'),
  handler: onLimit('upload'),
});
