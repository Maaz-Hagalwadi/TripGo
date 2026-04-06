import { apiGet, apiPatch } from './apiClient';

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

export const cancelOperatorBooking = async (bookingId) => {
  return apiPatch(`/operator/bookings/${bookingId}/cancel`);
};
