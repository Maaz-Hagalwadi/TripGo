import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import UserLayout from '../../../shared/components/UserLayout';
import PaginationControls from '../../../shared/components/ui/PaginationControls';
import { cancelMyBooking, getMyBookings } from '../../../api/bookingService';
import { getMyCompletedTrips, submitTripRating } from '../../../api/reviewService';
import { ROUTES } from '../../../shared/constants/routes';
import { formatUtcDateTime } from '../../../shared/utils/scheduleSearchUtils';

const PAYMENT_STORAGE_KEY = 'tripgo_pending_payment';
const REVIEW_PROMPT_STORAGE_KEY = 'tripgo_last_review_prompt';
const PAGE_SIZE = 6;

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

const getStatusClass = (status) => {
  const upper = String(status || '').toUpperCase();
  if (upper === 'CONFIRMED') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300';
  if (upper === 'PAYMENT_SUCCESSFUL') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300';
  if (upper === 'PAYMENT_RECEIVED') return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300';
  if (upper === 'COMPLETED') return 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300';
  if (upper === 'CANCELLED') return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300';
  return 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300';
};

const getRefundStatusMeta = (refundStatus) => {
  const upper = String(refundStatus || 'NA').toUpperCase();
  if (upper === 'PROCESSED') return { label: 'Processed ✅', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' };
  if (upper === 'PENDING') return { label: 'Pending ⏳', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' };
  return { label: 'No Refund ❌', className: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300' };
};

const getCancelledByLabel = (cancelledBy) => {
  const upper = String(cancelledBy || '').toUpperCase();
  if (!upper) return '--';
  if (upper === 'USER') return 'You';
  if (upper === 'OPERATOR') return 'The operator';
  if (upper === 'SYSTEM') return 'Cancelled by System';
  return upper;
};

const getCancelledTimestamp = (booking) => (
  booking?.cancelledAt ||
  booking?.updatedAt ||
  booking?.modifiedAt ||
  booking?.lastUpdatedAt ||
  null
);

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

const InlineLoader = ({ label }) => (
  <div className="inline-flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/40 border-t-primary" />
    <span>{label}</span>
  </div>
);

const CenterScreenLoader = ({ label }) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
    <div className="flex min-w-[260px] flex-col items-center gap-4 rounded-[28px] bg-white px-8 py-7 text-center shadow-2xl ring-1 ring-slate-200/70 dark:bg-[linear-gradient(180deg,#080808_0%,#121212_100%)] dark:ring-white/10">
      <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-primary/25 border-t-primary" />
      <div>
        <p className="text-base font-bold text-slate-900 dark:text-white">{label}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Please wait while we update your booking.</p>
      </div>
    </div>
  </div>
);

const RatingModal = ({ booking, onClose, onSubmit, submitting }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl ring-1 ring-slate-200/70 dark:bg-[linear-gradient(180deg,#080808_0%,#121212_100%)] dark:ring-white/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Rate your trip</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{booking?.from || '--'} to {booking?.to || '--'}</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Share a quick review to help future travelers choose with confidence.</p>
          </div>
          <button onClick={onClose} className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="mt-6">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">How was your trip?</p>
          <div className="mt-3 flex gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                className={`rounded-2xl px-4 py-3 text-lg font-bold transition ${
                  rating === value
                    ? 'bg-primary text-black'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-white">Review comment</label>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
            placeholder="Tell us about seat comfort, punctuality, boarding, or overall experience."
            className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200/70 focus:ring-2 focus:ring-primary dark:bg-white/[0.04] dark:text-white dark:ring-white/10"
          />
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15">
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
      <div className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-2xl ring-1 ring-slate-200/70 dark:bg-[linear-gradient(180deg,#080808_0%,#121212_100%)] dark:ring-white/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Cancel booking</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{booking?.from || '--'} to {booking?.to || '--'}</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Review the refund policy before cancelling this trip.</p>
          </div>
          <button onClick={onClose} className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70 dark:bg-white/[0.03] dark:ring-white/10">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Refund policy</p>
          <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <p>{'>'} 24 hrs: 75% refund</p>
            <p>12-24 hrs: 50% refund</p>
            <p>4-12 hrs: 25% refund</p>
            <p>{'<'} 4 hrs: No refund</p>
          </div>
          <div className="mt-4 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200/70 dark:bg-black/40 dark:ring-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Estimated refund</p>
            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">₹{preview.amount}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{preview.percent}% refund based on current departure window.</p>
          </div>
        </div>
        <div className="mt-5">
          <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-white">Cancellation reason</label>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            placeholder="Tell us why you want to cancel this booking."
            className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200/70 focus:ring-2 focus:ring-primary dark:bg-white/[0.04] dark:text-white dark:ring-white/10"
          />
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15">
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

const downloadTicket = (booking) => {
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

const UserBookings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completedTrips, setCompletedTrips] = useState([]);
  const [reviewModalBooking, setReviewModalBooking] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [tripTab, setTripTab] = useState('upcoming');
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingBookingId, setCancellingBookingId] = useState('');
  const [page, setPage] = useState(0);
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

  const tabbedBookings = useMemo(
    () => {
      if (tripTab === 'completed') return normalizedCompletedTrips;
      if (tripTab === 'cancelled') return cancelledBookings;
      return upcomingBookings;
    },
    [cancelledBookings, normalizedCompletedTrips, tripTab, upcomingBookings]
  );
  const totalPages = Math.max(1, Math.ceil(tabbedBookings.length / PAGE_SIZE));
  const paginatedBookings = useMemo(
    () => tabbedBookings.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [page, tabbedBookings]
  );

  useEffect(() => {
    setPage(0);
  }, [tripTab]);

  useEffect(() => {
    if (page >= totalPages) {
      setPage(Math.max(totalPages - 1, 0));
    }
  }, [page, totalPages]);

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

  return (
    <UserLayout activeItem="bookings" title="My Bookings">
      <div className="space-y-6">
        <div className="rounded-[30px] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:bg-[linear-gradient(180deg,rgba(12,12,12,0.96)_0%,rgba(6,6,6,0.98)_100%)] dark:ring-white/10">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Traveler Dashboard</p>
              <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">My bookings</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Track confirmed trips, seat numbers, travel details, and payment summary in one place.
              </p>
              <div className="mt-4 inline-flex rounded-2xl bg-slate-100 p-1 dark:bg-white/5">
                {[
                  { id: 'upcoming', label: `Upcoming (${upcomingBookings.length})` },
                  { id: 'completed', label: `Completed (${normalizedCompletedTrips.length})` },
                  { id: 'cancelled', label: `Cancelled (${cancelledBookings.length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTripTab(tab.id)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tripTab === tab.id ? 'bg-white text-slate-900 shadow-sm dark:bg-black/40 dark:text-white' : 'text-slate-500 dark:text-slate-300'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="inline-flex rounded-2xl bg-slate-100 p-1 dark:bg-white/5">
              {['grid', 'list'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${viewMode === mode ? 'bg-white text-slate-900 shadow-sm dark:bg-black/40 dark:text-white' : 'text-slate-500 dark:text-slate-300'}`}
                >
                  {mode === 'grid' ? 'Grid' : 'List'}
                </button>
              ))}
            </div>
          </div>
          {hasFreshBooking ? (
            <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
              Your latest booking was confirmed successfully and is shown below.
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="rounded-[30px] bg-white p-6 text-sm text-slate-500 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:bg-[linear-gradient(180deg,rgba(12,12,12,0.96)_0%,rgba(6,6,6,0.98)_100%)] dark:text-slate-400 dark:ring-white/10">
            <InlineLoader label="Loading your bookings..." />
          </div>
        ) : tabbedBookings.length === 0 ? (
          <div className="rounded-[30px] bg-white p-8 text-center shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:bg-[linear-gradient(180deg,rgba(12,12,12,0.96)_0%,rgba(6,6,6,0.98)_100%)] dark:ring-white/10">
            <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">
              {tripTab === 'completed' ? 'task_alt' : tripTab === 'cancelled' ? 'event_busy' : 'confirmation_number'}
            </span>
            <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
              {tripTab === 'completed' ? 'No completed trips yet' : tripTab === 'cancelled' ? 'No cancelled bookings' : 'No upcoming bookings'}
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {tripTab === 'completed'
                ? 'Completed trips will appear here once the backend auto-completes them after arrival.'
                : tripTab === 'cancelled'
                  ? 'Cancelled trips will appear here with the reason, cancelled date, and refund status.'
                : 'Search for a route, lock your seats, and complete payment to create your next trip.'}
            </p>
            {tripTab === 'upcoming' ? (
              <button
                onClick={() => navigate(ROUTES.DASHBOARD)}
                className="mt-5 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-black hover:bg-primary/90"
              >
                Search buses
              </button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200/70 dark:bg-white/[0.03] dark:ring-white/10 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Showing {(page * PAGE_SIZE) + 1}-{Math.min(tabbedBookings.length, (page + 1) * PAGE_SIZE)} of {tabbedBookings.length} bookings
              </p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Page {page + 1} / {totalPages}
              </p>
            </div>

            <div className={viewMode === 'grid' ? 'grid gap-4 xl:grid-cols-2' : 'space-y-4'}>
              {paginatedBookings.map((booking, index) => {
                const bookingId = toDisplayBookingId(booking) || `TG-${index + 1}`;
              const { routeFrom, routeTo } = getBookingRouteSegment(booking);
              const seats = extractSeats(booking);
              const passengers = extractPassengers(booking);
              const bookedAt = booking?.bookedAt || booking?.createdAt || booking?.bookingTime;
              const amount = Number(booking?.payableAmount ?? booking?.totalAmount ?? booking?.amount ?? 0);
              const busName = getBookingBusName(booking);
              const scheduleLabel = getBookingScheduleLabel(booking);
              const scheduleId = getScheduleId(booking);
              const reviewableTrip = reviewableByScheduleId.get(scheduleId);
              const displayStatus = booking?.__displayStatus || getDisplayStatus(booking, pendingPayment);
              const canRateTrip = tripTab === 'completed' && reviewableTrip && !reviewableTrip.alreadyRated;
              const canCancelBooking = tripTab === 'upcoming' && isConfirmedBooking(booking);
                return (
                  <div key={`${bookingId}-${index}`} className="rounded-[30px] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:bg-[linear-gradient(180deg,rgba(12,12,12,0.96)_0%,rgba(6,6,6,0.98)_100%)] dark:ring-white/10">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white">{routeFrom} to {routeTo}</h2>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(displayStatus)}`}>
                          {displayStatus === 'PAYMENT_SUCCESSFUL'
                            ? 'PAYMENT SUCCESSFUL'
                            : displayStatus === 'PAYMENT_RECEIVED'
                              ? 'PAYMENT RECEIVED'
                              : displayStatus}
                        </span>
                      </div>
                      {busName ? <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{busName}</p> : null}
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Booking ID: {bookingId}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Booked on {formatDateTime(bookedAt)}</p>
                    </div>
                    <div className="rounded-2xl bg-primary/10 px-4 py-3 text-right dark:bg-primary/12 dark:ring-1 dark:ring-primary/20">
                      <p className="text-xs uppercase tracking-[0.18em] text-primary/80">Amount paid</p>
                      <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">₹{amount}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70 dark:bg-white/[0.03] dark:ring-white/10">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Seats</p>
                      <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">{seats.length ? seats.join(', ') : '--'}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70 dark:bg-white/[0.03] dark:ring-white/10">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Passengers</p>
                      <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">{passengers.length ? `${passengers.length} traveler(s)` : `${seats.length || 1} traveler(s)`}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70 dark:bg-white/[0.03] dark:ring-white/10">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Schedule</p>
                      <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">{scheduleLabel}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70 dark:bg-white/[0.03] dark:ring-white/10">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Passenger Details</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Seat number, traveler name, age, gender, and phone.</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {canRateTrip ? (
                          <button
                            onClick={() => setReviewModalBooking({ ...booking, scheduleId, from: routeFrom, to: routeTo })}
                            className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-bold text-amber-800 hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/25"
                          >
                            Rate this trip
                          </button>
                        ) : null}
                        {canCancelBooking ? (
                          <button
                            onClick={() => {
                              setCancelModalBooking({ ...booking, from: routeFrom, to: routeTo });
                              setCancelReason('');
                            }}
                            className="rounded-xl bg-red-100 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-200 dark:bg-red-500/15 dark:text-red-200 dark:hover:bg-red-500/25"
                          >
                            Cancel
                          </button>
                        ) : null}
                        <button
                          onClick={() => downloadTicket(booking)}
                          className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-black hover:bg-primary/90"
                        >
                          Download Ticket
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {String(booking?.status || '').toUpperCase() === 'CANCELLED' ? (
                        <div className="rounded-2xl bg-white px-4 py-4 ring-1 ring-slate-200/70 dark:bg-black/40 dark:ring-white/10">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Cancelled By</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{getCancelledByLabel(booking?.cancelledBy)}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Cancelled On</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatDateTime(getCancelledTimestamp(booking))}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Reason</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{booking?.cancelReason || '--'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Refund Amount</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">₹{Number(booking?.refundAmount ?? 0)}</p>
                            </div>
                          </div>
                          <div className="mt-4">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getRefundStatusMeta(booking?.refundStatus).className}`}>
                              Refund Status: {getRefundStatusMeta(booking?.refundStatus).label}
                            </span>
                          </div>
                        </div>
                      ) : null}
                      {passengers.length ? passengers.map((item, passengerIndex) => (
                        <div key={`${bookingId}-passenger-${passengerIndex}`} className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200/70 dark:bg-black/40 dark:ring-white/10">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">{[toTitleCase(item?.firstName), toTitleCase(item?.lastName)].filter(Boolean).join(' ') || `Traveler ${passengerIndex + 1}`}</p>
                              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Age: {item?.age ?? '--'} • Gender: {item?.gender || '--'} • Phone: {item?.phone || '--'}
                              </p>
                            </div>
                            <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                              Seat {item?.seatNumber || '--'}
                            </div>
                          </div>
                        </div>
                      )) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Passenger details will appear here once the booking API returns traveler information for this booking.</p>
                      )}
                    </div>
                  </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && tabbedBookings.length > 0 ? (
          <PaginationControls
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={tabbedBookings.length}
            onPageChange={setPage}
            itemLabel="bookings"
          />
        ) : null}
      </div>
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
    </UserLayout>
  );
};

export default UserBookings;
