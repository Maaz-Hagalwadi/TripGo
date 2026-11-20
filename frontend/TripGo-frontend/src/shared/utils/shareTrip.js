import { toast } from 'sonner';
import { LIVE_SHARE_ENABLED } from '../constants/features';
import { createTripShareLink } from '../../api/travellerFeaturesService';

/**
 * Shares a trip via the device share sheet (WhatsApp, SMS…) or copies it to the clipboard.
 * With LIVE_SHARE_ENABLED, a public live-tracking link is added (spec §4).
 * `trip`: { bookingId, bookingCode, from, to, dateLabel, timeLabel, busName, boarding, seats }
 */
export const shareTrip = async (trip) => {
  let liveUrl = '';
  if (LIVE_SHARE_ENABLED && trip.bookingId) {
    try {
      liveUrl = (await createTripShareLink(trip.bookingId))?.url || '';
    } catch {
      // fall back to sharing the details only
    }
  }

  const lines = [
    `🚌 ${trip.from} → ${trip.to}`,
    [trip.dateLabel, trip.timeLabel && `departs ${trip.timeLabel}`].filter(Boolean).join(', '),
    trip.busName && `Bus: ${trip.busName}`,
    trip.boarding && `Boarding: ${trip.boarding}`,
    trip.seats && `Seat${trip.seats.includes(',') ? 's' : ''}: ${trip.seats}`,
    trip.bookingCode && `Booking: ${trip.bookingCode}`,
    liveUrl && `Track my bus live: ${liveUrl}`,
  ].filter(Boolean);
  const text = lines.join('\n');

  if (navigator.share) {
    try {
      await navigator.share({ title: `My TripGo trip: ${trip.from} → ${trip.to}`, text, ...(liveUrl ? { url: liveUrl } : {}) });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return; // user closed the share sheet
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Trip details copied — paste them into WhatsApp or a message.');
  } catch {
    toast.error('Couldn’t share automatically on this device.');
  }
};
