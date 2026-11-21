import { apiGet, apiPost } from './apiClient';

const toQuery = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
};

export const getOperatorBookings = async (status) => {
  return apiGet(`/operator/bookings${toQuery({ status })}`);
};

/** Bookings on one departure; `travelDate` (YYYY-MM-DD) narrows a recurring departure to one day. */
export const getScheduleBookings = async (scheduleId, travelDate) => {
  return apiGet(`/operator/schedules/${encodeURIComponent(scheduleId)}/bookings${toQuery({ travelDate })}`);
};

export const cancelOperatorBooking = async (bookingId, cancelReason) => {
  return apiPost(`/booking/${encodeURIComponent(bookingId)}/operator-cancel`, {
    reason: cancelReason,
  });
};
