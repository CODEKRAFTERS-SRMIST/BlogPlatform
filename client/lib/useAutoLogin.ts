'use client';

/**
 * Auto-login hook - DISABLED
 * This was causing 400 errors on every page load by trying to login
 * with outdated credentials. Users now log in manually.
 */
export function useAutoLogin() {
  return true; // always returns "attempted" so components don't wait
}
