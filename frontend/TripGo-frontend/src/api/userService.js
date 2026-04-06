import { apiGet, apiPost, apiPut } from './apiClient';

export const getCurrentUser = async () => {
  return apiGet('/users/me');
};

export const updateCurrentUser = async (data) => {
  return apiPut('/users/me', data);
};

export const changePassword = async (oldPassword, newPassword) => {
  return apiPost('/users/change-password', { oldPassword, newPassword });
};

export const logoutAllSessions = async () => {
  return apiPost('/users/logout-all', {});
};
