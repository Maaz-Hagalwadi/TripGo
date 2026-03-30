import { API_BASE_URL } from '../config/env';

/**
 * Fetches the current user from /users/me and extracts their primary role.
 * @param {string} token
 * @returns {Promise<{user: object, role: string} | null>}
 */
export const fetchCurrentUser = async (token) => {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) return null;

  const data = await response.json();
  let primaryRole = null;
  if (data.roles?.length > 0) {
    if (data.roles.includes('ROLE_ADMIN')) primaryRole = 'ADMIN';
    else if (data.roles.includes('ROLE_OPERATOR')) primaryRole = 'OPERATOR';
    else if (data.roles.includes('ROLE_USER')) primaryRole = 'USER';
  }

  return { user: { ...data, role: primaryRole }, role: primaryRole };
};

/**
 * Logs in with email/phone and password.
 * @param {{ emailOrPhone: string, password: string }} credentials
 * @returns {Promise<{ accessToken: string, refreshToken: string } | { error: string }>}
 */
export const loginRequest = async (credentials) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (response.ok && data.accessToken && data.refreshToken) {
      return { accessToken: data.accessToken, refreshToken: data.refreshToken };
    }
    return { error: data.error || data.message || 'Login failed' };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') return { error: 'Request timed out. Please try again.' };
    return { error: 'Network error. Please try again.' };
  }
};

/**
 * Pings the backend health endpoint to keep the server warm on Render free tier.
 */
export const pingHealth = () => {
  fetch(`${API_BASE_URL}/health`).catch(() => {});
};
