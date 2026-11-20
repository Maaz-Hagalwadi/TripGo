import { TRIP_TIME_ZONE } from '../../../shared/utils/scheduleSearchUtils';

export const CHECKOUT_STEPS = ['Seats', 'Boarding', 'Passengers', 'Payment'];

export const formatCountdown = (seconds) => {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
};

export const formatTripDay = (instant) => {
  const d = instant ? new Date(instant) : null;
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TRIP_TIME_ZONE })
    : '';
};
