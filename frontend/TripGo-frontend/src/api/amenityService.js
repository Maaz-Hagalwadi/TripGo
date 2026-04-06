import { apiGet, apiPost } from './apiClient';

/**
 * Get all available amenities.
 * @returns {Promise<Array<{id: number, code: string, description: string}>>}
 */
export const getAmenities = async () => {
  return apiGet('/amenities');
};

/**
 * Create a new amenity.
 * @param {string} code - amenity code e.g. 'WIFI'
 * @param {string} description - human readable label
 * @returns {Promise<{id: number, code: string, description: string}>}
 */
export const createAmenity = async (code, description) => {
  return apiPost('/amenities', { code, description });
};



