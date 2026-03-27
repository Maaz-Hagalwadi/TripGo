import { apiGet } from './apiClient';

/**
 * Get the currently authenticated user's profile.
 * @returns {Promise<{id: number, firstName: string, lastName: string, email: string, phone: string, roles: string[]}>}
 */
export const getCurrentUser = async () => {
  return apiGet('/users/me');
};
