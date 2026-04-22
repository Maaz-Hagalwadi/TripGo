import { API_BASE_URL } from '../config/env';

export { API_BASE_URL };

// ─── Token helpers ────────────────────────────────────────────────────────────

const getTokenExpiry = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

const isTokenExpiringSoon = (token, bufferMs = 2 * 60 * 1000) => {
  const expiry = getTokenExpiry(token);
  if (!expiry) return false;
  return Date.now() >= expiry - bufferMs;
};

let refreshPromise = null; // deduplicate concurrent refresh calls

const refreshAccessToken = async () => {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
          if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
          scheduleProactiveRefresh(data.accessToken);
          return true;
        }
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
};

// ─── Proactive refresh scheduler ─────────────────────────────────────────────

let proactiveRefreshTimer = null;

export const scheduleProactiveRefresh = (token) => {
  if (proactiveRefreshTimer) clearTimeout(proactiveRefreshTimer);
  const expiry = getTokenExpiry(token);
  if (!expiry) return;
  const delay = expiry - Date.now() - 2 * 60 * 1000;
  if (delay <= 0) {
    refreshAccessToken();
    return;
  }
  proactiveRefreshTimer = setTimeout(() => refreshAccessToken(), delay);
};

// Kick off proactive refresh on page load if token exists
const existingToken = localStorage.getItem('accessToken');
if (existingToken) scheduleProactiveRefresh(existingToken);

/**
 * Parses error response into a readable message.
 * @param {Response} response
 * @returns {Promise<string>}
 */
const parseErrorMessage = async (response) => {
  try {
    const data = await response.json();
    return data.message || data.error || `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
};

const parseJsonIfPresent = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  const contentLength = response.headers.get('content-length');
  const hasJson = contentType.includes('application/json');
  const hasBody = contentLength !== '0';

  if (!hasJson || !hasBody) return null;

  try {
    return await response.json();
  } catch {
    return null;
  }
};

/**
 * Centralized fetch wrapper that handles:
 * - Auth headers
 * - 401 token refresh + retry
 * - 403 / 500 error handling
 * - Redirects to /login on auth failure
 *
 * @param {string} url
 * @param {RequestInit} options
 * @returns {Promise<Response>}
 */
export const fetchWithAuth = async (url, options = {}) => {
  let token = localStorage.getItem('accessToken');
  const lang = localStorage.getItem('tripgo_lang') || 'en';

  // Proactively refresh if token is expiring within 2 minutes
  if (token && isTokenExpiringSoon(token)) {
    await refreshAccessToken();
    token = localStorage.getItem('accessToken');
  }

  const buildHeaders = (t) => ({
    'Content-Type': 'application/json',
    'Accept-Language': lang,
    ...(t && { Authorization: `Bearer ${t}` }),
    ...options.headers,
  });

  let response = await fetch(url, { ...options, headers: buildHeaders(token) });

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newToken = localStorage.getItem('accessToken');
      response = await fetch(url, { ...options, headers: buildHeaders(newToken) });
    } else {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      return response;
    }
  }

  if (response.status === 403) {
    throw new Error('You do not have permission to perform this action.');
  }

  if (response.status >= 500) {
    const msg = await parseErrorMessage(response);
    throw new Error(msg || 'Server error. Please try again later.');
  }

  return response;
};

/**
 * Convenience method for authenticated GET requests.
 * @param {string} endpoint - path after API_BASE_URL
 * @returns {Promise<any>}
 */
export const apiGet = async (endpoint) => {
  const response = await fetchWithAuth(`${API_BASE_URL}${endpoint}`, { method: 'GET' });
  if (!response.ok) throw new Error(await parseErrorMessage(response));
  return response.json();
};

/**
 * Convenience method for authenticated POST requests.
 * @param {string} endpoint
 * @param {object} body
 * @returns {Promise<any>}
 */
export const apiPost = async (endpoint, body) => {
  const response = await fetchWithAuth(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await parseErrorMessage(response));
  return parseJsonIfPresent(response);
};

/**
 * Convenience method for authenticated PUT requests.
 * @param {string} endpoint
 * @param {object} body
 * @returns {Promise<any>}
 */
export const apiPut = async (endpoint, body) => {
  const response = await fetchWithAuth(`${API_BASE_URL}${endpoint}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await parseErrorMessage(response));
  return parseJsonIfPresent(response);
};

/**
 * Convenience method for authenticated PATCH requests.
 * @param {string} endpoint
 * @param {object} [body]
 * @returns {Promise<any>}
 */
export const apiPatch = async (endpoint, body) => {
  const response = await fetchWithAuth(`${API_BASE_URL}${endpoint}`, {
    method: 'PATCH',
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  if (!response.ok) throw new Error(await parseErrorMessage(response));
  return parseJsonIfPresent(response);
};

/**
 * Convenience method for authenticated DELETE requests.
 * @param {string} endpoint
 * @returns {Promise<void>}
 */
export const apiDelete = async (endpoint) => {
  const response = await fetchWithAuth(`${API_BASE_URL}${endpoint}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(await parseErrorMessage(response));
};
