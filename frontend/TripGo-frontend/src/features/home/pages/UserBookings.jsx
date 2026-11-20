import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import UserLayout from '../../../shared/components/UserLayout';
import { cancelMyBooking, getMyBookings, downloadTicketFromApi, viewTicketFromApi, getSchedulePolicies } from '../../../api/bookingService';
import UserRescheduleModal from '../components/UserRescheduleModal';
import BusTrackingMap from '../components/BusTrackingMap';
import { getMyCompletedTrips, submitTripRating } from '../../../api/reviewService';
import { ROUTES } from '../../../shared/constants/routes';
import { formatIstDateTime, formatIstTime, onTravelDate, toIstYmd, TRIP_TIME_ZONE } from '../../../shared/utils/scheduleSearchUtils';
import { localDateString } from '../../../shared/utils/date';
import PaginationControls from '../../../shared/components/ui/PaginationControls';
import { shareTrip } from '../../../shared/utils/shareTrip';
import { WALLET_ENABLED } from '../../../shared/constants/features';

const PAYMENT_STORAGE_KEY = 'tripgo_pending_payment';
// Matches BookingExpiryService.PAYMENT_WINDOW: unpaid bookings are cancelled this long after creation
const PAYMENT_WINDOW_MS = 20 * 60000;
const REVIEW_PROMPT_STORAGE_KEY = 'tripgo_last_review_prompt';
const PAGE_SIZE = 10;

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.bookings)) return data.bookings;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const formatDateTime = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return formatIstDateTime(value);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: TRIP_TIME_ZONE,
  }).format(date);
};

