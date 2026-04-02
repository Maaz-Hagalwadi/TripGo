import { API_BASE_URL } from '../config/env';

const authHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export const getOperators = async (status = null) => {
  const url = status
    ? `${API_BASE_URL}/admin/operators?status=${status}`
    : `${API_BASE_URL}/admin/operators`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch operators');
  return res.json();
};

export const approveOperator = async (operatorId) => {
  const res = await fetch(`${API_BASE_URL}/admin/operators/${operatorId}/approve`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to approve operator');
  return res.json().catch(() => ({}));
};

export const rejectOperator = async (operatorId) => {
  const res = await fetch(`${API_BASE_URL}/admin/operators/${operatorId}/reject`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to reject operator');
  return res.json().catch(() => ({}));
};

export const suspendOperator = async (operatorId) => {
  const res = await fetch(`${API_BASE_URL}/admin/operators/${operatorId}/suspend`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to suspend operator');
  return res.json().catch(() => ({}));
};

export const getBuses = async (active = null) => {
  const url = active !== null
    ? `${API_BASE_URL}/admin/buses?active=${active}`
    : `${API_BASE_URL}/admin/buses`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch buses');
  return res.json();
};

export const approveBus = async (busId) => {
  const res = await fetch(`${API_BASE_URL}/admin/buses/${busId}/approve`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to approve bus');
  return res.json().catch(() => ({}));
};

export const rejectBus = async (busId) => {
  const res = await fetch(`${API_BASE_URL}/admin/buses/${busId}/reject`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to reject bus');
  return res.json().catch(() => ({}));
};

export const getUsers = async () => {
  const res = await fetch(`${API_BASE_URL}/admin/users`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
};
