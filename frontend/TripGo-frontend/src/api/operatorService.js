import { API_BASE_URL } from './apiClient';

export const getOperatorProfile = async () => {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_BASE_URL}/operators/profile`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      message = data?.message || data?.error || message;
    } catch {
      // keep fallback message
    }
    throw new Error(message);
  }

  const contentLength = res.headers.get('content-length');
  if (contentLength === '0') return null;
  return res.json().catch(() => null);
};

export const updateOperatorProfile = async (data) => {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_BASE_URL}/operators/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      message = body?.message || body?.error || message;
    } catch {
      // keep fallback message
    }
    throw new Error(message);
  }

  const contentLength = res.headers.get('content-length');
  if (contentLength === '0') return null;
  return res.json().catch(() => null);
};
