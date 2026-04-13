import { apiGet, apiPost, apiPut, API_BASE_URL } from './apiClient';

const withSeatQuery = (path, params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `${path}${path.includes('?') ? '&' : '?'}${qs}` : path;
};

export const getScheduleSeats = async (scheduleId, travelDate, from, to) => {
  return apiGet(withSeatQuery(`/booking/schedules/${encodeURIComponent(scheduleId)}/seats`, { travelDate, from, to }));
};

export const lockScheduleSeats = async (scheduleId, selectedSeats, travelDate, from, to) => {
  return apiPost(
    withSeatQuery(`/booking/lock?scheduleId=${encodeURIComponent(scheduleId)}`, { travelDate, from, to }),
    selectedSeats
  );
};

export const confirmBooking = async (payload) => {
  return apiPost('/booking/confirm', payload);
};

export const getMyBookings = async () => {
  return apiGet('/booking/my-bookings');
};

export const cancelMyBooking = async (bookingId, cancelReason) => {
  return apiPost(`/booking/${encodeURIComponent(bookingId)}/cancel`, {
    reason: cancelReason,
  });
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
