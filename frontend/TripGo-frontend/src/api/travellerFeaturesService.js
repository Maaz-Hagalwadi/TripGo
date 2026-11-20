import { apiGet, apiPost, apiPut, apiDelete, API_BASE_URL } from './apiClient';

// Endpoints for the traveller features in docs/backend-specs/traveller-features.md.
// Each feature is behind a flag in shared/constants/features.js until its backend exists.

/** Public: boarding & dropping points for a schedule (existing endpoint). */
export const getPublicSchedulePoints = async (scheduleId) => {
  const response = await fetch(`${API_BASE_URL}/booking/schedules/${encodeURIComponent(scheduleId)}/points`);
  if (!response.ok) throw new Error('Failed to load boarding points');
  const data = await response.json();
  return {
    boardingPoints: Array.isArray(data?.boardingPoints) ? data.boardingPoints : [],
    droppingPoints: Array.isArray(data?.droppingPoints) ? data.droppingPoints : [],
  };
};

// §5 Route alerts
export const getRouteAlerts = () => apiGet('/route-alerts');
export const createRouteAlert = (payload) => apiPost('/route-alerts', payload);
export const updateRouteAlert = (id, payload) => apiPut(`/route-alerts/${encodeURIComponent(id)}`, payload);
export const deleteRouteAlert = (id) => apiDelete(`/route-alerts/${encodeURIComponent(id)}`);

// §7 Wallet
export const getWallet = () => apiGet('/wallet');

// §8 Referrals
export const getMyReferral = () => apiGet('/referrals/me');

// §4 Live trip share
export const createTripShareLink = (bookingId) => apiPost(`/booking/${encodeURIComponent(bookingId)}/share`, {});
export const getSharedTrip = async (token) => {
  const response = await fetch(`${API_BASE_URL}/trip-share/${encodeURIComponent(token)}`);
  if (!response.ok) throw new Error(response.status === 404 ? 'This trip link has expired.' : 'Failed to load trip');
  return response.json();
};
