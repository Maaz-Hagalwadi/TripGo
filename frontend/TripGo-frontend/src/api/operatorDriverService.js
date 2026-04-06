import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from './apiClient';

export const getDrivers = async () => {
  return apiGet('/operator/drivers');
};

export const addDriver = async (data) => {
  return apiPost('/operator/drivers', data);
};

export const assignDriverToSchedule = async (scheduleId, driverId) => {
  return apiPatch(`/operator/drivers/assign/${scheduleId}`, { driverId });
};

export const updateDriver = async (driverId, data) => {
  return apiPut(`/operator/drivers/${driverId}`, data);
};

export const deleteDriver = async (driverId) => {
  return apiDelete(`/operator/drivers/${driverId}`);
};
