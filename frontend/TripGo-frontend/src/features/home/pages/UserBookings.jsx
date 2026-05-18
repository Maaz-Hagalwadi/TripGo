import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import UserLayout from '../../../shared/components/UserLayout';
import { cancelMyBooking, getMyBookings, downloadTicketFromApi, viewTicketFromApi, getSchedulePolicies } from '../../../api/bookingService';
import UserRescheduleModal from '../components/UserRescheduleModal';
import BusTrackingMap from '../components/BusTrackingMap';
import { getMyCompletedTrips, submitTripRating } from '../../../api/reviewService';
import { ROUTES } from '../../../shared/constants/routes';
import { formatUtcDateTime } from '../../../shared/utils/scheduleSearchUtils';

const PAYMENT_STORAGE_KEY = 'tripgo_pending_payment';
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
  if (!date || Number.isNaN(date.getTime())) return formatUtcDateTime(value);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
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

const buildOptimisticBookingFromPendingPayment = (pendingPayment) => {
  if (!pendingPayment) return null;

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

  if (rawStatus === 'PENDING' && isPendingPaymentMatch(booking, pendingPayment)) {
    return 'PAYMENT_SUCCESSFUL';
  }

  if (rawStatus === 'PENDING' && paymentStatus === 'SUCCESS') {
    return 'PAYMENT_RECEIVED';
  }

  return rawStatus;
};


const getRefundStatusMeta = (refundStatus) => {
  const upper = String(refundStatus || 'NA').toUpperCase();
  if (upper === 'PROCESSED') return { label: 'Refund processed', className: 'bg-emerald-50 text-emerald-700' };
  if (upper === 'PENDING') return { label: 'Refund pending', className: 'bg-amber-50 text-amber-700' };
  return { label: 'No refund', className: 'bg-slate-100 text-slate-700' };
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
  if (!upper) return '--';
  if (upper === 'USER') return 'You';
  if (upper === 'OPERATOR') return 'The operator';
  if (upper === 'SYSTEM') return 'Cancelled by System';
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

  const year = departure.getFullYear();
  const month = String(departure.getMonth() + 1).padStart(2, '0');
  const day = String(departure.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getResolvedDepartureInstant = (booking) => {
  const departureValue = booking?.departureTime || booking?.schedule?.departureTime || booking?.scheduledDepartureTime;
  const explicitTravelDate = String(booking?.travelDate || '').trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(explicitTravelDate) && departureValue) {
    const departure = new Date(departureValue);
    if (!Number.isNaN(departure.getTime())) {
      return new Date(Date.UTC(
        Number(explicitTravelDate.slice(0, 4)),
        Number(explicitTravelDate.slice(5, 7)) - 1,
        Number(explicitTravelDate.slice(8, 10)),
        departure.getUTCHours(),
        departure.getUTCMinutes(),
        departure.getUTCSeconds(),
        departure.getUTCMilliseconds()
      ));
    }
  }

  const fallback = getDepartureValue(booking);
  if (!fallback) return null;
  const date = new Date(fallback);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getTodayDateKey = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const isConfirmedBooking = (booking) => String(booking?.status || '').toUpperCase() === 'CONFIRMED';
const isPaymentReceivedBooking = (booking) => {
  const status = String(booking?.__displayStatus || booking?.status || '').toUpperCase();
  return status === 'PAYMENT_SUCCESSFUL' || status === 'PAYMENT_RECEIVED' || status === 'PENDING';
};

const calculateUserRefundPreview = (booking) => {
  const departureMs = getResolvedDepartureInstant(booking)?.getTime() ?? NaN;
  const totalAmount = Number(booking?.payableAmount ?? booking?.totalAmount ?? booking?.amount ?? 0);
  if (!Number.isFinite(departureMs) || !Number.isFinite(totalAmount)) return { percent: 0, amount: 0 };
  const hoursLeft = (departureMs - Date.now()) / 3600000;
  let percent = 0;
  if (hoursLeft > 24) percent = 75;
  else if (hoursLeft > 12) percent = 50;
  else if (hoursLeft > 4) percent = 25;
  return { percent, amount: Math.max(0, Math.round((totalAmount * percent) / 100)) };
};

const isUpcomingBooking = (booking, todayKey = getTodayDateKey()) => (
  (isConfirmedBooking(booking) || isPaymentReceivedBooking(booking)) && getTravelDateKey(booking) >= todayKey
);

const getScheduleId = (booking) => String(
  booking?.scheduleId ||
  booking?.schedule?.id ||
  booking?.routeScheduleId ||
  ''
).trim();

const canReschedule = (booking) => {
  const dept = booking?.departureTime;
  const travelDate = booking?.travelDate;
  if (!dept) return false;
  const deptInstant = new Date(dept);
  let actualDeparture;
  if (travelDate) {
    actualDeparture = new Date(travelDate + 'T00:00:00.000Z');
    actualDeparture.setUTCHours(deptInstant.getUTCHours(), deptInstant.getUTCMinutes(), deptInstant.getUTCSeconds(), 0);
  } else {
    actualDeparture = deptInstant;
  }
  return (actualDeparture.getTime() - Date.now()) / 3600000 >= 12;
};

const InlineLoader = ({ label }) => (
  <div className="inline-flex items-center gap-3 text-sm text-slate-500">
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/40 border-t-primary" />
    <span>{label}</span>
  </div>
);

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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Rate your trip</p>
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
                <span className={`material-symbols-outlined text-4xl transition-colors ${rating >= value ? 'text-amber-400' : 'text-slate-300'}`}
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
            className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-black hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Submit review'}
          </button>
        </div>
      </div>
    </div>
  );
};

