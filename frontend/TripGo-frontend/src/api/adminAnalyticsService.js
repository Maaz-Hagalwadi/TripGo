import { apiGet } from './apiClient';

export const getAdminAnalytics = () => apiGet('/admin/analytics');

export const getAuditLogs = ({ page = 0, size = 50, action, entityType, actorEmail } = {}) => {
  const params = new URLSearchParams({ page, size });
  if (action)      params.set('action', action);
  if (entityType)  params.set('entityType', entityType);
  if (actorEmail)  params.set('actorEmail', actorEmail);
  return apiGet(`/admin/audit-logs?${params.toString()}`);
};
