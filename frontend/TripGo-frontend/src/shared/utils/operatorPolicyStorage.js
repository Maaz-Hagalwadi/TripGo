const STORAGE_KEY = 'tripgo_operator_schedule_policies';
export const OPERATOR_POLICY_STORAGE_EVENT = 'tripgo-operator-policy-updated';

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readStore = () => {
  if (!canUseStorage()) return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const writeStore = (data) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const getStoredSchedulePolicies = (scheduleId) => {
  if (!scheduleId) return null;
  const store = readStore();
  return store[String(scheduleId)] || null;
};

export const saveStoredSchedulePolicies = (scheduleId, policyData, metadata = {}) => {
  if (!scheduleId) return;
  const store = readStore();
  store[String(scheduleId)] = {
    ...policyData,
    scheduleId: String(scheduleId),
    routeId: metadata?.routeId ? String(metadata.routeId) : '',
    busId: metadata?.busId ? String(metadata.busId) : '',
    routeName: metadata?.routeName || '',
    busName: metadata?.busName || '',
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OPERATOR_POLICY_STORAGE_EVENT, { detail: { scheduleId: String(scheduleId) } }));
  }
};

export const listStoredSchedulePolicies = () => readStore();

export const getBestStoredSchedulePolicies = ({ scheduleId, routeId, busId } = {}) => {
  const store = readStore();
  const entries = Object.values(store || {});
  if (!entries.length) return null;

  const normalizedScheduleId = scheduleId ? String(scheduleId) : '';
  const normalizedRouteId = routeId ? String(routeId) : '';
  const normalizedBusId = busId ? String(busId) : '';

  const exactSchedule = normalizedScheduleId
    ? entries.find((entry) => String(entry?.scheduleId || '') === normalizedScheduleId)
    : null;
  if (exactSchedule) return exactSchedule;

  const byBus = normalizedBusId
    ? entries.find((entry) => String(entry?.busId || '') === normalizedBusId)
    : null;
  if (byBus) return byBus;

  const byRoute = normalizedRouteId
    ? entries.find((entry) => String(entry?.routeId || '') === normalizedRouteId)
    : null;
  if (byRoute) return byRoute;

  return null;
};
