import { useEffect, useReducer, useCallback } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  role?: string;
  is_super_admin?: boolean;
  status?: string;
}

/**
 * One shared session for the whole app.
 *
 * Each call to useAuth used to own its state, so a page made of a sidebar, a
 * modal and two sections fired four identical /auth/me requests on load (the
 * repeated 401s in the console) and could briefly disagree with itself about
 * who is signed in. The session now lives in a single module-level store that
 * every hook subscribes to, and callers that arrive while a request is in
 * flight share that request instead of starting another.
 *
 * Nothing below mutates the store outside an effect or an event handler, so
 * server rendering never touches it and one visitor's session can never leak
 * into another's.
 */
interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  loading: boolean;
}

const REFRESH_AFTER_MS = 30_000;

let state: AuthState = { user: null, isLoggedIn: false, loading: true };
let inFlight: Promise<User | null> | null = null;
let lastFetchedAt = 0;
const listeners = new Set<() => void>();

function publish(next: Partial<AuthState>) {
  state = { ...state, ...next };
  listeners.forEach((notify) => notify());
}

function loadUser(): Promise<User | null> {
  if (inFlight) return inFlight;

  const request = (async () => {
    try {
      const { apiClient } = await import('./api-client');
      const response = await apiClient.get('/auth/me');
      const userData: User | null =
        response.data?.data?.user || response.data?.user || null;
      publish({ user: userData, isLoggedIn: Boolean(userData), loading: false });
      return userData;
    } catch {
      // A 401 here just means "not signed in", which is a normal answer.
      publish({ user: null, isLoggedIn: false, loading: false });
      return null;
    } finally {
      lastFetchedAt = Date.now();
      inFlight = null;
    }
  })();

  inFlight = request;
  return request;
}

/**
 * Tells the shared store that a sign-in just happened on this tab.
 *
 * Signing in has to be announced, because the store remembers the answer to
 * "who is signed in?" and would otherwise keep serving the "nobody" it learned
 * on the login page. A protected page mounting straight after login would read
 * that stale "nobody", bounce to /login, which would see the fresh cookie and
 * bounce back - a redirect loop. Every successful login calls this.
 */
export function publishAuthUser(userData: User) {
  lastFetchedAt = Date.now();
  publish({ user: userData, isLoggedIn: true, loading: false });
}

/** Forces a fresh /auth/me, ignoring what the store already holds. */
export function refreshAuth(): Promise<User | null> {
  return loadUser();
}

/**
 * Tells the shared store the session is gone, without a network round trip.
 *
 * The API layer calls this when a refresh attempt fails, so the page guards
 * notice through React and redirect with the router. Before this existed the
 * interceptor set `window.location.href` itself, which reloaded the whole
 * app - the black flash - and raced with the login page's own redirect back
 * to the dashboard, so the two bounced off each other.
 */
export function notifySignedOut() {
  lastFetchedAt = Date.now();
  inFlight = null;
  publish({ user: null, isLoggedIn: false, loading: false });
}

/**
 * Where a signed-in account belongs.
 *
 * The navbar's Dashboard link and the login page's redirect both have to
 * answer this, and they have to answer it identically: if the link sent an
 * admin to /platform while the guard there sent them to /admin/dashboard,
 * the two would bounce the user between them. One function, one answer.
 */
export function homeFor(
  u: { role?: string; is_super_admin?: boolean; status?: string } | null,
): string {
  if (!u) return '/login';
  if (u.is_super_admin || u.role === 'admin') return '/admin/dashboard';
  if (u.status === 'pending') return '/pending';
  return '/platform';
}

/** What the store currently believes, for code outside React. */
export function getAuthSnapshot(): AuthState {
  return state;
}

export function useAuth() {
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    listeners.add(rerender);
    return () => {
      listeners.delete(rerender);
    };
  }, [rerender]);

  /*
   * Checks on mount whether what the store holds has gone stale.
   *
   * It used to ask the network only on the very first mount, so the answer
   * fetched at sign-in was kept for the rest of the visit. A member promoted
   * to admin therefore went on being shown a member's dock until they
   * reloaded the page - the server knew, every protected route read the role
   * fresh from the database, and only the browser was still repeating what it
   * had been told at login.
   *
   * Moving between pages now re-asks, at most once every REFRESH_AFTER_MS,
   * and callers arriving together share the one request. A promotion shows up
   * on the next navigation rather than the next reload.
   *
   * Only for somebody who is signed in. A visitor who is not has nothing to
   * re-check - they would just be asking a question already answered with a
   * 401 on every page they open - and a sign-in elsewhere announces itself
   * through publishAuthUser or the auth_changed key.
   */
  useEffect(() => {
    const stale = Date.now() - lastFetchedAt > REFRESH_AFTER_MS;
    if (state.loading || (state.isLoggedIn && stale)) {
      loadUser();
    }
  }, []);

  useEffect(() => {
    const handleVisible = () => {
      if (
        document.visibilityState === 'visible' &&
        Date.now() - lastFetchedAt > REFRESH_AFTER_MS
      ) {
        loadUser();
      }
    };
    // Another tab signing in or out writes this key.
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'auth_changed') loadUser();
    };
    document.addEventListener('visibilitychange', handleVisible);
    window.addEventListener('storage', handleStorage);
    return () => {
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const login = useCallback((userData: User) => {
    publish({ user: userData, isLoggedIn: true, loading: false });
  }, []);

  const logout = useCallback(() => {
    publish({ user: null, isLoggedIn: false, loading: false });
    try {
      sessionStorage.removeItem('hasVisited');
      localStorage.removeItem('auth_token'); // left over from older builds
      localStorage.setItem('auth_changed', String(Date.now()));
    } catch {
      // private browsing can refuse storage; signing out still worked
    }
  }, []);

  const refreshUser = useCallback(() => loadUser(), []);

  return {
    user: state.user,
    isLoggedIn: state.isLoggedIn,
    loading: state.loading,
    login,
    logout,
    refreshUser,
  };
}
