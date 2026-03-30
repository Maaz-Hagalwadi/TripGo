import { apiGet, apiPost, apiPut, apiDelete, API_BASE_URL } from './apiClient';

/**
 * Search available buses for a route.
 * @param {string} from - departure city name
 * @param {string} to - destination city name
 * @param {string} date - travel date (YYYY-MM-DD)
 * @returns {Promise<Array<{busName: string, busType: string, departureTime: string, arrivalTime: string, duration: string, price: number}>>}
 */
export const searchBuses = async (from, to, date) => {
  const response = await fetch(
    `${API_BASE_URL}/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}`
  );
  if (!response.ok) throw new Error('Failed to fetch buses');
  return response.json();
};

/**
 * Get all buses for the authenticated operator.
 * @returns {Promise<Array<{id: number, name: string, busCode: string, vehicleNumber: string, model: string, busType: string, totalSeats: number, active: boolean, amenities: Array}>>}
 */
export const getBuses = async () => {
  return apiGet('/operator/buses');
};

/**
 * Create a new bus.
 * @param {{name: string, busCode: string, vehicleNumber: string, model: string, busType: string, totalSeats: number, amenityIds: number[]}} busData
 * @returns {Promise<{id: number, name: string, busCode: string}>}
 */
export const createBus = async (busData) => {
  return apiPost('/operator/buses', busData);
};

/**
 * Update an existing bus.
 * @param {number} busId
 * @param {{name: string, busCode: string, vehicleNumber: string, model: string, busType: string, totalSeats: number, amenityIds: number[]}} busData
 * @returns {Promise<{id: number, name: string}>}
 */
export const updateBus = async (busId, busData) => {
  return apiPut(`/operator/buses/${busId}`, busData);
};

/**
 * Delete a bus by ID.
 * @param {number} busId
 * @returns {Promise<void>}
 */
export const deleteBus = async (busId) => {
  return apiDelete(`/operator/buses/${busId}`);
};
