import { apiGet, apiPost, apiPut, apiDelete, apiPatch, API_BASE_URL } from './apiClient';

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

/**
 * Get all seats for a bus.
 * @param {string|number} busId
 * @returns {Promise<Array<{id: string, seatNumber: string}>>}
 */
export const getBusSeats = async (busId) => {
  return apiGet(`/operator/buses/${busId}/seats`);
};

/**
 * Mark a seat with properties.
 * @param {string|number} busId
 * @param {string} seatId - UUID
 * @param {{isLadiesOnly?: boolean, isWindow?: boolean, isAisle?: boolean, isBlocked?: boolean}} marks
 * @returns {Promise<any>}
 */
export const markSeat = async (busId, seatId, marks) => {
  return apiPatch(`/operator/buses/${busId}/seats/${seatId}/mark`, marks);
};

export const generateLayout = async (busId, template, rows) => {
  return apiPost(`/operator/buses/${busId}/layout/generate`, { template, rows });
};