const getBookingTimestamp = (booking) => {
  const value = booking?.bookedAt || booking?.createdAt || booking?.bookingTime || booking?.departureTime;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const getTimestampMinuteBucket = (booking) => {
  const timestamp = getBookingTimestamp(booking);
  return timestamp ? Math.floor(timestamp / 60000) : 0;
};

const getBookingIdentity = (booking) => String(
  booking?.bookingCode ||
  booking?.publicBookingId ||
  booking?.bookingId ||
  booking?.id ||
  booking?.reference ||
  booking?.paymentIntentId ||
  ''
).trim();

const getStatusRank = (status) => {
  const upper = String(status || '').toUpperCase();
  if (upper === 'CONFIRMED') return 4;
  if (upper === 'PAYMENT_SUCCESSFUL') return 3;
  if (upper === 'PAYMENT_RECEIVED') return 3;
  if (upper === 'PENDING') return 2;
  if (upper === 'CANCELLED') return 1;
  return 0;
};

const getPendingPayment = () => {
  try {
    const raw = localStorage.getItem(PAYMENT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// The stored checkout is written when the payment page opens; `paid` is set only once Stripe succeeds
const buildOptimisticBookingFromPendingPayment = (pendingPayment) => {
  if (!pendingPayment?.paid) return null;

  const bookingState = pendingPayment?.bookingState || {};
  const passengers = Array.isArray(bookingState?.passengers) ? bookingState.passengers : [];
  const selectedSeats = Array.isArray(bookingState?.selectedSeats) ? bookingState.selectedSeats : [];

  return {
    id: pendingPayment?.bookingId || pendingPayment?.paymentIntentId || `pending-${pendingPayment?.lockToken || Date.now()}`,
    bookingId: pendingPayment?.bookingId || '',
    bookingCode: pendingPayment?.bookingCode || '',
    paymentIntentId: pendingPayment?.paymentIntentId || '',
    scheduleId: pendingPayment?.scheduleId || bookingState?.scheduleId || bookingState?.bus?.scheduleId || '',
    from: bookingState?.searchParams?.from || '',
    to: bookingState?.searchParams?.to || '',
    busName: bookingState?.bus?.busName || bookingState?.bus?.name || '',
    selectedType: bookingState?.selectedType || '',
    seatNumbers: selectedSeats,
    passengers: passengers.map((passenger) => {
      const parts = String(passenger?.name || '').trim().split(/\s+/).filter(Boolean);
      return {
        seatNumber: passenger?.seatNumber || '',
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' '),
        age: passenger?.age,
        gender: passenger?.gender,
        phone: passenger?.phone,
      };
    }),
    payableAmount: Number(pendingPayment?.payableAmount ?? 0),
    totalAmount: Number(pendingPayment?.totalAmount ?? pendingPayment?.payableAmount ?? 0),
    amount: Number(pendingPayment?.payableAmount ?? 0),
    createdAt: pendingPayment?.createdAt || new Date().toISOString(),
    bookedAt: pendingPayment?.createdAt || new Date().toISOString(),
    status: 'PAYMENT_SUCCESSFUL',
    __optimistic: true,
  };
};

const isPendingPaymentMatch = (booking, pendingPayment) => {
  if (!pendingPayment) return false;
  const bookingIds = [
    booking?.bookingCode,
    booking?.publicBookingId,
    booking?.bookingId,
    booking?.id,
    booking?.reference,
    booking?.paymentIntentId,
  ].filter(Boolean).map(String);
  const pendingIds = [
    pendingPayment?.bookingCode,
    pendingPayment?.bookingId,
    pendingPayment?.paymentIntentId,
  ].filter(Boolean).map(String);
  return pendingIds.some((id) => bookingIds.includes(id));
};

const getDisplayStatus = (booking, pendingPayment) => {
  const rawStatus = String(booking?.status || 'CONFIRMED').toUpperCase();
  const paymentStatus = String(booking?.paymentStatus || '').toUpperCase();

  if (rawStatus === 'PENDING' && pendingPayment?.paid && isPendingPaymentMatch(booking, pendingPayment)) {
    return 'PAYMENT_SUCCESSFUL';
  }

  if (rawStatus === 'PENDING' && paymentStatus === 'SUCCESS') {
    return 'PAYMENT_RECEIVED';
  }

  return rawStatus;
};


const RefundTimeline = ({ booking }) => {
  const refundStatus = String(booking?.refundStatus || 'NA').toUpperCase();
  const refundAmount = Number(booking?.refundAmount ?? 0);
  if (refundAmount === 0 || refundStatus === 'NA') {
    return (
      <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400">
        <span className="material-symbols-outlined text-[13px]">info</span>
        No refund applicable for this cancellation
      </div>
    );
  }
  const steps = [
    { label: 'Cancelled',        done: true,                        icon: 'cancel' },
    { label: 'Refund Initiated', done: refundStatus !== 'NA',       icon: 'currency_rupee' },
    { label: 'Refunded',         done: refundStatus === 'PROCESSED', icon: 'check_circle' },
  ];
  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
        Refund ₹{refundAmount.toLocaleString()} · Status
      </p>
      <div className="flex items-center gap-0">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? (i === 2 ? 'bg-emerald-500' : 'bg-[#002046]') : 'bg-slate-200'}`}>
                <span className={`material-symbols-outlined text-[12px] ${step.done ? 'text-white' : 'text-slate-400'}`}>{step.icon}</span>
              </div>
              <span className={`text-[9px] font-semibold text-center leading-tight w-16 ${step.done ? (i === 2 ? 'text-emerald-600' : 'text-[#002046]') : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mb-4 mx-1 ${steps[i + 1].done ? 'bg-[#002046]' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>
      {refundStatus === 'PENDING' && (
        <p className="text-[10px] text-amber-600 mt-1.5 flex items-center gap-1">
          <span className="material-symbols-outlined text-[12px]">schedule</span>
          Refund typically takes 5–7 business days
        </p>
      )}
    </div>
  );
};

const getCancelledByLabel = (cancelledBy) => {
  const upper = String(cancelledBy || '').toUpperCase();
  if (!upper) return '';
  if (upper === 'USER') return 'You';
  if (upper === 'OPERATOR') return 'The operator';
  if (upper === 'SYSTEM') return 'TripGo';
  return upper;
};


const getDepartureValue = (booking) => (
  booking?.departureTime ||
  booking?.travelDate ||
  booking?.schedule?.departureTime ||
  booking?.scheduledDepartureTime ||
  null
);

const getTravelDateKey = (booking) => {
  const explicitTravelDate = String(booking?.travelDate || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(explicitTravelDate)) return explicitTravelDate;

  const departureValue = booking?.departureTime || booking?.schedule?.departureTime || booking?.scheduledDepartureTime;
  const departure = departureValue ? new Date(departureValue) : null;
  if (!departure || Number.isNaN(departure.getTime())) return '';
  return toIstYmd(departure);
};

const getResolvedDepartureInstant = (booking) => {
  const departureValue = booking?.departureTime || booking?.schedule?.departureTime || booking?.scheduledDepartureTime;
  const explicitTravelDate = String(booking?.travelDate || '').trim();

  if (explicitTravelDate && departureValue) {
    const projected = onTravelDate(explicitTravelDate, departureValue);
    if (projected) return projected;
  }

  const fallback = getDepartureValue(booking);
  if (!fallback) return null;
  const date = new Date(fallback);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getTodayDateKey = () => toIstYmd(new Date());

const isConfirmedBooking = (booking) => String(booking?.status || '').toUpperCase() === 'CONFIRMED';

// Mirrors the backend RefundPolicy: the slab with the highest "hours before departure" that applies wins
const DEFAULT_REFUND_SLABS = [
  { hoursBeforeDeparture: 24, refundPercent: 75, label: '24+ hrs before departure' },
  { hoursBeforeDeparture: 12, refundPercent: 50, label: '12–24 hrs before' },
  { hoursBeforeDeparture: 4, refundPercent: 25, label: '4–12 hrs before' },
  { hoursBeforeDeparture: 0, refundPercent: 0, label: 'Less than 4 hrs' },
];

const getRefundSlabs = (slabs) => (Array.isArray(slabs) && slabs.length ? slabs : DEFAULT_REFUND_SLABS);

const calculateUserRefundPreview = (booking, slabs) => {
  const departureMs = getResolvedDepartureInstant(booking)?.getTime() ?? NaN;
  const totalAmount = Number(booking?.payableAmount ?? booking?.totalAmount ?? booking?.amount ?? 0);
  if (!Number.isFinite(departureMs) || !Number.isFinite(totalAmount)) return { percent: 0, amount: 0 };
  const hoursLeft = (departureMs - Date.now()) / 3600000;
  let bestHours = -1;
  let percent = 0;
  getRefundSlabs(slabs).forEach((slab) => {
    const hours = Number(slab?.hoursBeforeDeparture ?? 0);
    if (hoursLeft >= hours && hours > bestHours) {
      bestHours = hours;
      percent = Math.round(Number(slab?.refundPercent ?? 0));
    }
  });
  percent = Math.max(0, Math.min(100, percent));
  return { percent, amount: Math.max(0, Math.round((totalAmount * percent) / 100)) };
};

const getScheduleId = (booking) => String(
  booking?.scheduleId ||
  booking?.schedule?.id ||
  booking?.routeScheduleId ||
  ''
).trim();

const canReschedule = (booking, minHours = 12) => {
  const dept = booking?.departureTime;
  const travelDate = booking?.travelDate;
  if (!dept) return false;
  const actualDeparture = (travelDate && onTravelDate(travelDate, dept)) || new Date(dept);
  return (actualDeparture.getTime() - Date.now()) / 3600000 >= minHours;
};

const CenterScreenLoader = ({ label }) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
    <div className="flex min-w-[260px] flex-col items-center gap-4 rounded-[28px] bg-white px-8 py-7 text-center shadow-2xl ring-1 ring-slate-200/70">
      <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-primary/25 border-t-primary" />
      <div>
        <p className="text-base font-bold text-slate-900">{label}</p>
        <p className="mt-1 text-sm text-slate-500">Please wait while we update your booking.</p>
      </div>
    </div>
  </div>
);

const RatingModal = ({ booking, onClose, onSubmit, submitting }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl ring-1 ring-slate-200/70">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Rate your trip</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">{booking?.from || '--'} to {booking?.to || '--'}</h2>
            <p className="mt-2 text-sm text-slate-500">Share a quick review to help future travelers choose with confidence.</p>
          </div>
          <button onClick={onClose} className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="mt-6">
          <p className="text-sm font-semibold text-slate-900">How was your trip?</p>
          <div className="mt-3 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                className="transition-transform hover:scale-110 active:scale-95 p-1"
              >
                <span className={`material-symbols-outlined text-4xl transition-colors ${rating >= value ? 'text-[#FF8A65]' : 'text-slate-300'}`}
                  style={{ fontVariationSettings: rating >= value ? "'FILL' 1" : "'FILL' 0" }}>
                  star
                </span>
              </button>
            ))}
            <span className="ml-2 text-sm font-semibold text-slate-600">{rating}/5</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Very Good' : 'Excellent'}
          </p>
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-sm font-semibold text-slate-900">Review comment</label>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
            placeholder="Tell us about seat comfort, punctuality, boarding, or overall experience."
            className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200/70 focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200">
            Maybe later
          </button>
          <button
            onClick={() => onSubmit({ rating, comment })}
            disabled={submitting}
            className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-[#102A4C] disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Submit review'}
          </button>
        </div>
      </div>
    </div>
  );
};

