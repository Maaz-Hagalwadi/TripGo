import { apiGet, apiPatch } from './apiClient';

const toQuery = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

export const getOperatorReviews = async ({ page = 0, size = 10 } = {}) => {
  return apiGet(`/operator/reviews${toQuery({ page, size })}`);
};

export const getOperatorBusReviews = async (busId, { page = 0, size = 10 } = {}) => {
  return apiGet(`/operator/buses/${encodeURIComponent(busId)}/reviews${toQuery({ page, size })}`);
};

export const getOperatorScheduleReviews = async (scheduleId, { page = 0, size = 10 } = {}) => {
  return apiGet(`/operator/schedules/${encodeURIComponent(scheduleId)}/reviews${toQuery({ page, size })}`);
};

export const getAdminReviews = async (params = {}) => {
  return apiGet(`/admin/reviews${toQuery(params)}`);
};

export const hideAdminReview = async (reviewId, reason) => {
  return apiPatch(`/admin/reviews/${encodeURIComponent(reviewId)}/hide`, { reason });
};

export const unhideAdminReview = async (reviewId) => {
  return apiPatch(`/admin/reviews/${encodeURIComponent(reviewId)}/unhide`);
};
