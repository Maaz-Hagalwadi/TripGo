import { API_BASE_URL } from '../config/env';

export { API_BASE_URL };

/**
 * Attempts to refresh the access token using the stored refresh token.
 * @returns {Promise<boolean>} true if refresh succeeded, false otherwise
 */
const refreshAccessToken = async () => {
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
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
};

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
  const token = localStorage.getItem('accessToken');

  const buildHeaders = (t) => ({
    'Content-Type': 'application/json',
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
