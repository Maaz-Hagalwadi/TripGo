import { apiGet, apiPost, apiPostMultipart, apiPut } from './apiClient';

export const getCurrentUser = async () => {
  return apiGet('/users/me');
};

export const updateCurrentUser = async (data) => {
  return apiPut('/users/me', data);
};

export const uploadProfilePicture = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiPostMultipart('/users/me/profile-picture', formData);
};

export const changePassword = async (oldPassword, newPassword) => {
  return apiPost('/users/change-password', { oldPassword, newPassword });
};

export const logoutAllSessions = async () => {
  return apiPost('/users/logout-all', {});
};

export const submitSupportTicket = async (data) => {
  return apiPost('/support/ticket', data);
};
