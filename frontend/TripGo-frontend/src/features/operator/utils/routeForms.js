import { isoToIst, istToIso } from './operatorFormat';

export const FREQUENCIES = [
  ['DAILY', 'Every day'],
  ['WEEKDAYS', 'Mon – Fri'],
  ['WEEKENDS', 'Sat & Sun'],
  ['WEEKLY', 'Once a week'],
  ['ONCE', 'One trip'],
];

export const INPUT = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-slate-50 disabled:text-slate-500';
export const LABEL = 'block text-xs font-bold text-slate-600 mb-1.5';

export const emptyDeparture = (busId = '') => ({ busId, depDate: '', depTime: '', arrDate: '', arrTime: '', frequency: 'DAILY', arrivalEdited: false });

export const departureFromSchedule = (s) => {
  const dep = isoToIst(s.departureTime);
  const arr = isoToIst(s.arrivalTime);
  return { busId: String(s.bus?.id || s.busId || ''), depDate: dep.date, depTime: dep.time, arrDate: arr.date, arrTime: arr.time, frequency: s.frequency || 'ONCE', arrivalEdited: true };
};

/** IST wall-clock date/time plus `minutes`, as IST wall-clock date/time. */
export const addMinutesIst = (ymd, hm, minutes) => isoToIst(new Date(new Date(istToIso(ymd, hm)).getTime() + minutes * 60000));

export const departureMinutes = (v) => {
  if (!v.depDate || !v.depTime || !v.arrDate || !v.arrTime) return 0;
  return Math.round((new Date(istToIso(v.arrDate, v.arrTime)) - new Date(istToIso(v.depDate, v.depTime))) / 60000);
};

export const departureError = (v, { requireFuture = true } = {}) => {
  if (!v.busId) return 'Choose the bus for this departure';
  if (!v.depDate || !v.depTime) return 'Add the departure date and time';
  if (!v.arrDate || !v.arrTime) return 'Add the arrival date and time';
  const mins = departureMinutes(v);
  if (mins <= 0) return 'Arrival must be after departure';
  if (mins > 72 * 60) return 'A trip can’t be longer than 72 hours — check the arrival date';
  if (requireFuture && new Date(istToIso(v.depDate, v.depTime)) <= new Date()) return 'The departure must be in the future';
  return '';
};

export const departurePayload = (v) => ({
  busId: v.busId,
  departureTime: istToIso(v.depDate, v.depTime),
  arrivalTime: istToIso(v.arrDate, v.arrTime),
  frequency: v.frequency,
});

export const emptyPoint = (type, patch = {}) => ({ type, name: '', arrivalTime: '', landmark: '', address: '', ...patch });

export const pointError = (p) => {
  if (!String(p.name || '').trim()) return 'Add the point’s name';
  if (!/^\d{2}:\d{2}/.test(p.arrivalTime || '')) return 'Add the time the bus reaches this point';
  return '';
};

export const pointPayload = (p) => ({
  type: p.type,
  name: p.name.trim(),
  arrivalTime: String(p.arrivalTime).slice(0, 5),
  landmark: p.landmark?.trim() || null,
  address: p.address?.trim() || null,
});

const clockMinutes = (hm) => { const [h, m] = String(hm || '').split(':').map(Number); return (h || 0) * 60 + (m || 0); };

/** Points in the order the bus reaches them, counting from the departure time (overnight trips wrap midnight). */
export const sortPoints = (list, departureHm = '00:00') => {
  const start = clockMinutes(departureHm);
  const key = (p) => (clockMinutes(p.arrivalTime) - start + 1440) % 1440;
  return [...list].sort((a, b) => key(a) - key(b));
};

export const toList = (d) => (Array.isArray(d) ? d : Array.isArray(d?.content) ? d.content : Array.isArray(d?.data) ? d.data : []);
