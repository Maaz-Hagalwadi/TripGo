import { apiGet, apiPost, apiPut, apiPatch, apiDelete, API_BASE_URL } from './apiClient';

const FALLBACK_CITIES = [
  { id: 1, name: 'Mumbai' },
  { id: 2, name: 'Delhi' },
  { id: 3, name: 'Bangalore' },
  { id: 4, name: 'Pune' },
  { id: 5, name: 'Hyderabad' },
  { id: 6, name: 'Chennai' },
  { id: 7, name: 'Kolkata' },
  { id: 8, name: 'Ahmedabad' },
  { id: 9, name: 'Jaipur' },
  { id: 10, name: 'Surat' },
];

/**
 * Get all cities. Falls back to a static list if the endpoint is unavailable.
 * @returns {Promise<Array<{id: number, name: string}>>}
 */
export const getCities = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/cities`);
    if (!response.ok) return FALLBACK_CITIES;
    const data = await response.json();
    return data.length > 0 ? data : FALLBACK_CITIES;
  } catch {
    return FALLBACK_CITIES;
  }
};

/**
 * Create a new route.
 * @param {{name: string, origin: string, destination: string}} routeData
 * @returns {Promise<{id: number, name: string, origin: string, destination: string}>}
 */
export const createRoute = async (routeData) => {
  return apiPost('/operator/routes', routeData);
};

/**
 * Get all routes for the authenticated operator.
 * @returns {Promise<Array<{id: number, name: string, origin: string, destination: string, totalDistanceKm: number}>>}
 */
export const getRoutes = async () => {
  return apiGet('/operator/routes');
};

/**
 * Delete a route by ID.
 * @param {number} routeId
 * @returns {Promise<void>}
 */
export const deleteRoute = async (routeId) => {
  return apiDelete(`/operator/routes/${routeId}`);
};

/**
 * Add a segment to a route.
 * @param {number} routeId
 * @param {{fromStop: string, toStop: string, distanceKm: number, durationMinutes: number}} segmentData
 * @returns {Promise<{id: number, fromStop: string, toStop: string}>}
 */
export const addSegment = async (routeId, segmentData) => {
  return apiPost(`/operator/routes/${routeId}/segments`, segmentData);
};

/**
 * Get all segments for a route.
 * @param {number} routeId
 * @returns {Promise<Array<{id: number, fromStop: string, toStop: string, distanceKm: number, durationMinutes: number}>>}
 */
export const getRouteSegments = async (routeId) => {
  return apiGet(`/operator/routes/${routeId}/segments`);
};

/**
 * Recompute total distance for a route.
 * @param {number} routeId
 * @returns {Promise<{totalDistanceKm: number}>}
 */
export const recomputeDistance = async (routeId) => {
  return apiPatch(`/operator/routes/${routeId}/recompute-distance`);
};

/**
 * Add a fare to a route segment.
 * @param {number} routeId
 * @param {{segmentId: number, seatType: string, baseFare: number, gstPercent: number}} fareData
 * @returns {Promise<{id: number, seatType: string, baseFare: number}>}
 */
export const addFare = async (routeId, fareData) => {
  return apiPost(`/operator/routes/${routeId}/fares`, fareData);
};

/**
 * Create a schedule for a route.
 * @param {number} routeId
 * @param {{busId: number, departureTime: string, arrivalTime: string, frequency: string}} scheduleData
 * @returns {Promise<{id: number, departureTime: string, arrivalTime: string}>}
 */
export const createSchedule = async (routeId, scheduleData) => {
  return apiPost(`/operator/routes/${routeId}/schedule`, scheduleData);
};

/**
 * Get all schedules for the authenticated operator.
 * @returns {Promise<Array<{id: number, bus: object, departureTime: string, arrivalTime: string, frequency: string, active: boolean}>>}
 */
export const getAllSchedules = async () => {
  try {
    return await apiGet('/operator/schedules');
  } catch {
    return [];
  }
};

/**
 * Get schedules filtered by route ID.
 * @param {number} routeId
 * @returns {Promise<Array>}
 */
export const getRouteSchedules = async (routeId) => {
  const all = await getAllSchedules();
  return all.filter((s) => s.route?.id === routeId);
};

/**
 * Get a single schedule by ID.
 * @param {number} scheduleId
 * @returns {Promise<{id: number, bus: object, departureTime: string, arrivalTime: string}>}
 */
export const getSchedule = async (scheduleId) => {
  return apiGet(`/operator/schedules/${scheduleId}`);
};

/**
 * Delete a schedule by ID.
 * @param {number} scheduleId
 * @returns {Promise<void>}
 */
export const deleteSchedule = async (scheduleId) => {
  return apiDelete(`/operator/schedules/${scheduleId}`);
};
