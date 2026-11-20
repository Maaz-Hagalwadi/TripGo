import { useEffect, useState } from 'react';
import { getBuses, getOperators } from '../../../api/adminService';

// Pending-approval counts for the sidebar badges, shared by every admin page and refreshed
// at most once a minute (or right after an approval via refreshPendingCounts).
const MAX_AGE_MS = 60000;
let cache = { at: 0, counts: null, inFlight: null };
const listeners = new Set();

export const refreshPendingCounts = () => {
  if (cache.inFlight) return cache.inFlight;
  cache.inFlight = Promise.all([getOperators('PENDING'), getBuses(false)])
    .then(([operators, buses]) => {
      cache = { at: Date.now(), inFlight: null, counts: {
        operators: Array.isArray(operators) ? operators.length : 0,
        buses: Array.isArray(buses) ? buses.length : 0,
      } };
      listeners.forEach((notify) => notify(cache.counts));
      return cache.counts;
    })
    .catch(() => { cache.inFlight = null; return cache.counts; });
  return cache.inFlight;
};

export const usePendingCounts = () => {
  const [counts, setCounts] = useState(cache.counts || {});
  useEffect(() => {
    listeners.add(setCounts);
    if (!cache.counts || Date.now() - cache.at > MAX_AGE_MS) refreshPendingCounts();
    return () => { listeners.delete(setCounts); };
  }, []);
  return counts;
};
