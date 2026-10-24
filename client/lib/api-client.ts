import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30000,
});

// Authentication travels in an httpOnly cookie, which the browser attaches
// automatically because the API is same-origin (see NEXT_PUBLIC_API_URL=/api).
// Nothing is read from localStorage: a token there is readable by any script
// on the page, and it cannot be refreshed the way a cookie can.

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: any) => void; reject: (reason: any) => void }> = [];

function processQueue(error: any, token: any = null) {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

/**
 * Requests that must never trigger a token refresh.
 *
 * `/auth/me` is deliberately NOT on this list. It used to be, and that was the
 * bug behind the login/dashboard flicker: the access cookie lasts 15 minutes
 * while the refresh cookie lasts a week, so after fifteen minutes /auth/me
 * answered 401, the session was declared dead without anybody trying to renew
 * it, and every guarded page bounced to /login - which found the still-valid
 * refresh cookie and sent the user straight back.
 */
const NO_REFRESH = ['/auth/refresh', '/auth/login', '/auth/logout', '/auth/register'];

/** Pages that are already the place a signed-out visitor belongs. */
const AUTH_PAGES = ['/login', '/register', '/set-password', '/pending', '/forgot-password'];

/**
 * A failed refresh is announced once per page view.
 *
 * A dashboard fires several requests at once, so without this every one of
 * them would start its own redirect and they would fight each other.
 */
let signedOutAlready = false;

async function announceSignedOut(reason?: string) {
  if (typeof window === 'undefined' || signedOutAlready) return;
  signedOutAlready = true;

  // Let the React guards do the navigating. A router push keeps the app
  // mounted; assigning window.location here reloaded everything and was what
  // made the screen go black between bounces.
  try {
    const { notifySignedOut } = await import('./useAuth');
    notifySignedOut();
  } catch {
    // The store is unavailable (very early in a page's life); fall through to
    // the hard redirect below, which is still better than doing nothing.
  }

  const onAuthPage = AUTH_PAGES.some((p) => window.location.pathname.startsWith(p));
  if (onAuthPage) {
    // Already where a signed-out visitor should be. Navigating again is what
    // produced the loop.
    signedOutAlready = false;
    return;
  }

  const target = reason ? `/login?reason=${encodeURIComponent(reason)}` : '/login';
  window.setTimeout(() => {
    // Only if a page guard has not already moved us somewhere sensible.
    if (!AUTH_PAGES.some((p) => window.location.pathname.startsWith(p))) {
      window.location.replace(target);
    }
    signedOutAlready = false;
  }, 400);
}

/**
 * The account is no longer usable, as opposed to the session having lapsed.
 *
 * A lapsed session is answered by signing in again, so announceSignedOut
 * sends people to the login form. These two cannot be: signing in again
 * would be refused for the same reason, and the login form would leave them
 * staring at an error with no idea what to do. They go to the page that
 * explains the state they are actually in.
 */
async function announceAccountBlocked(status: 'rejected' | 'pending') {
  if (typeof window === 'undefined' || signedOutAlready) return;
  signedOutAlready = true;

  try {
    const { notifySignedOut } = await import('./useAuth');
    notifySignedOut();
  } catch {
    // As in announceSignedOut: fall through to the redirect.
  }

  if (window.location.pathname.startsWith('/pending')) {
    signedOutAlready = false;
    return;
  }

  window.setTimeout(() => {
    if (!window.location.pathname.startsWith('/pending')) {
      window.location.replace(`/pending?status=${status}`);
    }
    signedOutAlready = false;
  }, 400);
}

/** Called after a successful sign-in so a later 401 can redirect again. */
export function resetSignedOutLatch() {
  signedOutAlready = false;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    const url: string = originalRequest?.url || '';

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !NO_REFRESH.some((path) => url.includes(path))
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => apiClient(originalRequest));
      }

      isRefreshing = true;

      try {
        await apiClient.post('/auth/refresh');
        processQueue(null);
        signedOutAlready = false;
        return apiClient(originalRequest);
      } catch (refreshError: any) {
        const code = refreshError.response?.data?.error?.code;

        // Refresh tokens rotate: using one revokes it and issues the next. So
        // when two tabs hit an expired access token at the same moment, both
        // try to refresh, one wins, and the loser is told SESSION_REVOKED -
        // even though the session is perfectly alive, because the winner has
        // already installed a fresh cookie that both tabs share. Signing the
        // user out there logs them out of a working session, so ask the
        // server who we are before believing it. A genuinely revoked session
        // answers 401 here too, and still ends up signed out.
        if (code === 'SESSION_REVOKED' && typeof window !== 'undefined') {
          try {
            const check = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' });
            if (check.ok) {
              processQueue(null);
              return apiClient(originalRequest);
            }
          } catch {
            // Network failure - fall through and sign out as before.
          }
        }

        processQueue(refreshError);
        // The renewal now refuses an account that is not in good standing,
        // and that is not the same as a session running out.
        if (code === 'ACCOUNT_REJECTED' || code === 'PENDING_APPROVAL') {
          void announceAccountBlocked(code === 'ACCOUNT_REJECTED' ? 'rejected' : 'pending');
        }
        // A /auth/me that cannot be refreshed means "nobody is signed in",
        // which is a normal answer on a public page - the caller handles it.
        else if (!url.includes('/auth/me')) {
          void announceSignedOut(code === 'SESSION_REVOKED' ? 'role_changed' : undefined);
        } else {
          const { notifySignedOut } = await import('./useAuth');
          notifySignedOut();
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    /*
     * A 403 about the account rather than about the page.
     *
     * Nothing used to look at 403 at all - only 401 was handled - so a
     * refusal of this kind surfaced as a generic error toast over a
     * half-loaded dashboard, with every other request on the page failing
     * beside it. The server names the reason in error.code; anything else
     * (a genuine "you are not an admin") is still left to the caller.
     */
    if (error.response?.status === 403) {
      const code = (error.response.data as any)?.error?.code;
      if (code === 'ACCOUNT_REJECTED') void announceAccountBlocked('rejected');
      else if (code === 'PENDING_APPROVAL') void announceAccountBlocked('pending');
    }

    return Promise.reject(error);
  }
);

export default apiClient;
