import { apiGet } from './apiClient';

const query = (params) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== '' && v != null) q.set(k, v); });
  return q.toString() ? `?${q}` : '';
};

/** Totals, daily series, top pages and sources for the last `days` IST days (spec §11) */
export const getVisitSummary = (days) => apiGet(`/admin/visits/summary${query({ days })}`);

/** Recent visits, newest first; `signedIn=true` keeps only visits linked to an account */
export const getVisits = ({ page = 0, size = 25, email, signedIn, days } = {}) =>
  apiGet(`/admin/visits${query({ page, size, email, signedIn, days })}`);
