import { apiGet, apiPost, apiPut, API_BASE_URL } from './apiClient';

export const getScheduleSeats = async (scheduleId) => {
  return apiGet(`/booking/schedules/${encodeURIComponent(scheduleId)}/seats`);
};

export const lockScheduleSeats = async (scheduleId, selectedSeats) => {
  return apiPost(`/booking/lock?scheduleId=${encodeURIComponent(scheduleId)}`, selectedSeats);
};

export const getSchedulePointsForBooking = async (scheduleId) => {
  try {
    const data = await apiGet(`/booking/schedules/${encodeURIComponent(scheduleId)}/points`);
    if (Array.isArray(data)) {
      return {
        boardingPoints: data.filter((p) => String(p.type || '').toUpperCase().includes('BOARD')),
        droppingPoints: data.filter((p) => String(p.type || '').toUpperCase().includes('DROP')),
      };
    }
    return {
      boardingPoints: Array.isArray(data?.boardingPoints) ? data.boardingPoints : [],
      droppingPoints: Array.isArray(data?.droppingPoints) ? data.droppingPoints : [],
    };
  } catch {
    try {
      const data = await apiGet(`/operator/schedules/${encodeURIComponent(scheduleId)}/points`);
      if (Array.isArray(data)) {
        return {
          boardingPoints: data.filter((p) => String(p.type || '').toUpperCase().includes('BOARD')),
          droppingPoints: data.filter((p) => String(p.type || '').toUpperCase().includes('DROP')),
        };
      }
      return {
        boardingPoints: Array.isArray(data?.boardingPoints) ? data.boardingPoints : [],
        droppingPoints: Array.isArray(data?.droppingPoints) ? data.droppingPoints : [],
      };
    } catch {
      return { boardingPoints: [], droppingPoints: [] };
    }
  }
};

const parsePublicJson = async (response, fallbackMessage) => {
  if (!response.ok) {
    try {
      const data = await response.json();
      throw new Error(data?.message || data?.error || fallbackMessage);
    } catch {
      throw new Error(fallbackMessage);
    }
  }
  return response.json();
};

export const getScheduleRouteStops = async (scheduleId) => {
  const response = await fetch(`${API_BASE_URL}/booking/schedules/${encodeURIComponent(scheduleId)}/route-stops`);
  return parsePublicJson(response, 'Failed to load route stops');
};

export const getSchedulePolicies = async (scheduleId) => {
  const response = await fetch(`${API_BASE_URL}/booking/schedules/${encodeURIComponent(scheduleId)}/policies`);
  return parsePublicJson(response, 'Failed to load schedule policies');
};

export const updateSchedulePolicies = async (scheduleId, payload) => {
  return apiPut(`/booking/schedules/${encodeURIComponent(scheduleId)}/policies`, payload);
};

export const getScheduleFeatures = async (scheduleId) => {
  const response = await fetch(`${API_BASE_URL}/booking/schedules/${encodeURIComponent(scheduleId)}/features`);
  return parsePublicJson(response, 'Failed to load schedule features');
};

export const getBusRatingSummary = async (busId) => {
  const response = await fetch(`${API_BASE_URL}/buses/${encodeURIComponent(busId)}/rating-summary`);
  return parsePublicJson(response, 'Failed to load bus rating summary');
};

export const getMyCompletedTrips = async () => {
  return apiGet('/booking/my-completed-trips');
};

export const submitTripRating = async (scheduleId, payload) => {
  return apiPost(`/booking/trips/${encodeURIComponent(scheduleId)}/rating`, payload);
};
