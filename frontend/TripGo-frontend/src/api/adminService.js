import { apiGet, apiPost } from './apiClient';

export const getOperators = async (status = null) => {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiGet(`/admin/operators${query}`);
};

export const approveOperator = async (operatorId) => {
  return apiPost(`/admin/operators/${operatorId}/approve`, {});
};

export const rejectOperator = async (operatorId) => {
  return apiPost(`/admin/operators/${operatorId}/reject`, {});
};

export const suspendOperator = async (operatorId) => {
  return apiPost(`/admin/operators/${operatorId}/suspend`, {});
};

export const getBuses = async (active = null) => {
  const query = active !== null ? `?active=${active}` : '';
  return apiGet(`/admin/buses${query}`);
};

export const approveBus = async (busId) => {
  return apiPost(`/admin/buses/${busId}/approve`, {});
};

export const rejectBus = async (busId) => {
  return apiPost(`/admin/buses/${busId}/reject`, {});
};

export const getUsers = async () => {
  return apiGet('/admin/users');
};
