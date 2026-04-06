import { apiGet } from './apiClient';

export const getRevenueReport = async () => {
  return apiGet('/operator/reports/revenue');
};
