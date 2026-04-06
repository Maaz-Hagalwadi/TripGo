import { apiGet, apiPost } from './apiClient';

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