const UserCancelModal = ({ booking, slabs, reason, setReason, refundTo, setRefundTo, onClose, onConfirm, submitting }) => {
  const preview = calculateUserRefundPreview(booking, slabs);
  const rules = [...getRefundSlabs(slabs)].sort((a, b) => Number(b.hoursBeforeDeparture) - Number(a.hoursBeforeDeparture));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-2xl ring-1 ring-slate-200/70">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-500">Cancel booking</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">{booking?.from || '--'} to {booking?.to || '--'}</h2>
            <p className="mt-2 text-sm text-slate-500">Review the refund policy before cancelling this trip.</p>
          </div>
          <button onClick={onClose} className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
          <p className="text-sm font-semibold text-slate-900">This bus’s cancellation policy</p>
          <div className="mt-3 space-y-1.5 text-sm text-slate-600">
            {rules.map((slab) => (
              <p key={`${slab.hoursBeforeDeparture}-${slab.refundPercent}`} className="flex justify-between gap-4">
                <span>{slab.label || `${slab.hoursBeforeDeparture}+ hrs before departure`}</span>
                <span className="font-semibold text-slate-900">{Number(slab.refundPercent) > 0 ? `${slab.refundPercent}% refund` : 'No refund'}</span>
              </p>
            ))}
          </div>
          <div className="mt-4 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200/70">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Estimated refund</p>
            <p className="mt-2 text-2xl font-black text-slate-900">₹{preview.amount}</p>
            <p className="mt-1 text-sm text-slate-500">{preview.percent}% refund based on current departure window.</p>
          </div>
        </div>
        {WALLET_ENABLED && preview.amount > 0 && (
          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-semibold text-slate-900">Where should we send your refund?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { id: 'CREDIT', title: 'TripGo credit', sub: 'Instant · use on your next booking', icon: 'bolt' },
                { id: 'ORIGINAL', title: 'Original payment', sub: '5–7 business days', icon: 'credit_card' },
              ].map((opt) => (
                <label key={opt.id} className={`flex items-start gap-3 rounded-2xl border p-3 cursor-pointer transition-colors ${refundTo === opt.id ? 'border-[#FF8A65] bg-[#FFF7F2]' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="refundTo" value={opt.id} checked={refundTo === opt.id} onChange={() => setRefundTo(opt.id)} className="mt-1 text-primary focus:ring-[#FDBA74]" />
                  <span>
                    <span className="flex items-center gap-1 text-sm font-bold text-slate-900">
                      <span className="material-symbols-outlined text-[16px] text-orange-600">{opt.icon}</span>{opt.title}
                    </span>
                    <span className="text-xs text-slate-500">{opt.sub}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="mt-5">
          <label className="mb-2 block text-sm font-semibold text-slate-900">Cancellation reason</label>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            placeholder="Tell us why you want to cancel this booking."
            className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200/70 focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200">
            Keep booking
          </button>
          <button onClick={onConfirm} disabled={submitting || !reason.trim()} className="flex-1 rounded-2xl bg-red-500 px-4 py-3 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-60">
            Confirm cancellation
          </button>
        </div>
      </div>
    </div>
  );
};

const toDisplayBookingId = (booking) => {
  const raw = String(booking?.publicBookingId || booking?.bookingCode || booking?.bookingNumber || booking?.pnr || booking?.bookingId || booking?.id || booking?.reference || '').trim();
  if (!raw) return '--';
  if (raw.startsWith('TG-') || raw.startsWith('TRIPGO-')) return raw;
  const compact = raw.replace(/-/g, '').slice(0, 8).toUpperCase();
  return compact ? `TG-${compact}` : raw;
};

const extractSeats = (booking) => {
  if (Array.isArray(booking?.seatNumbers)) return booking.seatNumbers;
  if (Array.isArray(booking?.seats)) return booking.seats.map((seat) => seat?.seatNumber || seat).filter(Boolean);
  if (Array.isArray(booking?.bookingSeats)) return booking.bookingSeats.map((seat) => seat?.seatNumber).filter(Boolean);
  if (Array.isArray(booking?.passengers)) return booking.passengers.map((item) => item?.seatNumber).filter(Boolean);
  return [];
};

const extractPassengers = (booking) => {
  if (Array.isArray(booking?.passengers) && booking.passengers.length) return booking.passengers;
  if (Array.isArray(booking?.bookingSeats) && booking.bookingSeats.length) {
    return booking.bookingSeats.map((seat) => ({
      seatNumber: seat?.seatNumber,
      firstName: seat?.passenger?.firstName,
      lastName: seat?.passenger?.lastName,
      age: seat?.passenger?.age,
      gender: seat?.passenger?.gender,
      phone: seat?.passenger?.phone,
    }));
  }
  return [];
};

const getBookingRouteSegment = (booking) => {
  const passengers = extractPassengers(booking);
  const firstPassenger = passengers[0] || {};
  const firstBookingSeat = Array.isArray(booking?.bookingSeats) && booking.bookingSeats.length ? booking.bookingSeats[0] : {};

  const routeFrom = (
    booking?.fromStop ||
    firstPassenger?.fromStop ||
    firstBookingSeat?.fromStop ||
    booking?.from ||
    booking?.source ||
    booking?.origin ||
    booking?.route?.from ||
    '--'
  );

  const routeTo = (
    booking?.toStop ||
    firstPassenger?.toStop ||
    firstBookingSeat?.toStop ||
    booking?.to ||
    booking?.destination ||
    booking?.route?.to ||
    '--'
  );

  return { routeFrom, routeTo };
};

const getBookingBusName = (booking) => (
  booking?.busName ||
  booking?.bus?.name ||
  booking?.bus?.busName ||
  booking?.operatorBusName ||
  booking?.travelsName ||
  booking?.schedule?.busName ||
  booking?.schedule?.bus?.name ||
  ''
);

const toTitleCase = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/\b\w/g, (char) => char.toUpperCase());

const downloadTicket = async (booking) => {
  const rawId = String(
    booking?.bookingId || booking?.id || booking?.publicBookingId || booking?.bookingCode || ''
  ).trim();

  // Try API download first
  if (rawId) {
    const success = await downloadTicketFromApi(rawId, `${toDisplayBookingId(booking)}.pdf`);
    if (success) return;
  }

  // Fallback: generate txt ticket
  const bookingId = toDisplayBookingId(booking);
  const { routeFrom, routeTo } = getBookingRouteSegment(booking);
  const seats = extractSeats(booking);
  const passengers = extractPassengers(booking);
  const passengerLines = passengers.length
    ? passengers.map((item, index) => `${index + 1}. ${[toTitleCase(item?.firstName), toTitleCase(item?.lastName)].filter(Boolean).join(' ') || 'Traveler'} | Seat: ${item?.seatNumber || '--'} | Age: ${item?.age ?? '--'} | Gender: ${item?.gender || '--'} | Phone: ${item?.phone || '--'}`).join('\n')
    : 'Passenger details not available';

  const text = [
    'TripGo Ticket',
    '',
    `Booking ID: ${bookingId}`,
    `Route: ${routeFrom} to ${routeTo}`,
    `Status: ${booking?.status || 'CONFIRMED'}`,
    `Booked On: ${formatDateTime(booking?.bookedAt || booking?.createdAt || booking?.bookingTime)}`,
    `Amount Paid: Rs. ${Number(booking?.payableAmount ?? booking?.totalAmount ?? booking?.amount ?? 0)}`,
    `Seats: ${seats.length ? seats.join(', ') : '--'}`,
    '',
    'Passengers',
    passengerLines,
  ].join('\n');

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${bookingId}.txt`;
  link.click();
  URL.revokeObjectURL(url);
};

const EMPTY_FILTERS = { statuses: [], dateFrom: '', dateTo: '', minFare: '', maxFare: '' };
const STATUS_FILTER_OPTIONS = [
  { id: 'confirmed', label: 'Confirmed / Paid', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  { id: 'completed', label: 'Completed', dot: 'bg-sky-500', text: 'text-sky-700' },
  { id: 'cancelled', label: 'Cancelled', dot: 'bg-rose-500', text: 'text-rose-700' },
  { id: 'pending', label: 'Pending Payment', dot: 'bg-amber-500', text: 'text-amber-700' },
];

const FilterModal = ({ open, filters, onChange, onApply, onReset, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Filter Bookings</h2>
            <p className="text-xs text-slate-400 mt-0.5">Narrow results by status, date or fare</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-sm text-slate-600">close</span>
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Status */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Booking Status</p>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_FILTER_OPTIONS.map((opt) => {
                const checked = filters.statuses.includes(opt.id);
                return (
                  <label key={opt.id} className={`flex items-center gap-2.5 cursor-pointer rounded-xl px-3 py-2.5 border transition-colors ${checked ? 'border-[#002046]/30 bg-[#002046]/[0.04]' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = checked
                          ? filters.statuses.filter((s) => s !== opt.id)
                          : [...filters.statuses, opt.id];
                        onChange({ ...filters, statuses: next });
                      }}
                      className="rounded border-slate-300 accent-[#002046]"
                    />
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dot}`} />
                    <span className={`text-xs font-semibold ${opt.text}`}>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Date range */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Travel Date</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#002046] focus:ring-1 focus:ring-[#002046]/20"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#002046] focus:ring-1 focus:ring-[#002046]/20"
                />
              </div>
            </div>
          </div>

          {/* Fare range */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Fare Range (₹)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Min fare</label>
                <input
                  type="number"
                  value={filters.minFare}
                  placeholder="₹ 0"
                  min="0"
                  onChange={(e) => onChange({ ...filters, minFare: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#002046] focus:ring-1 focus:ring-[#002046]/20"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Max fare</label>
                <input
                  type="number"
                  value={filters.maxFare}
                  placeholder="Any"
                  min="0"
                  onChange={(e) => onChange({ ...filters, maxFare: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#002046] focus:ring-1 focus:ring-[#002046]/20"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onReset} className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors">
            Reset all
          </button>
          <button onClick={onApply} className="flex-1 rounded-xl bg-[#002046] py-2.5 text-sm font-bold text-white hover:bg-[#001533] transition-colors">
            Apply filters
          </button>
        </div>
      </div>
    </div>
  );
};

const TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'all', label: 'All' },
];

const STATUS_META = {
  CONFIRMED: { label: 'Confirmed', cls: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  PAYMENT_SUCCESSFUL: { label: 'Paid', cls: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  PAYMENT_RECEIVED: { label: 'Payment received', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  PENDING: { label: 'Payment pending', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  COMPLETED: { label: 'Completed', cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  FAILED: { label: 'Payment not completed', cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
};

const isUnpaidStatus = (upper) => upper === 'FAILED' || upper === 'EXPIRED';

// Trip times are shown in IST across TripGo (see scheduleSearchUtils)
const formatTripDate = (d) => (d ? d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: TRIP_TIME_ZONE }) : '—');
const formatTripTime = (d) => (d ? formatIstTime(d) : '');

const shiftYmd = (ymd, days) => {
  const d = new Date(`${ymd}T00:00:00`);
  d.setDate(d.getDate() + days);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const ActionButton = ({ icon, label, onClick, tone = 'default', disabled, title }) => {
  const tones = {
    primary: 'bg-primary text-white border-primary hover:bg-[#102A4C]',
    default: 'bg-white text-slate-700 border-slate-200 hover:border-[#FF8A65] hover:text-primary',
    danger: 'bg-white text-red-600 border-red-200 hover:bg-red-50',
    accent: 'bg-[#FFF7F2] text-orange-700 border-[#FDBA74]/60 hover:bg-[#FDBA74]/20',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${tones[tone]}`}
    >
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
      {label}
    </button>
  );
};

const UserBookings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completedTrips, setCompletedTrips] = useState([]);
  const [reviewModalBooking, setReviewModalBooking] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [tripTab, setTripTab] = useState('upcoming');
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [refundTo, setRefundTo] = useState('ORIGINAL');
  const [cancellingBookingId, setCancellingBookingId] = useState('');
  const [rescheduleModalBooking, setRescheduleModalBooking] = useState(null);
  const [policyMap, setPolicyMap] = useState({});
  const [page, setPage] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingFilters, setPendingFilters] = useState(EMPTY_FILTERS);
  const [activeFilters, setActiveFilters] = useState(EMPTY_FILTERS);
  const [tracking, setTracking] = useState(null);
  const pendingPayment = useMemo(() => getPendingPayment(), []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await getMyBookings();
      setBookings(normalizeList(data).sort((a, b) => getBookingTimestamp(b) - getBookingTimestamp(a)));
    } catch (error) {
      toast.error(error?.message || 'Failed to load your bookings.');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedTrips = async () => {
    try {
      setCompletedTrips(normalizeList(await getMyCompletedTrips()));
    } catch {
      setCompletedTrips([]);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchCompletedTrips();
  }, []);

  useEffect(() => {
    if (!bookings.length) return;
    const ids = [...new Set(bookings.filter(isConfirmedBooking).map(getScheduleId).filter(Boolean))];
    ids.forEach(async (sid) => {
      try {
        const p = await getSchedulePolicies(sid);
        setPolicyMap((prev) => ({ ...prev, [sid]: p }));
      } catch {
        // policy unavailable — reschedule stays hidden for this booking
      }
    });
  }, [bookings]);

  const latestBooking = location.state?.latestBooking;

  const visibleBookings = useMemo(() => {
    const optimisticPendingBooking = buildOptimisticBookingFromPendingPayment(pendingPayment);
    const hasPendingBookingInApi = optimisticPendingBooking
      ? bookings.some((booking) => isPendingPaymentMatch(booking, pendingPayment))
      : false;
    const merged = [
      ...(latestBooking ? [latestBooking] : []),
      ...bookings,
      ...(!latestBooking && optimisticPendingBooking && !hasPendingBookingInApi ? [optimisticPendingBooking] : []),
    ];
    const deduped = [];
    const seenIds = new Set();
    merged.forEach((item) => {
      const identity = getBookingIdentity(item);
      if (!identity || !seenIds.has(identity)) {
        if (identity) seenIds.add(identity);
        deduped.push(item);
      }
    });

    // Collapse optimistic/duplicate rows of the same trip, keeping the most advanced status
    const collapsedByTrip = new Map();
    deduped.forEach((item) => {
      const displayStatus = getDisplayStatus(item, pendingPayment);
      const { routeFrom, routeTo } = getBookingRouteSegment(item);
      const tripKey = [
        routeFrom, routeTo, extractSeats(item).join(','),
        Number(item?.payableAmount ?? item?.totalAmount ?? item?.amount ?? 0),
        extractPassengers(item).length || extractSeats(item).length || 1,
        getTimestampMinuteBucket(item),
      ].join('|');
      const existing = collapsedByTrip.get(tripKey);
      if (!existing || getStatusRank(displayStatus) > getStatusRank(existing.__displayStatus || existing.status)) {
        collapsedByTrip.set(tripKey, { ...item, __displayStatus: displayStatus });
      }
    });

    return [...collapsedByTrip.values()].sort((a, b) => getBookingTimestamp(b) - getBookingTimestamp(a));
  }, [bookings, latestBooking, pendingPayment]);

  const reviewableByScheduleId = useMemo(() => {
    const map = new Map();
    normalizeList(completedTrips).forEach((trip) => {
      const key = String(trip?.scheduleId || '').trim();
      if (key) map.set(key, trip);
    });
    return map;
  }, [completedTrips]);

  const now = Date.now();
  const departureOf = (b) => getResolvedDepartureInstant(b);

  /** 'upcoming' | 'completed' | 'cancelled' | 'pending' */
  const groupOf = (b) => {
    const upper = String(b?.__displayStatus || b?.status || '').toUpperCase();
    if (upper === 'CANCELLED' || isUnpaidStatus(upper)) return 'cancelled';
    if (upper === 'PENDING' || upper === 'PAYMENT_RECEIVED') return 'pending';
    if (upper === 'COMPLETED') return 'completed';
    const dep = departureOf(b);
    if (dep && dep.getTime() < now - 6 * 3600000) return 'completed';
    if (reviewableByScheduleId.has(getScheduleId(b)) && dep && dep.getTime() < now) return 'completed';
    return 'upcoming';
  };

  const grouped = useMemo(() => {
    const g = { upcoming: [], completed: [], cancelled: [], pending: [] };
    visibleBookings.forEach((b) => g[groupOf(b)].push(b));
    g.upcoming.sort((a, b) => (departureOf(a)?.getTime() ?? 0) - (departureOf(b)?.getTime() ?? 0));
    return g;
  }, [visibleBookings, reviewableByScheduleId]); // eslint-disable-line react-hooks/exhaustive-deps

  const tabbedBookings = useMemo(() => {
    if (tripTab === 'all') return visibleBookings;
    if (tripTab === 'upcoming') return [...grouped.pending, ...grouped.upcoming];
    return grouped[tripTab];
  }, [tripTab, visibleBookings, grouped]);

  const tabCount = (id) => (id === 'all' ? visibleBookings.length : id === 'upcoming' ? grouped.upcoming.length + grouped.pending.length : grouped[id].length);

  // What was actually spent: paid trips, minus any refunds on cancelled ones
  const totalSpend = useMemo(() => visibleBookings.reduce((sum, b) => {
    const paid = Number(b?.payableAmount ?? b?.totalAmount ?? b?.amount ?? 0);
    const upper = String(b?.__displayStatus || b?.status || '').toUpperCase();
    if (upper === 'PENDING' || isUnpaidStatus(upper)) return sum;
    if (upper === 'CANCELLED') return sum + Math.max(0, paid - Number(b?.refundAmount ?? 0));
    return sum + paid;
  }, 0), [visibleBookings]);

  const activeFilterCount = (
    activeFilters.statuses.length + (activeFilters.dateFrom ? 1 : 0) + (activeFilters.dateTo ? 1 : 0) +
    (activeFilters.minFare ? 1 : 0) + (activeFilters.maxFare ? 1 : 0)
  );

  const filteredBookings = useMemo(() => {
    if (activeFilterCount === 0) return tabbedBookings;
    return tabbedBookings.filter((booking) => {
      const group = groupOf(booking);
      if (activeFilters.statuses.length > 0) {
        const matched = activeFilters.statuses.some((s) => (
          (s === 'confirmed' && group === 'upcoming') ||
          (s === 'completed' && group === 'completed') ||
          (s === 'cancelled' && group === 'cancelled') ||
          (s === 'pending' && group === 'pending')
        ));
        if (!matched) return false;
      }
      const travelDate = getTravelDateKey(booking);
      if (activeFilters.dateFrom && travelDate && travelDate < activeFilters.dateFrom) return false;
      if (activeFilters.dateTo && travelDate && travelDate > activeFilters.dateTo) return false;
      const amount = Number(booking?.payableAmount ?? booking?.totalAmount ?? booking?.amount ?? 0);
      if (activeFilters.minFare && amount < Number(activeFilters.minFare)) return false;
      if (activeFilters.maxFare && amount > Number(activeFilters.maxFare)) return false;
      return true;
    });
  }, [tabbedBookings, activeFilters, activeFilterCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const viewTicket = async (booking) => {
    const rawId = String(booking?.bookingId || booking?.id || booking?.publicBookingId || booking?.bookingCode || '').trim();
    if (rawId && await viewTicketFromApi(rawId)) return;
    toast.error('Your ticket isn’t ready to view yet. Try downloading it, or check again in a moment.');
  };

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
  const paginatedBookings = useMemo(
    () => filteredBookings.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [page, filteredBookings]
  );

  useEffect(() => { setPage(0); }, [tripTab, activeFilters]);
  useEffect(() => { if (page >= totalPages) setPage(Math.max(totalPages - 1, 0)); }, [page, totalPages]);

  // Prompt a review right after returning from a just-completed trip
  useEffect(() => {
    if (!latestBooking) return;
    const scheduleId = getScheduleId(latestBooking);
    const reviewableTrip = reviewableByScheduleId.get(scheduleId);
    if (!scheduleId || !reviewableTrip || reviewableTrip.alreadyRated) return;
    try {
      if (localStorage.getItem(REVIEW_PROMPT_STORAGE_KEY) === scheduleId) return;
      localStorage.setItem(REVIEW_PROMPT_STORAGE_KEY, scheduleId);
    } catch {
      // ignore storage errors
    }
    setReviewModalBooking({ ...latestBooking, from: latestBooking?.from || reviewableTrip?.from, to: latestBooking?.to || reviewableTrip?.to, scheduleId });
  }, [latestBooking, reviewableByScheduleId]);

  const emptyCopy = {
    upcoming: ['No upcoming trips', 'Your next journey will show up here once you book.'],
    completed: ['No completed trips yet', 'Trips appear here after you travel — then you can rate them.'],
    cancelled: ['No cancelled bookings', 'Cancelled trips appear here with their refund status.'],
    all: ['No bookings yet', 'Search for a bus and book your first trip.'],
  }[tripTab];

  const stats = [
    { label: 'Upcoming', value: grouped.upcoming.length, icon: 'event_upcoming', tone: 'text-green-600 bg-green-50' },
    { label: 'Completed', value: grouped.completed.length, icon: 'check_circle', tone: 'text-slate-600 bg-slate-100' },
    { label: 'Cancelled', value: grouped.cancelled.length, icon: 'cancel', tone: 'text-red-500 bg-red-50' },
    { label: 'Spent on trips', value: `₹${Math.round(totalSpend).toLocaleString('en-IN')}`, icon: 'payments', tone: 'text-orange-600 bg-[#FDBA74]/20' },
  ];

  return (
    <>
      {tracking && (
        <BusTrackingMap scheduleId={tracking.scheduleId} routeFrom={tracking.from} routeTo={tracking.to} onClose={() => setTracking(null)} />
      )}
      <UserLayout activeItem="bookings" title="My Bookings" showHeaderTitle={false} showHeaderSearch={false}>
        <div className="space-y-6">

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900">My bookings</h1>
              <p className="text-sm text-slate-500 mt-1">Tickets, trip changes, cancellations and refunds — all in one place.</p>
            </div>
            {latestBooking && (
              <span className="inline-flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-2 text-sm font-semibold text-green-700">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Booking confirmed
              </span>
            )}
          </div>

          {/* Stats */}
          <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-3 p-5">
                <span className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center ${s.tone}`}>
                  <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
                </span>
                <div className="min-w-0">
                  <p className="text-xl font-black text-slate-900 leading-none truncate">{loading ? '–' : s.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                </div>
              </div>
            ))}
          </section>

          {/* Tabs + filter */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-xl border border-slate-200 bg-white p-1 overflow-x-auto" role="tablist">
              {TABS.map((t) => (
                <button key={t.id} role="tab" aria-selected={tripTab === t.id} onClick={() => setTripTab(t.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-bold whitespace-nowrap transition-colors ${
                    tripTab === t.id ? 'bg-primary text-white' : 'text-slate-500 hover:text-primary'
                  }`}>
                  {t.label}
                  <span className={`text-[11px] font-bold ${tripTab === t.id ? 'text-[#FDBA74]' : 'text-slate-400'}`}>{loading ? '' : tabCount(t.id)}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => { setPendingFilters(activeFilters); setFilterOpen(true); }}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-bold transition-colors ${
                activeFilterCount > 0 ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-200 hover:border-[#FF8A65]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
              Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </button>
          </div>

          {/* List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 rounded-2xl bg-white border border-slate-200/70 animate-pulse" />
              ))}
            </div>
          ) : filteredBookings.length === 0 ? (
            <section className="rounded-2xl bg-white border border-slate-200/70 p-12 text-center">
              <span className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-[#FDBA74]/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-orange-600">confirmation_number</span>
              </span>
              <h2 className="text-lg font-black text-slate-900">{activeFilterCount > 0 ? 'No bookings match your filters' : emptyCopy[0]}</h2>
              <p className="mt-1 text-sm text-slate-500">{activeFilterCount > 0 ? 'Try clearing a filter.' : emptyCopy[1]}</p>
              <div className="mt-5 flex justify-center gap-2">
                {activeFilterCount > 0 ? (
                  <button onClick={() => { setPendingFilters(EMPTY_FILTERS); setActiveFilters(EMPTY_FILTERS); }} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-[#102A4C] transition-colors">
                    Clear filters
                  </button>
                ) : (tripTab === 'upcoming' || tripTab === 'all') && (
                  <button onClick={() => navigate(ROUTES.SEARCH_RESULTS)} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-[#102A4C] transition-colors">
                    Search buses
                  </button>
                )}
              </div>
            </section>
          ) : (
            <div className="space-y-4">
              {paginatedBookings.map((booking, index) => {
                const bookingId = toDisplayBookingId(booking);
                const { routeFrom, routeTo } = getBookingRouteSegment(booking);
                const cityFrom = booking?.from || routeFrom;
                const cityTo = booking?.to || routeTo;
                const seats = extractSeats(booking);
                const passengers = extractPassengers(booking);
                const amount = Number(booking?.payableAmount ?? booking?.totalAmount ?? booking?.amount ?? 0);
                const scheduleId = getScheduleId(booking);
                const group = groupOf(booking);
                const upper = String(booking?.__displayStatus || booking?.status || '').toUpperCase();
                const meta = group === 'completed' ? STATUS_META.COMPLETED
                  : isUnpaidStatus(upper) ? STATUS_META.FAILED
                  : (STATUS_META[upper] || STATUS_META.CONFIRMED);
                const unpaid = isUnpaidStatus(upper);
                // Unpaid booking: retry while this browser still holds its checkout and seat lock
                const awaitingPayment = upper === 'PENDING';
                const payDeadline = awaitingPayment && getBookingTimestamp(booking) ? getBookingTimestamp(booking) + PAYMENT_WINDOW_MS : 0;
                const resumable = awaitingPayment && !pendingPayment?.paid && isPendingPaymentMatch(booking, pendingPayment)
                  && pendingPayment?.bookingState && new Date(pendingPayment?.lockExpiresAt || 0).getTime() > now;
                const dep = departureOf(booking);
                const policy = policyMap[scheduleId];
                const minHours = Number(policy?.dateChange?.minHoursBeforeDeparture ?? 12);
                const reviewable = reviewableByScheduleId.get(scheduleId);

                const isUpcoming = group === 'upcoming' && isConfirmedBooking(booking);
                const canTrack = isUpcoming && getTravelDateKey(booking) === getTodayDateKey();
                const showReschedule = isUpcoming && policy?.dateChange?.allowed === true;
                const rescheduleOpen = showReschedule && canReschedule(booking, minHours);
                const canRate = reviewable && !reviewable.alreadyRated;
                const tripState = { ...booking, from: routeFrom, to: routeTo, scheduleId };

                return (
                  <article key={`${getBookingIdentity(booking) || index}`} className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.cls}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                              {meta.label}
                            </span>
                            <span className="text-[11px] font-mono font-semibold text-slate-400">{bookingId}</span>
                          </div>
                          <h2 className="text-lg font-black text-slate-900 truncate">
                            {cityFrom} <span className="text-[#FF8A65]">→</span> {cityTo}
                          </h2>
                          <p className="text-xs text-slate-500 truncate">{getBookingBusName(booking) || 'Bus'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-slate-900">₹{Math.round(amount).toLocaleString('en-IN')}</p>
                          <p className="text-[11px] text-slate-400">{passengers.length || seats.length || 1} traveller{(passengers.length || seats.length || 1) !== 1 ? 's' : ''}</p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                          ['Travel date', formatTripDate(dep)],
                          ['Departure', formatTripTime(dep) || '—'],
                          [seats.length > 1 ? 'Seats' : 'Seat', seats.length ? seats.join(', ') : '—'],
                          ['Boarding', routeFrom !== cityFrom ? routeFrom : (booking?.fromStop || cityFrom)],
                        ].map(([label, value]) => (
                          <div key={label} className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                            <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
                          </div>
                        ))}
                      </div>

                      {unpaid && (
                        <p className="mt-4 flex items-center gap-1.5 rounded-xl bg-slate-50 border border-slate-100 px-4 py-2.5 text-xs text-slate-600">
                          <span className="material-symbols-outlined text-[16px]">info</span>
                          Payment wasn’t completed, so this booking was cancelled and the seats released. No money was taken.
                        </p>
                      )}
                      {group === 'cancelled' && !unpaid && (
                        <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                          {getCancelledByLabel(booking?.cancelledBy) && (
                            <p className="text-xs text-slate-500">
                              Cancelled by <span className="font-semibold text-slate-700">{getCancelledByLabel(booking?.cancelledBy)}</span>
                              {booking?.cancelReason ? <> · “{booking.cancelReason}”</> : null}
                            </p>
                          )}
                          <RefundTimeline booking={booking} />
                        </div>
                      )}
                      {group === 'pending' && !awaitingPayment && (
                        <p className="mt-4 flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5 text-xs text-amber-800">
                          <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
                          We’re confirming your payment. This usually takes a minute — refresh to check.
                        </p>
                      )}
                      {awaitingPayment && (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
                          <p className="flex items-start gap-1.5 text-xs text-amber-800">
                            <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
                            <span>
                              We haven’t received payment for this booking.
                              {payDeadline > now
                                ? ` If it isn’t paid by ${formatIstTime(new Date(payDeadline))}, it’s cancelled automatically and the seats are released.`
                                : ' It’s being cancelled automatically — no money is taken for unpaid bookings.'}
                              {' '}If you already paid, it’ll confirm in a minute.
                            </span>
                          </p>
                          {resumable && (
                            <ActionButton icon="credit_card" label="Complete payment" tone="primary"
                              onClick={() => navigate(ROUTES.PAYMENT, { state: pendingPayment.bookingState })} />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions — always visible */}
                    {group !== 'pending' && (
                      <div className="flex flex-wrap items-center gap-2 px-5 py-3 bg-slate-50/70 border-t border-slate-100">
                        {group !== 'cancelled' && (
                          <>
                            <ActionButton icon="download" label="Download ticket" tone="primary" onClick={() => downloadTicket(booking)} />
                            <ActionButton icon="visibility" label="View" onClick={() => viewTicket(booking)} />
                          </>
                        )}
                        {canTrack && scheduleId && (
                          <ActionButton icon="share_location" label="Track bus" tone="accent" onClick={() => setTracking({ scheduleId, from: routeFrom, to: routeTo })} />
                        )}
                        {isUpcoming && (
                          <ActionButton icon="share" label="Share trip" onClick={() => shareTrip({
                            bookingId: booking?.bookingId, bookingCode: bookingId, from: cityFrom, to: cityTo,
                            dateLabel: formatTripDate(dep), timeLabel: formatTripTime(dep), busName: getBookingBusName(booking),
                            boarding: booking?.fromStop || routeFrom, seats: seats.join(', '),
                          })} />
                        )}
                        {isUpcoming && (
                          <ActionButton icon="u_turn_left" label="Book return" onClick={() => navigate(ROUTES.SEARCH_RESULTS, {
                            // Return journey: swapped cities, the day after this trip (never in the past)
                            state: { from: cityTo, to: cityFrom, date: [getTravelDateKey(booking) ? shiftYmd(getTravelDateKey(booking), 1) : '', localDateString(1)].sort().pop() },
                          })} />
                        )}
                        {showReschedule && (
                          <ActionButton
                            icon="edit_calendar" label="Change date"
                            disabled={!rescheduleOpen}
                            title={rescheduleOpen ? 'Move this trip to another date' : `Date changes close ${minHours} hours before departure`}
                            onClick={() => setRescheduleModalBooking(tripState)}
                          />
                        )}
                        {canRate && (
                          <ActionButton icon="star" label="Rate trip" tone="accent" onClick={() => setReviewModalBooking(tripState)} />
                        )}
                        {(group === 'completed' || group === 'cancelled') && (
                          <ActionButton icon="replay" label="Book again" onClick={() => navigate(ROUTES.SEARCH_RESULTS, { state: { from: cityFrom, to: cityTo, date: localDateString(1) } })} />
                        )}
                        {isUpcoming && (
                          <span className="sm:ml-auto">
                            <ActionButton icon="close" label="Cancel" tone="danger" onClick={() => { setCancelModalBooking(tripState); setCancelReason(''); }} />
                          </span>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}

              <PaginationControls page={page} pageSize={PAGE_SIZE} totalItems={filteredBookings.length} onPageChange={setPage} itemLabel="bookings" />
            </div>
          )}
        </div>

        <FilterModal
          open={filterOpen}
          filters={pendingFilters}
          onChange={setPendingFilters}
          onClose={() => setFilterOpen(false)}
          onApply={() => { setActiveFilters(pendingFilters); setFilterOpen(false); }}
          onReset={() => { setPendingFilters(EMPTY_FILTERS); setActiveFilters(EMPTY_FILTERS); setFilterOpen(false); }}
        />
        {reviewModalBooking && (
          <RatingModal
            booking={reviewModalBooking}
            submitting={submittingReview}
            onClose={() => setReviewModalBooking(null)}
            onSubmit={async ({ rating, comment }) => {
              try {
                setSubmittingReview(true);
                await submitTripRating(reviewModalBooking.scheduleId, { rating, title: `${rating} star review`, comment: comment.trim() });
                toast.success('Thanks for sharing your review.');
                await fetchCompletedTrips();
                setReviewModalBooking(null);
              } catch (error) {
                toast.error(error?.message || 'Unable to submit your review right now.');
              } finally {
                setSubmittingReview(false);
              }
            }}
          />
        )}
        {cancelModalBooking && (
          <UserCancelModal
            booking={cancelModalBooking}
            slabs={policyMap[getScheduleId(cancelModalBooking)]?.cancellation}
            reason={cancelReason}
            setReason={setCancelReason}
            refundTo={refundTo}
            setRefundTo={setRefundTo}
            submitting={cancellingBookingId === String(cancelModalBooking?.bookingId || cancelModalBooking?.id || '')}
            onClose={() => { setCancelModalBooking(null); setCancelReason(''); }}
            onConfirm={async () => {
              const bookingId = String(cancelModalBooking?.bookingId || cancelModalBooking?.id || '').trim();
              if (!bookingId) return toast.error('Booking ID missing for cancellation.');
              try {
                setCancellingBookingId(bookingId);
                const result = await cancelMyBooking(bookingId, cancelReason.trim(), WALLET_ENABLED ? refundTo : undefined);
                const refundAmount = Number(result?.refundAmount ?? calculateUserRefundPreview(cancelModalBooking, policyMap[getScheduleId(cancelModalBooking)]?.cancellation).amount ?? 0);
                const refundStatus = String(result?.refundStatus || '').toUpperCase();
                toast.success(
                  refundAmount > 0
                    ? (WALLET_ENABLED && refundTo === 'CREDIT'
                      ? `Booking cancelled. ₹${refundAmount} added to your TripGo credit.`
                      : `Booking cancelled. Refund of ₹${refundAmount} ${refundStatus === 'PROCESSED' ? 'processed.' : 'will reflect in 5–7 business days.'}`)
                    : 'Booking cancelled. No refund applies this close to departure.'
                );
                setTripTab('cancelled');
                setCancelModalBooking(null);
                setCancelReason('');
                await fetchBookings();
              } catch (error) {
                toast.error(error?.message || 'Unable to cancel this booking right now.');
              } finally {
                setCancellingBookingId('');
              }
            }}
          />
        )}
        {cancellingBookingId && <CenterScreenLoader label="Cancelling your booking..." />}
        {rescheduleModalBooking && (
          <UserRescheduleModal
            booking={rescheduleModalBooking}
            onClose={() => setRescheduleModalBooking(null)}
            onSuccess={async () => { setRescheduleModalBooking(null); await fetchBookings(); }}
          />
        )}
      </UserLayout>
    </>
  );
};

export default UserBookings;
