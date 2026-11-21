import { formatIstTime, onTravelDate, toIstYmd, TRIP_TIME_ZONE } from '../../../shared/utils/scheduleSearchUtils';

export const rupees = (v) => `₹${Math.round(Number(v || 0)).toLocaleString('en-IN')}`;

export const prettyType = (value) => String(value || '')
  .toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  .replace(/\bAc\b/g, 'AC').replace(/\bNon Ac\b/g, 'Non-AC');

export const istDate = (value, opts = {}) => {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TRIP_TIME_ZONE, ...opts })
    : '—';
};

export const istDateTime = (value) => {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: TRIP_TIME_ZONE })
    : '—';
};

export const istTime = (value) => formatIstTime(value);
export const todayIst = () => toIstYmd(new Date());

/** A booking's real departure: its travel date at the schedule's time of day (recurring schedules). */
export const bookingDeparture = (b) => {
  const dep = b?.departureTime || b?.schedule?.departureTime;
  if (!dep) return null;
  return (b?.travelDate && onTravelDate(b.travelDate, dep)) || new Date(dep);
};

export const passengerName = (p) => [p?.firstName, p?.lastName].filter(Boolean).join(' ').trim();

/** One entry per seat with its passenger (the top-level `passengers` list has no seat numbers). */
export const bookingTravellers = (b) => (Array.isArray(b?.seats) && b.seats.length
  ? b.seats.map((s) => ({ ...(s.passenger || {}), seatNumber: s.seatNumber, fromStop: s.fromStop, toStop: s.toStop }))
  : (Array.isArray(b?.passengers) ? b.passengers : []));

export const FREQUENCY_LABEL = { DAILY: 'Daily', WEEKDAYS: 'Weekdays', WEEKENDS: 'Weekends', WEEKLY: 'Weekly', ONCE: 'One trip' };

export const TRIP_STATUS = {
  SCHEDULED: { label: 'Scheduled', tone: 'blue' },
  STARTED: { label: 'On the way', tone: 'peach' },
  DELAYED: { label: 'Delayed', tone: 'amber' },
  COMPLETED: { label: 'Completed', tone: 'slate' },
  CANCELLED: { label: 'Cancelled', tone: 'red' },
};

/** "2026-11-21" + "20:00" (IST wall clock) → ISO instant. */
export const istToIso = (ymd, hm) => new Date(`${ymd}T${hm}:00+05:30`).toISOString();

/** ISO instant → { date: 'YYYY-MM-DD', time: 'HH:mm' } on the IST wall clock, for date/time inputs. */
export const isoToIst = (value) => {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return { date: '', time: '' };
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: TRIP_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(d).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
};

export const minutesLabel = (mins) => {
  const m = Math.round(Number(mins) || 0);
  if (m <= 0) return '—';
  const h = Math.floor(m / 60);
  return h ? `${h}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`;
};

/** "21:30" → "9:30 PM" */
export const clockLabel = (hm) => {
  const [h, m] = String(hm || '').split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return '—';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

/** Fare seat types must equal the seats' own types (berths LOWER / UPPER, seats SEATER) so each seat finds its price. */
export const fareSeatTypesFor = (busType) => {
  const t = String(busType || '').toUpperCase();
  return t.includes('SLEEPER') && !t.includes('SEMI') ? ['LOWER', 'UPPER'] : ['SEATER'];
};

export const SEAT_TYPE_LABEL = { LOWER: 'Lower berth', UPPER: 'Upper berth', SEATER: 'Seat' };

/** How early before departure a trip can be started (the backend enforces the same window). */
export const START_WINDOW_MS = 2 * 60 * 60 * 1000;