const UserCancelModal = ({ booking, reason, setReason, onClose, onConfirm, submitting }) => {
  const preview = calculateUserRefundPreview(booking);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-2xl ring-1 ring-slate-200/70">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Cancel booking</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">{booking?.from || '--'} to {booking?.to || '--'}</h2>
            <p className="mt-2 text-sm text-slate-500">Review the refund policy before cancelling this trip.</p>
          </div>
          <button onClick={onClose} className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
          <p className="text-sm font-semibold text-slate-900">Refund policy</p>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p>{'>'} 24 hrs: 75% refund</p>
            <p>12-24 hrs: 50% refund</p>
            <p>4-12 hrs: 25% refund</p>
            <p>{'<'} 4 hrs: No refund</p>
          </div>
          <div className="mt-4 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200/70">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Estimated refund</p>
            <p className="mt-2 text-2xl font-black text-slate-900">₹{preview.amount}</p>
            <p className="mt-1 text-sm text-slate-500">{preview.percent}% refund based on current departure window.</p>
          </div>
        </div>
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

const getBookingScheduleLabel = (booking) => {
  const departureValue = booking?.travelDate || booking?.departureTime || booking?.schedule?.departureTime || booking?.scheduledDepartureTime;
  const arrivalValue = booking?.arrivalTime || booking?.schedule?.arrivalTime || booking?.scheduledArrivalTime;
  const scheduleCode = booking?.scheduleCode || booking?.schedule?.scheduleCode || booking?.scheduleId || booking?.schedule?.id;

  if (departureValue && arrivalValue) {
    return `${formatDateTime(departureValue)} to ${formatDateTime(arrivalValue)}`;
  }
  if (departureValue) {
    return formatDateTime(departureValue);
  }
  if (scheduleCode) {
    return `Schedule ${scheduleCode}`;
  }
  return '--';
};

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

const UserBookings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completedTrips, setCompletedTrips] = useState([]);
  const [reviewModalBooking, setReviewModalBooking] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [tripTab, setTripTab] = useState('all');
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingBookingId, setCancellingBookingId] = useState('');
  const [rescheduleModalBooking, setRescheduleModalBooking] = useState(null);
  const [policyMap, setPolicyMap] = useState({});
  const [page, setPage] = useState(0);
  const [selectedBookings, setSelectedBookings] = useState(new Set());
  const [viewMode, setViewMode] = useState(() => window.innerWidth < 768 ? 'grid' : 'list');
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingFilters, setPendingFilters] = useState(EMPTY_FILTERS);
  const [activeFilters, setActiveFilters] = useState(EMPTY_FILTERS);
  const [trackingScheduleId, setTrackingScheduleId] = useState(null);
  const [trackingRouteFrom, setTrackingRouteFrom] = useState('');
  const [trackingRouteTo, setTrackingRouteTo] = useState('');
  const pendingPayment = useMemo(() => getPendingPayment(), []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await getMyBookings();
      const normalized = normalizeList(data).sort((a, b) => getBookingTimestamp(b) - getBookingTimestamp(a));
      setBookings(normalized);
    } catch (error) {
      toast.error(error?.message || 'Failed to load your bookings.');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedTrips = async () => {
    try {
      const data = await getMyCompletedTrips();
      setCompletedTrips(normalizeList(data));
    } catch {
      setCompletedTrips([]);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    fetchCompletedTrips();
  }, []);

  useEffect(() => {
    if (!bookings.length) return;
    const ids = [...new Set(bookings.filter(isConfirmedBooking).map(getScheduleId).filter(Boolean))];
    ids.forEach(async (sid) => {
      try {
        const p = await getSchedulePolicies(sid);
        setPolicyMap((prev) => ({ ...prev, [sid]: p }));
      } catch {}
    });
  }, [bookings]);

  const latestBooking = location.state?.latestBooking;
  const hasFreshBooking = Boolean(latestBooking);

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
    const dedupedById = [];
    const seenIds = new Set();

    merged.forEach((item) => {
      const identity = getBookingIdentity(item);
      if (!identity || !seenIds.has(identity)) {
        if (identity) seenIds.add(identity);
        dedupedById.push(item);
      }
    });

    const collapsedByTrip = new Map();

    dedupedById.forEach((item) => {
      const displayStatus = getDisplayStatus(item, pendingPayment);
      const { routeFrom, routeTo } = getBookingRouteSegment(item);
      const seats = extractSeats(item).join(',');
      const amount = Number(item?.payableAmount ?? item?.totalAmount ?? item?.amount ?? 0);
      const passengerCount = extractPassengers(item).length || extractSeats(item).length || 1;
      const tripKey = [
        routeFrom,
        routeTo,
        seats,
        amount,
        passengerCount,
        getTimestampMinuteBucket(item),
      ].join('|');

      const existing = collapsedByTrip.get(tripKey);
      if (!existing) {
        collapsedByTrip.set(tripKey, { ...item, __displayStatus: displayStatus });
        return;
      }

      const existingRank = getStatusRank(existing.__displayStatus || existing.status);
      const nextRank = getStatusRank(displayStatus);
      if (nextRank > existingRank) {
        collapsedByTrip.set(tripKey, { ...item, __displayStatus: displayStatus });
      }
    });

    return [...collapsedByTrip.values()].sort((a, b) => getBookingTimestamp(b) - getBookingTimestamp(a));
  }, [bookings, latestBooking, pendingPayment]);

  const normalizedCompletedTrips = useMemo(
    () => normalizeList(completedTrips)
      .map((trip) => ({
        ...trip,
        status: 'COMPLETED',
        __displayStatus: 'COMPLETED',
      }))
      .sort((a, b) => getBookingTimestamp(b) - getBookingTimestamp(a)),
    [completedTrips]
  );

  const reviewableByScheduleId = useMemo(() => {
    const map = new Map();
    normalizedCompletedTrips.forEach((trip) => {
      const key = String(trip?.scheduleId || '').trim();
      if (key) map.set(key, trip);
    });
    return map;
  }, [normalizedCompletedTrips]);

  const todayDateKey = useMemo(() => getTodayDateKey(), []);
  const upcomingBookings = useMemo(
    () => visibleBookings.filter((booking) => isUpcomingBooking(booking, todayDateKey)),
    [todayDateKey, visibleBookings]
  );
  const cancelledBookings = useMemo(
    () => visibleBookings.filter((booking) => String(booking?.status || '').toUpperCase() === 'CANCELLED'),
    [visibleBookings]
  );

  const tabbedBookings = useMemo(() => {
    if (tripTab === 'all') return visibleBookings;
    if (tripTab === 'completed') return normalizedCompletedTrips;
    if (tripTab === 'cancelled') return cancelledBookings;
    return upcomingBookings;
  }, [cancelledBookings, normalizedCompletedTrips, tripTab, upcomingBookings, visibleBookings]);

  const totalSpend = useMemo(
    () => visibleBookings.reduce((sum, b) => sum + Number(b?.payableAmount ?? b?.totalAmount ?? b?.amount ?? 0), 0),
    [visibleBookings]
  );

  const toggleSelect = (id) => {
    setSelectedBookings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activeFilterCount = useMemo(() => (
    activeFilters.statuses.length +
    (activeFilters.dateFrom ? 1 : 0) +
    (activeFilters.dateTo ? 1 : 0) +
    (activeFilters.minFare ? 1 : 0) +
    (activeFilters.maxFare ? 1 : 0)
  ), [activeFilters]);

  const filteredBookings = useMemo(() => {
    const hasFilters = activeFilterCount > 0;
    if (!hasFilters) return tabbedBookings;
    return tabbedBookings.filter((booking) => {
      const displayStatus = booking?.__displayStatus || getDisplayStatus(booking, pendingPayment);
      const upper = String(displayStatus).toUpperCase();
      if (activeFilters.statuses.length > 0) {
        const matched = activeFilters.statuses.some((s) => {
          if (s === 'confirmed') return ['CONFIRMED', 'PAYMENT_SUCCESSFUL'].includes(upper);
          if (s === 'completed') return upper === 'COMPLETED';
          if (s === 'cancelled') return upper === 'CANCELLED';
          if (s === 'pending') return ['PENDING', 'PAYMENT_RECEIVED'].includes(upper);
          return false;
        });
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
  }, [tabbedBookings, activeFilters, activeFilterCount, pendingPayment]);

  const viewTicket = async (booking) => {
    const rawId = String(booking?.bookingId || booking?.id || booking?.publicBookingId || booking?.bookingCode || '').trim();
    if (rawId) {
      const success = await viewTicketFromApi(rawId);
      if (success) return;
    }
    const bookingId = toDisplayBookingId(booking);
    const { routeFrom, routeTo } = getBookingRouteSegment(booking);
    const seats = extractSeats(booking);
    const passengers = extractPassengers(booking);
    const passengerLines = passengers.length
      ? passengers.map((p, i) => `${i + 1}. ${[toTitleCase(p?.firstName), toTitleCase(p?.lastName)].filter(Boolean).join(' ') || 'Traveler'} | Seat: ${p?.seatNumber || '--'}`).join('\n')
      : 'Passenger details not available';
    const text = ['TripGo Ticket', '', `Booking ID: ${bookingId}`, `Route: ${routeFrom} → ${routeTo}`, `Status: ${booking?.status || 'CONFIRMED'}`, `Amount: ₹${Number(booking?.payableAmount ?? booking?.totalAmount ?? booking?.amount ?? 0)}`, `Seats: ${seats.length ? seats.join(', ') : '--'}`, '', 'Passengers', passengerLines].join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
  const paginatedBookings = useMemo(
    () => filteredBookings.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [page, filteredBookings]
  );

  useEffect(() => {
    setPage(0);
  }, [tripTab, activeFilters]);

  useEffect(() => {
    if (page >= totalPages) {
      setPage(Math.max(totalPages - 1, 0));
    }
  }, [page, totalPages]);

  const gridActionBooking = viewMode === 'grid' && selectedBookings.size > 0
    ? paginatedBookings.find((b, i) => selectedBookings.has(toDisplayBookingId(b) || String(i))) ?? null
    : null;

  const listActionBooking = viewMode === 'list' && selectedBookings.size === 1
    ? paginatedBookings.find((b, i) => selectedBookings.has(toDisplayBookingId(b) || String(i))) ?? null
    : null;

  useEffect(() => {
    if (!latestBooking) return;

    const scheduleId = getScheduleId(latestBooking);
    const reviewableTrip = reviewableByScheduleId.get(scheduleId);
    if (!scheduleId || !reviewableTrip || reviewableTrip.alreadyRated) return;

    try {
      const lastPromptedScheduleId = localStorage.getItem(REVIEW_PROMPT_STORAGE_KEY);
      if (lastPromptedScheduleId === scheduleId) return;
      localStorage.setItem(REVIEW_PROMPT_STORAGE_KEY, scheduleId);
    } catch {
      // ignore storage errors
    }

    setReviewModalBooking({
      ...latestBooking,
      from: latestBooking?.from || reviewableTrip?.from,
      to: latestBooking?.to || reviewableTrip?.to,
      scheduleId,
    });
  }, [latestBooking, reviewableByScheduleId]);

  const isConfirmedAndToday = (booking) => {
    const upper = String(booking?.status || '').toUpperCase();
    if (!['CONFIRMED', 'PAYMENT_SUCCESSFUL'].includes(upper)) return false;
    const travelDate = getTravelDateKey(booking);
    if (!travelDate) return false;
    const today = getTodayDateKey();
    return travelDate >= today;
  };

  return (
    <>
    {trackingScheduleId && (
      <BusTrackingMap
        scheduleId={trackingScheduleId}
        routeFrom={trackingRouteFrom}
        routeTo={trackingRouteTo}
        onClose={() => setTrackingScheduleId(null)}
      />
    )}
    <UserLayout activeItem="bookings" title="My Bookings">
      <div className="space-y-5">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900">My Bookings</h1>
            <p className="text-sm text-slate-500 mt-0.5">Track and manage all your bus trips</p>
          </div>
          {hasFreshBooking && (
            <div className="rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">check_circle</span>
              Booking confirmed
            </div>
          )}
        </div>

        {/* Bento widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Spend</p>
              <div className="w-9 h-9 rounded-xl bg-[#002046]/8 flex items-center justify-center">
                <span className="material-symbols-outlined text-base text-[#002046]">payments</span>
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900">₹{totalSpend.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1.5">across {visibleBookings.length} booking{visibleBookings.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Trips Overview</p>
              <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-base text-sky-600">route</span>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Upcoming', count: upcomingBookings.length, dot: 'bg-emerald-500' },
                { label: 'Completed', count: normalizedCompletedTrips.length, dot: 'bg-sky-500' },
                { label: 'Cancelled', count: cancelledBookings.length, dot: 'bg-rose-500' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.dot}`} />
                    <span className="text-sm text-slate-500">{item.label}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-5 text-white shadow-sm relative overflow-hidden">
            <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
            <p className="text-[10px] font-semibold opacity-60 uppercase tracking-wider mb-2">TripGo Premium</p>
            <h3 className="text-lg font-black leading-snug">Priority seats &amp; zero cancellation fees</h3>
            <p className="text-xs opacity-50 mt-1.5 mb-5">Upgrade for exclusive benefits on every trip</p>
            <button onClick={() => navigate(ROUTES.USER_PREMIUM)} className="rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2 text-xs font-bold transition-colors">
              Upgrade now →
            </button>
          </div>
        </div>

        {/* Tab filter + view toggle */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1 rounded-2xl bg-white p-1.5 ring-1 ring-slate-200 shadow-sm flex-wrap">
            {[
              { id: 'all', label: 'All', count: visibleBookings.length },
              { id: 'upcoming', label: 'Upcoming', count: upcomingBookings.length },
              { id: 'completed', label: 'Completed', count: normalizedCompletedTrips.length },
              { id: 'cancelled', label: 'Cancelled', count: cancelledBookings.length },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTripTab(tab.id)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap ${tripTab === tab.id ? 'bg-[#002046] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {tab.label}
                <span className={`ml-1.5 text-xs ${tripTab === tab.id ? 'opacity-60' : 'opacity-40'}`}>({tab.count})</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setPendingFilters(activeFilters); setFilterOpen(true); }}
              className={`relative flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all ring-1 shadow-sm ${activeFilterCount > 0 ? 'bg-[#002046] text-white ring-[#002046]' : 'bg-white text-slate-600 ring-slate-200 hover:text-slate-900'}`}
            >
              <span className="material-symbols-outlined text-base">tune</span>
              Filter
              {activeFilterCount > 0 && (
                <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-black text-[#002046]">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <div className="flex items-center gap-1 rounded-2xl bg-white p-1.5 ring-1 ring-slate-200 shadow-sm">
              {[
                { id: 'list', icon: 'view_list', label: 'List' },
                { id: 'grid', icon: 'grid_view', label: 'Grid' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setViewMode(mode.id)}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition-all flex items-center gap-1.5 ${viewMode === mode.id ? 'bg-[#002046] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <span className="material-symbols-outlined text-base">{mode.icon}</span>
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid selection action bar */}
        {gridActionBooking && (() => {
          const { routeFrom: selFrom, routeTo: selTo } = getBookingRouteSegment(gridActionBooking);
          const selCanCancel = (tripTab === 'upcoming' || tripTab === 'all') && isConfirmedBooking(gridActionBooking);
          return (
            <div className="flex items-center gap-3 bg-white ring-1 ring-slate-200 rounded-2xl px-5 py-3 shadow-sm">
              <span className="material-symbols-outlined text-base text-slate-400 flex-shrink-0">confirmation_number</span>
              <span className="text-sm font-bold text-slate-800 truncate flex-1">{selFrom} → {selTo}</span>
              <button onClick={() => viewTicket(gridActionBooking)} className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors whitespace-nowrap">
                <span className="material-symbols-outlined text-base">visibility</span>
                View Ticket
              </button>
              <button onClick={() => downloadTicket(gridActionBooking)} className="flex items-center gap-1.5 rounded-xl bg-[#002046] px-4 py-2 text-sm font-semibold text-white hover:bg-[#001533] transition-colors whitespace-nowrap">
                <span className="material-symbols-outlined text-base">download</span>
                Download Ticket
              </button>
              <button onClick={() => setSelectedBookings(new Set())} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center flex-shrink-0 transition-colors">
                <span className="material-symbols-outlined text-sm text-slate-500">close</span>
              </button>
            </div>
          );
        })()}

        {/* Table card */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-10 flex justify-center">
              <InlineLoader label="Loading your bookings..." />
            </div>
          ) : tabbedBookings.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300">
                {tripTab === 'completed' ? 'task_alt' : tripTab === 'cancelled' ? 'event_busy' : 'confirmation_number'}
              </span>
              <h2 className="mt-4 text-lg font-bold text-slate-900">
                {tripTab === 'completed' ? 'No completed trips yet' : tripTab === 'cancelled' ? 'No cancelled bookings' : tripTab === 'all' ? 'No bookings yet' : 'No upcoming bookings'}
              </h2>
              <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
                {tripTab === 'completed'
                  ? 'Completed trips will appear here once the backend auto-completes them.'
                  : tripTab === 'cancelled'
                    ? 'Cancelled trips will appear here with refund status.'
                    : 'Search for a route and complete payment to create your first trip.'}
              </p>
              {(tripTab === 'upcoming' || tripTab === 'all') && (
                <button
                  onClick={() => navigate(ROUTES.DASHBOARD)}
                  className="mt-5 rounded-2xl bg-[#002046] px-6 py-3 text-sm font-bold text-white hover:bg-[#001533] transition-colors"
                >
                  Search buses
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <>
              <div className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedBookings.map((booking, index) => {
                  const bookingId = toDisplayBookingId(booking) || `TG-${index + 1}`;
                  const { routeFrom, routeTo } = getBookingRouteSegment(booking);
                  const amount = Number(booking?.payableAmount ?? booking?.totalAmount ?? booking?.amount ?? 0);
                  const busName = getBookingBusName(booking);
                  const scheduleLabel = getBookingScheduleLabel(booking);
                  const displayStatus = booking?.__displayStatus || getDisplayStatus(booking, pendingPayment);

                  const upper = String(displayStatus).toUpperCase();
                  const dotClass = ['CONFIRMED', 'PAYMENT_SUCCESSFUL'].includes(upper) ? 'bg-emerald-500'
                    : upper === 'COMPLETED' ? 'bg-sky-500'
                    : upper === 'CANCELLED' ? 'bg-rose-500' : 'bg-amber-500';
                  const statusBadgeClass = ['CONFIRMED', 'PAYMENT_SUCCESSFUL'].includes(upper) ? 'bg-emerald-50 text-emerald-700'
                    : upper === 'COMPLETED' ? 'bg-sky-50 text-sky-700'
                    : upper === 'CANCELLED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700';
                  const statusLabel = upper === 'PAYMENT_SUCCESSFUL' ? 'Paid'
                    : upper === 'PAYMENT_RECEIVED' ? 'Received' : toTitleCase(displayStatus);
                  const gridCanCancel = (tripTab === 'upcoming' || tripTab === 'all') && isConfirmedBooking(booking);
                  const { routeFrom: gFrom, routeTo: gTo } = getBookingRouteSegment(booking);
                  const isGridSelected = selectedBookings.has(bookingId);
                  const isCancelledGrid = upper === 'CANCELLED';
                  const canTrack = isConfirmedAndToday(booking);
                  const gridScheduleId = getScheduleId(booking);

                  return (
                    <div key={`${bookingId}-${index}`} onClick={() => toggleSelect(bookingId)} className={`rounded-xl ring-1 p-4 hover:shadow-md transition-all cursor-pointer ${isGridSelected ? 'bg-slate-50 ring-[#002046]/40 shadow-sm' : 'bg-white ring-slate-200'}`}>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 text-sm truncate">{routeFrom} → {routeTo}</p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{busName || bookingId}</p>
                          {isCancelledGrid && <RefundTimeline booking={booking} />}
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold flex-shrink-0 ${statusBadgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                          {statusLabel}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] text-slate-400 truncate max-w-[130px]">{scheduleLabel !== '--' ? scheduleLabel : bookingId}</p>
                          <p className="text-base font-black text-slate-900 mt-0.5">₹{amount.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); viewTicket(booking); }} title="View Ticket" className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors">
                            <span className="material-symbols-outlined text-sm">visibility</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); downloadTicket(booking); }} title="Download Ticket" className="w-8 h-8 rounded-lg bg-[#002046] text-white flex items-center justify-center hover:bg-[#001533] transition-colors">
                            <span className="material-symbols-outlined text-sm">download</span>
                          </button>
                          {gridCanCancel && policyMap[getScheduleId(booking)]?.dateChange?.allowed !== false && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setRescheduleModalBooking({ ...booking, from: gFrom, to: gTo, scheduleId: getScheduleId(booking) }); }}
                              disabled={!canReschedule(booking)}
                              title={!canReschedule(booking) ? 'Rescheduling window has closed. Must reschedule at least 12 hours before departure.' : 'Reschedule'}
                              className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-50"
                            >
                              <span className="material-symbols-outlined text-sm">edit_calendar</span>
                            </button>
                          )}
                          {gridCanCancel && (
                            <button onClick={(e) => { e.stopPropagation(); setCancelModalBooking({ ...booking, from: gFrom, to: gTo }); setCancelReason(''); }} className="flex items-center gap-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 px-2 h-8 text-xs font-semibold hover:bg-rose-100 transition-colors whitespace-nowrap">
                              Cancel
                            </button>
                          )}
                          {upper === 'COMPLETED' && (
                            <button onClick={(e) => { e.stopPropagation(); navigate(ROUTES.SEARCH_RESULTS, { state: { from: gFrom, to: gTo, date: new Date(Date.now() + 86400000).toISOString().split('T')[0] } }); }} title="Book again" className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center hover:bg-emerald-100 transition-colors">
                              <span className="material-symbols-outlined text-sm">refresh</span>
                            </button>
                          )}
                          {canTrack && gridScheduleId && (
                            <button onClick={(e) => { e.stopPropagation(); setTrackingScheduleId(gridScheduleId); setTrackingRouteFrom(gFrom); setTrackingRouteTo(gTo); }} title="Track bus" className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center hover:bg-sky-100 transition-colors">
                              <span className="material-symbols-outlined text-sm">location_on</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-slate-100 px-5 py-3.5 flex items-center justify-between gap-4">
                <p className="text-sm text-slate-400">
                  Showing {(page * PAGE_SIZE) + 1}–{Math.min(filteredBookings.length, (page + 1) * PAGE_SIZE)} of {filteredBookings.length}{activeFilterCount > 0 ? ' (filtered)' : ''}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(totalPages - 5, page - 2)) + i;
                    return (
                      <button key={pageNum} onClick={() => setPage(pageNum)} className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${page === pageNum ? 'bg-[#002046] text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{pageNum + 1}</button>
                    );
                  })}
                  <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {selectedBookings.size > 0 && (
                <div className="flex items-center gap-2 bg-white px-5 py-3 border-b border-slate-200 flex-wrap">
                  {listActionBooking && (
                    <button
                      onClick={() => viewTicket(listActionBooking)}
                      className="flex items-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap"
                    >
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      View Ticket
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      for (const booking of paginatedBookings) {
                        const id = toDisplayBookingId(booking) || '';
                        if (selectedBookings.has(id)) await downloadTicket(booking);
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-[#002046] text-white px-3 py-1.5 text-xs font-bold hover:bg-[#003a80] transition-colors whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-sm">download</span>
                    Download Tickets
                  </button>
                  <button
                    onClick={() => setSelectedBookings(new Set())}
                    className="ml-auto flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 px-3 py-1.5 text-xs font-semibold transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="w-12 px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedBookings.size === paginatedBookings.length && paginatedBookings.length > 0}
                          onChange={() => {
                            if (selectedBookings.size === paginatedBookings.length && paginatedBookings.length > 0) {
                              setSelectedBookings(new Set());
                            } else {
                              setSelectedBookings(new Set(paginatedBookings.map((b, i) => toDisplayBookingId(b) || String(i))));
                            }
                          }}
                          className="rounded border-slate-300 accent-[#002046] cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Booking ID</th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Trip</th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Date</th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Bus Type</th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Fare</th>
                      <th className="px-4 py-3.5 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paginatedBookings.map((booking, index) => {
                      const bookingId = toDisplayBookingId(booking) || `TG-${index + 1}`;
                      const { routeFrom, routeTo } = getBookingRouteSegment(booking);
                      const seats = extractSeats(booking);
                      const passengers = extractPassengers(booking);
                      const amount = Number(booking?.payableAmount ?? booking?.totalAmount ?? booking?.amount ?? 0);
                      const busName = getBookingBusName(booking);
                      const scheduleLabel = getBookingScheduleLabel(booking);
                      const scheduleId = getScheduleId(booking);
                      const reviewableTrip = reviewableByScheduleId.get(scheduleId);
                      const displayStatus = booking?.__displayStatus || getDisplayStatus(booking, pendingPayment);
                      const canRateTrip = (tripTab === 'completed' || tripTab === 'all') && reviewableTrip && !reviewableTrip.alreadyRated;
                      const canCancelBooking = (tripTab === 'upcoming' || tripTab === 'all') && isConfirmedBooking(booking);
                      const isCancelled = String(booking?.status || '').toUpperCase() === 'CANCELLED';
                      const busType = booking?.selectedType || booking?.busType || booking?.bus?.type || 'Standard';
                      const isSelected = selectedBookings.has(bookingId);

                      const upper = String(displayStatus).toUpperCase();
                      const dotClass = ['CONFIRMED', 'PAYMENT_SUCCESSFUL'].includes(upper) ? 'bg-emerald-500'
                        : upper === 'COMPLETED' ? 'bg-sky-500'
                        : upper === 'CANCELLED' ? 'bg-rose-500' : 'bg-amber-500';
                      const statusBadgeClass = ['CONFIRMED', 'PAYMENT_SUCCESSFUL'].includes(upper) ? 'bg-emerald-50 text-emerald-700'
                        : upper === 'COMPLETED' ? 'bg-sky-50 text-sky-700'
                        : upper === 'CANCELLED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700';
                      const statusLabel = upper === 'PAYMENT_SUCCESSFUL' ? 'Paid'
                        : upper === 'PAYMENT_RECEIVED' ? 'Received' : toTitleCase(displayStatus);

                      return (
                        <tr key={`${bookingId}-${index}`} className={`group transition-colors ${isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50/70'}`}>
                          <td className="px-4 py-4 text-center">
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(bookingId)} className="rounded border-slate-300 accent-[#002046] cursor-pointer" />
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm font-mono font-semibold text-slate-600">{bookingId}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
                              {statusLabel}
                            </span>
                            {isCancelled && <p className="text-[10px] text-rose-400 mt-1 whitespace-nowrap">by {getCancelledByLabel(booking?.cancelledBy)}</p>}
                          </td>
                          <td className="px-4 py-4 min-w-[180px]">
                            <p className="text-sm font-bold text-slate-900">{routeFrom} → {routeTo}</p>
                            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">
                              {busName || '—'}{seats.length > 0 ? ` · Seat ${seats.join(', ')}` : ''}
                            </p>
                            {isCancelled && <RefundTimeline booking={booking} />}
                          </td>
                          <td className="px-4 py-4 hidden md:table-cell">
                            <p className="text-sm text-slate-600 whitespace-nowrap max-w-[160px] truncate">{scheduleLabel !== '--' ? scheduleLabel : '—'}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{passengers.length || seats.length || 1} pax</p>
                          </td>
                          <td className="px-4 py-4 hidden lg:table-cell">
                            <span className="text-sm text-slate-500 capitalize">{String(busType).toLowerCase()}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm font-bold text-slate-900">₹{amount.toLocaleString()}</span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => viewTicket(booking)} title="View Ticket" className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors">
                                <span className="material-symbols-outlined text-sm">visibility</span>
                              </button>
                              <button onClick={() => downloadTicket(booking)} title="Download Ticket" className="w-8 h-8 rounded-lg bg-[#002046] text-white flex items-center justify-center hover:bg-[#001533] transition-colors">
                                <span className="material-symbols-outlined text-sm">download</span>
                              </button>
                              {canCancelBooking && policyMap[getScheduleId(booking)]?.dateChange?.allowed !== false && (
                                <button
                                  onClick={() => { const { routeFrom: rf, routeTo: rt } = getBookingRouteSegment(booking); setRescheduleModalBooking({ ...booking, from: rf, to: rt, scheduleId: getScheduleId(booking) }); }}
                                  disabled={!canReschedule(booking)}
                                  title={!canReschedule(booking) ? 'Rescheduling window has closed. Must reschedule at least 12 hours before departure.' : 'Reschedule'}
                                  className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-50"
                                >
                                  <span className="material-symbols-outlined text-sm">edit_calendar</span>
                                </button>
                              )}
                              {canRateTrip && (
                                <button onClick={() => setReviewModalBooking({ ...booking, scheduleId, from: routeFrom, to: routeTo })} title="Rate this trip" className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center hover:bg-amber-100 transition-colors">
                                  <span className="material-symbols-outlined text-sm">star</span>
                                </button>
                              )}
                              {String(booking?.status || '').toUpperCase() === 'COMPLETED' && (
                                <button onClick={() => navigate(ROUTES.SEARCH_RESULTS, { state: { from: routeFrom, to: routeTo, date: new Date(Date.now() + 86400000).toISOString().split('T')[0] } })} title="Book again" className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center hover:bg-emerald-100 transition-colors">
                                  <span className="material-symbols-outlined text-sm">refresh</span>
                                </button>
                              )}
                              {isConfirmedAndToday(booking) && getScheduleId(booking) && (
                                <button onClick={() => { const { routeFrom: rf, routeTo: rt } = getBookingRouteSegment(booking); setTrackingScheduleId(getScheduleId(booking)); setTrackingRouteFrom(rf); setTrackingRouteTo(rt); }} title="Track bus" className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center hover:bg-sky-100 transition-colors">
                                  <span className="material-symbols-outlined text-sm">location_on</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-100 px-5 py-3.5 flex items-center justify-between gap-4">
                <p className="text-sm text-slate-400">
                  Showing {(page * PAGE_SIZE) + 1}–{Math.min(filteredBookings.length, (page + 1) * PAGE_SIZE)} of {filteredBookings.length}{activeFilterCount > 0 ? ' (filtered)' : ''}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(totalPages - 5, page - 2)) + i;
                    return (
                      <button key={pageNum} onClick={() => setPage(pageNum)} className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${page === pageNum ? 'bg-[#002046] text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{pageNum + 1}</button>
                    );
                  })}
                  <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
      <FilterModal
        open={filterOpen}
        filters={pendingFilters}
        onChange={setPendingFilters}
        onClose={() => setFilterOpen(false)}
        onApply={() => { setActiveFilters(pendingFilters); setFilterOpen(false); }}
        onReset={() => { setPendingFilters(EMPTY_FILTERS); setActiveFilters(EMPTY_FILTERS); setFilterOpen(false); }}
      />
      {reviewModalBooking ? (
        <RatingModal
          booking={reviewModalBooking}
          submitting={submittingReview}
          onClose={() => setReviewModalBooking(null)}
          onSubmit={async ({ rating, comment }) => {
            try {
              setSubmittingReview(true);
              await submitTripRating(reviewModalBooking.scheduleId, {
                rating,
                title: `${rating} star review`,
                comment: comment.trim(),
              });
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
      ) : null}
      {cancelModalBooking ? (
        <UserCancelModal
          booking={cancelModalBooking}
          reason={cancelReason}
          setReason={setCancelReason}
          submitting={cancellingBookingId === String(cancelModalBooking?.bookingId || cancelModalBooking?.id || '')}
          onClose={() => {
            setCancelModalBooking(null);
            setCancelReason('');
          }}
          onConfirm={async () => {
            const bookingId = String(cancelModalBooking?.bookingId || cancelModalBooking?.id || '').trim();
            if (!bookingId) return toast.error('Booking ID missing for cancellation.');
            try {
              setCancellingBookingId(bookingId);
              const result = await cancelMyBooking(bookingId, cancelReason.trim());
              const refundAmount = Number(result?.refundAmount ?? calculateUserRefundPreview(cancelModalBooking).amount ?? 0);
              const refundStatus = String(result?.refundStatus || '').toUpperCase();
              toast.success(
                refundAmount > 0
                  ? `Booking cancelled. Refund of ₹${refundAmount} ${refundStatus === 'PROCESSED' ? 'processed.' : 'will reflect in 5-7 days.'}`
                  : 'Booking cancelled. No refund is applicable for this timing.'
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
      ) : null}
      {cancellingBookingId ? <CenterScreenLoader label="Cancelling your booking..." /> : null}
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
