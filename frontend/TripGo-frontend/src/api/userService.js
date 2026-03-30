import { apiGet, apiPut } from './apiClient';

export const getCurrentUser = async () => {
  return apiGet('/users/me');
};

export const updateCurrentUser = async (data) => {
  return apiPut('/users/me', data);
};
