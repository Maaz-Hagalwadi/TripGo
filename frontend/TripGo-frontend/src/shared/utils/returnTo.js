// Where to send a user after login: the page they were on before being asked to sign in.
// Passed as router state `{ returnTo: { pathname, state } }`; kept in sessionStorage across the
// Google OAuth round-trip, which leaves the SPA.

const STORAGE_KEY = 'tripgo_return_to';
const AUTH_PATHS = ['/login', '/register', '/operator-register', '/forgot-password', '/reset-password', '/oauth2/callback'];

/** Only same-app paths, never back into the auth pages. */
export const sanitizeReturnTo = (returnTo) => {
  const pathname = returnTo?.pathname;
  if (typeof pathname !== 'string' || !pathname.startsWith('/') || pathname.startsWith('//')) return null;
  if (AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`) || pathname.startsWith(`${p}?`))) return null;
  return { pathname, state: returnTo.state ?? null };
};

export const saveReturnToForOAuth = (returnTo) => {
  const safe = sanitizeReturnTo(returnTo);
  try {
    if (safe) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable — user just lands on their dashboard
  }
};

/** Reads and clears the value saved before an OAuth redirect. */
export const takeReturnToFromOAuth = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return raw ? sanitizeReturnTo(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};
