import { useEffect, useState } from 'react';
import { getPublicSchedulePoints } from '../../../api/travellerFeaturesService';
import { formatIstTime } from '../../../shared/utils/scheduleSearchUtils';
import { shareTrip } from '../../../shared/utils/shareTrip';
import BusTrackingMap from './BusTrackingMap';

const countdownLabel = (ms) => {
  if (ms <= 0) return 'Departing now';
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `Departs in ${mins} min`;
  const h = Math.floor(mins / 60);
  return `Departs in ${h}h ${mins % 60}m`;
};

const formatPointTime = (value) => {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '';
  const h = Number(match[1]);
  return `${String(h % 12 || 12).padStart(2, '0')}:${match[2]} ${h >= 12 ? 'PM' : 'AM'}`;
};

/**
 * Shown on the dashboard on the day of travel: countdown, boarding point & pickup time,
 * live tracking, ticket and sharing. Uses existing endpoints only.
 * `trip`: booking from /booking/my-bookings; `start`/`end`: resolved trip Dates; `ongoing`: bus has left.
 */
const TripDayCard = ({ trip, start, end, ongoing, onDownload, downloading }) => {
  const [now, setNow] = useState(() => Date.now());
  const [boardingPoint, setBoardingPoint] = useState(null);
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!trip.scheduleId) return undefined;
    let alive = true;
    getPublicSchedulePoints(trip.scheduleId)
      .then(({ boardingPoints }) => {
        if (!alive) return;
        const wanted = String(trip.fromStop || '').trim().toLowerCase();
        setBoardingPoint(boardingPoints.find((p) => String(p.name || '').trim().toLowerCase() === wanted) || boardingPoints[0] || null);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [trip.scheduleId, trip.fromStop]);

  const seats = (trip.passengers || []).map((p) => p.seatNumber).filter(Boolean);
  const boardingName = boardingPoint?.name || trip.fromStop || trip.from;
  const pickupTime = formatPointTime(boardingPoint?.arrivalTime) || formatIstTime(start);

  return (
    <section className="relative overflow-hidden rounded-2xl bg-primary text-white shadow-sm">
      <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-[#FF8A65]/20 blur-3xl" aria-hidden="true" />
      <div className="relative p-6 grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-center">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-bold text-[#FDBA74]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF8A65] animate-pulse" />
            {ongoing ? 'You’re on the way' : 'Today’s trip'}
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight">
            {trip.from} <span className="text-[#FDBA74]">→</span> {trip.to}
          </h2>
          <p className="mt-1 text-lg font-bold text-[#FDBA74]">
            {ongoing ? `Arriving around ${formatIstTime(end)}` : countdownLabel(start.getTime() - now)}
          </p>
          <p className="text-sm text-slate-300">{trip.busName}{seats.length ? ` · Seat${seats.length > 1 ? 's' : ''} ${seats.join(', ')}` : ''}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => setTracking(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FDBA74] to-[#FF8A65] px-4 py-2.5 text-sm font-extrabold text-primary hover:brightness-105 transition-all">
              <span className="material-symbols-outlined text-[18px]">share_location</span>
              Track bus
            </button>
            <button onClick={onDownload} disabled={downloading} className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-sm font-bold hover:bg-white/20 disabled:opacity-60 transition-colors">
              <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
              {downloading ? 'Downloading...' : 'Ticket'}
            </button>
            <button
              onClick={() => shareTrip({
                bookingId: trip.bookingId, bookingCode: trip.bookingCode, from: trip.from, to: trip.to,
                dateLabel: 'Today', timeLabel: formatIstTime(start), busName: trip.busName, boarding: boardingName, seats: seats.join(', '),
              })}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-sm font-bold hover:bg-white/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">share</span>
              Share trip
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-white/[0.06] border border-white/10 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 flex-shrink-0 rounded-lg bg-[#FDBA74]/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#FDBA74]">trip_origin</span>
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Boarding point</p>
              <p className="font-bold truncate">{boardingName}</p>
              <p className="text-xs text-slate-300">
                Pickup {pickupTime}{boardingPoint?.landmark ? ` · Near ${boardingPoint.landmark}` : ''}
              </p>
              {boardingPoint?.address && <p className="text-xs text-slate-400 mt-0.5">{boardingPoint.address}</p>}
            </div>
          </div>
          <p className="flex items-start gap-1.5 text-xs text-slate-300">
            <span className="material-symbols-outlined text-[16px] text-[#FDBA74]">tips_and_updates</span>
            Reach the boarding point 15 minutes early and keep your QR ticket handy.
          </p>
        </div>
      </div>

      {tracking && (
        <BusTrackingMap scheduleId={trip.scheduleId} routeFrom={trip.from} routeTo={trip.to} onClose={() => setTracking(false)} />
      )}
    </section>
  );
};

export default TripDayCard;
