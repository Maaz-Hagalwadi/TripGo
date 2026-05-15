import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../../shared/contexts/AuthContext';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { getOperatorBookings, cancelOperatorBooking } from '../../../api/operatorBookingService';
import { ROUTES } from '../../../shared/constants/routes';

const STATUS_TABS = ['CONFIRMED', 'CANCELLED', 'ALL'];
const PAGE_SIZE = 10;

const normalizeList = (resp) => {
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp?.content)) return resp.content;
  if (Array.isArray(resp?.data)) return resp.data;
  return [];
};

const pick = (obj, keys, fallback = '') => {
  for (const key of keys) {
    const val = obj?.[key];
    if (val !== undefined && val !== null && val !== '') return val;
  }
  return fallback;
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
      phone: seat?.passenger?.phone,
    }));
  }
  return [];
};

const getPaymentAwareStatus = (booking) => {
  const bookingStatus = String(pick(booking, ['status'], '')).toUpperCase();
  const paymentStatus = String(pick(booking, ['paymentStatus'], '')).toUpperCase();

  if (bookingStatus === 'CONFIRMED') {
    return { label: 'CONFIRMED', type: 'confirmed' };
  }
  if (paymentStatus === 'SUCCESS' && bookingStatus === 'PENDING') {
    return { label: 'PAYMENT RECEIVED', type: 'pending' };
  }
  if (paymentStatus === 'FAILED') {
    return { label: 'PAYMENT FAILED', type: 'cancelled' };
  }
  if (paymentStatus === 'INITIATED' || !paymentStatus) {
    return { label: 'AWAITING PAYMENT', type: 'neutral' };
  }
  if (bookingStatus === 'CANCELLED') {
    return { label: 'CANCELLED', type: 'cancelled' };
  }
  return { label: bookingStatus || 'UNKNOWN', type: 'neutral' };
};

const getStatusBadgeClass = (type) => {
  if (type === 'confirmed') return 'bg-emerald-50 text-emerald-700';
  if (type === 'pending') return 'bg-amber-50 text-amber-700';
  if (type === 'cancelled') return 'bg-rose-50 text-rose-700';
  return 'bg-slate-100 text-slate-600';
};

const getTripStatusValue = (booking) => String(
  pick(booking, ['tripStatus', 'scheduleStatus', 'currentStatus', 'status'], '')
).toUpperCase();

const getRefundStatusMeta = (refundStatus) => {
  const upper = String(refundStatus || 'NA').toUpperCase();
  if (upper === 'PROCESSED') return { label: 'Refund Processed', type: 'confirmed' };
  if (upper === 'PENDING') return { label: 'Refund Pending (5-7 days)', type: 'pending' };
  return { label: 'No Refund', type: 'neutral' };
};

const getCancelledByLabel = (cancelledBy) => {
  const upper = String(cancelledBy || '').toUpperCase();
  if (!upper) return '--';
  if (upper === 'USER') return 'User';
  if (upper === 'OPERATOR') return 'Operator';
  if (upper === 'SYSTEM') return 'System';
  return upper;
};

const toTitleCase = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/\b\w/g, (char) => char.toUpperCase());

const getBookingTimestamp = (booking) => {
  const raw = pick(booking, ['createdAt', 'bookingTime', 'bookedAt'], null);
  const time = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
};

const getBookingPriority = (booking) => {
  const bookingStatus = String(pick(booking, ['status'], '')).toUpperCase();
  const paymentStatus = String(pick(booking, ['paymentStatus'], '')).toUpperCase();

  if (bookingStatus === 'CONFIRMED') return 5;
  if (paymentStatus === 'SUCCESS' && bookingStatus === 'PENDING') return 4;
  if (bookingStatus === 'PENDING') return 3;
  if (bookingStatus === 'CANCELLED') return 2;
  return 1;
};

const buildBookingFingerprint = (booking) => {
  const passengers = extractPassengers(booking);
  const firstPassenger = passengers[0] || {};
  const seatNumbers = extractSeats(booking).join(',').toUpperCase();
  const routeName = [
    pick(booking, ['from', 'source', 'origin'], ''),
    pick(booking, ['to', 'destination'], ''),
  ].map((value) => String(value || '').trim().toUpperCase()).join('|');
  const departureTime = String(pick(booking, ['departureTime'], '')).trim().toUpperCase();
  const passengerName = [
    firstPassenger?.firstName,
    firstPassenger?.lastName,
  ].map((value) => String(value || '').trim().toUpperCase()).filter(Boolean).join(' ');
  const passengerPhone = String(firstPassenger?.phone || pick(booking, ['phone'], '')).trim();
  const amount = String(pick(booking, ['payableAmount', 'amount', 'fare', 'totalAmount'], '')).trim();

  return [routeName, departureTime, seatNumbers, passengerName, passengerPhone, amount].join('|');
};

const getBookingSearchTokens = (booking) => {
  const rawId = String(pick(booking, ['publicBookingId', 'bookingCode', 'bookingNumber', 'pnr', 'bookingId', 'id', 'reference'], '')).trim();
  const displayId = toDisplayBookingId(booking);
  return [rawId, displayId]
    .filter(Boolean)
    .map((value) => String(value).trim().toUpperCase());
};

const dedupeAndSortBookings = (list) => {
  const deduped = new Map();
  const DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

  list.forEach((booking) => {
    const key = buildBookingFingerprint(booking);
    const current = deduped.get(key);

    if (!current) {
      deduped.set(key, booking);
      return;
    }

    const currentPriority = getBookingPriority(current);
    const nextPriority = getBookingPriority(booking);
    const currentTimestamp = getBookingTimestamp(current);
    const nextTimestamp = getBookingTimestamp(booking);
    const isLikelySameCheckoutAttempt = Math.abs(nextTimestamp - currentTimestamp) <= DUPLICATE_WINDOW_MS;

    if (!isLikelySameCheckoutAttempt) {
      const uniqueKey = `${key}|${pick(booking, ['id', 'bookingId', 'bookingCode'], deduped.size)}`;
      deduped.set(uniqueKey, booking);
      return;
    }

    if (nextPriority > currentPriority) {
      deduped.set(key, booking);
      return;
    }

    if (nextPriority === currentPriority && nextTimestamp > currentTimestamp) {
      deduped.set(key, booking);
    }
  });

  return Array.from(deduped.values()).sort((a, b) => getBookingTimestamp(b) - getBookingTimestamp(a));
};

/* ── Cancel Modal ── */
const OperatorCancelModal = ({ reason, setReason, error, onClose, onConfirm, submitting }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div className="w-full max-w-sm sm:max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200/70 max-h-[85vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 flex-shrink-0">
        <div>
          <h3 className="text-base font-black text-slate-900">Cancel Booking</h3>
          <p className="text-xs text-slate-500 mt-0.5">A full refund will be issued to the passenger.</p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
        >
          <span className="material-symbols-outlined text-sm text-slate-500">close</span>
        </button>
      </div>

      {/* Body */}
      <div className="overflow-y-auto flex-1 min-h-0 px-5 py-4 space-y-4">
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
          100% refund will be issued to the passenger.
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-900">Cancellation reason</label>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            placeholder="Tell the passenger why this booking is being cancelled."
            className="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40"
          />
          {error ? <p className="mt-2 text-sm text-rose-500">{error}</p> : null}
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-3 px-5 py-3 border-t border-slate-100 flex-shrink-0">
        <button
          onClick={onClose}
          className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Keep Booking
        </button>
        <button
          onClick={onConfirm}
          disabled={submitting || !reason.trim()}
          className="flex-1 rounded-2xl bg-rose-500 py-2.5 text-sm font-bold text-white hover:bg-rose-600 transition-colors disabled:opacity-60"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Cancelling...
            </span>
          ) : 'Confirm Cancel'}
        </button>
      </div>
    </div>
  </div>
);

/* ── Main Component ── */
const Bookings = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState('CONFIRMED');
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [confirmCancelBookingId, setConfirmCancelBookingId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonError, setCancelReasonError] = useState('');
  const [page, setPage] = useState(0);
  const [selectedBookingIds, setSelectedBookingIds] = useState(new Set());
  const [bulkCancelIds, setBulkCancelIds] = useState([]);
  const notificationBookingCode = String(searchParams.get('bookingCode') || '').trim().toUpperCase();

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'OPERATOR') navigate(ROUTES.HOME);
  }, [user, loading, navigate]);

  const fetchBookings = async (nextStatus = status) => {
    try {
      setLoadingBookings(true);
      const data = await getOperatorBookings(nextStatus === 'ALL' ? undefined : nextStatus);
      setBookings(dedupeAndSortBookings(normalizeList(data)));
    } catch (e) {
      setBookings([]);
      toast.error(e.message || 'Failed to load bookings');
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    fetchBookings(status);
  }, [status]);

  useEffect(() => {
    if (notificationBookingCode) {
      setStatus('ALL');
    }
  }, [notificationBookingCode]);

  const toggleId = (setter, id) => setter(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleBulkCancelBookings = async () => {
    const normalizedReason = cancelReason.trim();
    if (!normalizedReason) { setCancelReasonError('Cancellation reason is required.'); return; }
    try {
      setCancelReasonError('');
      setCancellingId('__BULK__');
      await Promise.all(bulkCancelIds.map(id => cancelOperatorBooking(id, normalizedReason)));
      toast.success(`${bulkCancelIds.length} booking(s) cancelled.`);
      setSelectedBookingIds(new Set());
      setBulkCancelIds([]);
      setConfirmCancelBookingId(null);
      setCancelReason('');
      await fetchBookings(status);
    } catch (e) {
      toast.error(e.message || 'Failed to cancel some bookings');
    } finally {
      setCancellingId(null);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    const normalizedReason = cancelReason.trim();
    if (!normalizedReason) {
      setCancelReasonError('Cancellation reason is required.');
      return;
    }
    try {
      setCancelReasonError('');
      setCancellingId(bookingId);
      const result = await cancelOperatorBooking(bookingId, normalizedReason);
      const refundAmount = Number(result?.refundAmount ?? 0);
      toast.success(refundAmount > 0 ? `Booking cancelled. Full refund of ₹${refundAmount} will be issued.` : 'Booking cancelled');
      await fetchBookings(status);
    } catch (e) {
      toast.error(e.message || 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  const visibleBookings = useMemo(() => {
    if (!notificationBookingCode) return bookings;
    return bookings.filter((booking) => getBookingSearchTokens(booking).some((token) => token.includes(notificationBookingCode)));
  }, [bookings, notificationBookingCode]);

  const summary = useMemo(() => {
    const total = visibleBookings.length;
    const cancelled = visibleBookings.filter(b => String(pick(b, ['status'], '')).toUpperCase() === 'CANCELLED').length;
    return { total, cancelled, active: total - cancelled };
  }, [visibleBookings]);

  const totalPages = Math.max(1, Math.ceil(visibleBookings.length / PAGE_SIZE));
  const paginatedBookings = useMemo(
    () => visibleBookings.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [visibleBookings, page]
  );

  useEffect(() => {
    setPage(0);
    setSelectedBookingIds(new Set());
  }, [status]);

  useEffect(() => {
    if (page >= totalPages) {
      setPage(Math.max(totalPages - 1, 0));
    }
  }, [page, totalPages]);

  return (
    <OperatorLayout activeItem="bookings" title="Bookings">
      <div className="space-y-5">

        {/* Page header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Bookings</h1>
          <p className="hidden sm:block text-sm text-slate-500 mt-0.5">View and manage passenger bookings across your fleet</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-3 sm:p-5 text-white shadow-sm relative overflow-hidden">
            <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
            <p className="text-[9px] sm:text-[10px] font-semibold opacity-60 uppercase tracking-wider mb-1.5 sm:mb-2">Total Bookings</p>
            {loadingBookings ? (
              <div className="animate-pulse space-y-2">
                <div className="h-7 sm:h-9 w-12 sm:w-16 bg-white/20 rounded" />
                <div className="h-3 w-16 sm:w-28 bg-white/10 rounded" />
              </div>
            ) : (
              <>
                <p className="text-2xl sm:text-3xl font-black">{summary.total}</p>
                <p className="text-[10px] sm:text-xs opacity-50 mt-1 sm:mt-1.5">all bookings</p>
              </>
            )}
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-3 sm:p-5 text-white shadow-sm relative overflow-hidden">
            <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
            <p className="text-[9px] sm:text-[10px] font-semibold opacity-60 uppercase tracking-wider mb-1.5 sm:mb-2">Active</p>
            {loadingBookings ? (
              <div className="animate-pulse space-y-2">
                <div className="h-7 sm:h-9 w-12 sm:w-16 bg-white/20 rounded" />
                <div className="h-3 w-16 sm:w-28 bg-white/10 rounded" />
              </div>
            ) : (
              <>
                <p className="text-2xl sm:text-3xl font-black">{summary.active}</p>
                <p className="text-[10px] sm:text-xs opacity-50 mt-1 sm:mt-1.5">confirmed bookings</p>
              </>
            )}
          </div>

          <div className="hidden sm:block rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-3 sm:p-5 text-white shadow-sm relative overflow-hidden">
            <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
            <p className="text-[9px] sm:text-[10px] font-semibold opacity-60 uppercase tracking-wider mb-1.5 sm:mb-2">Cancelled</p>
            {loadingBookings ? (
              <div className="animate-pulse space-y-2">
                <div className="h-7 sm:h-9 w-12 sm:w-16 bg-white/20 rounded" />
                <div className="h-3 w-16 sm:w-28 bg-white/10 rounded" />
              </div>
            ) : (
              <>
                <p className="text-2xl sm:text-3xl font-black">{summary.cancelled}</p>
                <p className="text-[10px] sm:text-xs opacity-50 mt-1 sm:mt-1.5">cancelled bookings</p>
              </>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 rounded-2xl bg-white p-1.5 ring-1 ring-slate-200 shadow-sm w-fit">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatus(tab)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap ${
                status === tab
                  ? 'bg-[#002046] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab === 'ALL' ? 'All' : tab === 'CONFIRMED' ? 'Confirmed' : 'Cancelled'}
            </button>
          ))}
        </div>

        {/* Notification filter banner */}
        {notificationBookingCode ? (
          <div className="rounded-2xl bg-[#002046]/5 px-4 py-3 text-sm text-slate-700 ring-1 ring-[#002046]/20">
            Showing results for booking <span className="font-bold text-[#002046]">{notificationBookingCode}</span>
          </div>
        ) : null}

        {/* Main content card */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden shadow-sm">

          {loadingBookings ? (
            <div className="p-10 flex items-center justify-center gap-3 text-sm text-slate-500">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#002046]/30 border-t-[#002046]" />
              Loading bookings...
            </div>

          ) : visibleBookings.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300">confirmation_number</span>
              <h2 className="mt-4 text-lg font-bold text-slate-900">
                {notificationBookingCode ? 'No matching booking found' : 'No bookings found'}
              </h2>
              <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
                {notificationBookingCode
                  ? `No booking matched the code "${notificationBookingCode}".`
                  : status !== 'ALL'
                  ? 'No bookings match this status filter.'
                  : 'Bookings will appear here once passengers start booking your buses.'}
              </p>
            </div>

          ) : (
            <>
              {selectedBookingIds.size > 0 && (() => {
                const cancelableIds = [...selectedBookingIds].filter(id => {
                  const b = visibleBookings.find(bk => pick(bk, ['id', 'bookingId'], '') === id);
                  if (!b) return false;
                  const bs = String(pick(b, ['status'], '')).toUpperCase();
                  const ts = getTripStatusValue(b);
                  return bs !== 'CANCELLED' && bs !== 'COMPLETED' && ts !== 'STARTED' && ts !== 'COMPLETED';
                });
                return (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#002046] text-white text-[10px] font-black">{selectedBookingIds.size}</span>
                    <span className="text-xs font-semibold text-slate-600">selected</span>
                    {cancelableIds.length > 0 && (
                      <button
                        onClick={() => { setBulkCancelIds(cancelableIds); setConfirmCancelBookingId('__BULK__'); setCancelReason(''); setCancelReasonError(''); }}
                        className="px-3.5 py-1 rounded-full bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 transition-colors"
                      >
                        Cancel Booking
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedBookingIds(new Set())}
                      className="px-3 py-1 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                );
              })()}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="px-4 py-3 sm:py-3.5 w-10">
                        <input
                          type="checkbox"
                          checked={paginatedBookings.length > 0 && paginatedBookings.every(b => selectedBookingIds.has(pick(b, ['id', 'bookingId'], '')))}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedBookingIds(prev => { const n = new Set(prev); paginatedBookings.forEach(b => n.add(pick(b, ['id', 'bookingId'], ''))); return n; });
                            } else {
                              setSelectedBookingIds(prev => { const n = new Set(prev); paginatedBookings.forEach(b => n.delete(pick(b, ['id', 'bookingId'], ''))); return n; });
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 accent-[#002046] cursor-pointer"
                        />
                      </th>
                      <th className="px-4 sm:px-5 py-3 sm:py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Passenger</th>
                      <th className="px-4 sm:px-5 py-3 sm:py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Booking ID</th>
                      <th className="px-4 sm:px-5 py-3 sm:py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Route</th>
                      <th className="px-4 sm:px-5 py-3 sm:py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Seat(s)</th>
                      <th className="px-4 sm:px-5 py-3 sm:py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 sm:px-5 py-3 sm:py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Amount</th>
                      <th className="px-4 sm:px-5 py-3 sm:py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden xl:table-cell">Booked At</th>
                      <th className="px-4 sm:px-5 py-3 sm:py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedBookings.map((booking) => {
                      const bookingId = pick(booking, ['id', 'bookingId'], '');
                      const displayBookingId = toDisplayBookingId(booking);
                      const bookingStatus = String(pick(booking, ['status'], 'UNKNOWN')).toUpperCase();
                      const tripStatus = getTripStatusValue(booking);
                      const paymentAwareStatus = getPaymentAwareStatus(booking);
                      const passengers = extractPassengers(booking);
                      const passenger = passengers.length
                        ? [toTitleCase(passengers[0]?.firstName), toTitleCase(passengers[0]?.lastName)].filter(Boolean).join(' ')
                        : pick(booking, ['passengerName', 'customerName', 'userName', 'name'], 'Passenger');
                      const routeName =
                        pick(booking, ['routeName', 'tripName'], '') ||
                        [pick(booking, ['from', 'source', 'origin'], ''), pick(booking, ['to', 'destination'], '')].filter(Boolean).join(' → ') ||
                        '-';
                      const seatNumbers = extractSeats(booking);
                      const seatNo = seatNumbers.length ? seatNumbers.join(', ') : pick(booking, ['seatNumber', 'seatNo', 'seat'], '-');
                      const amount = pick(booking, ['payableAmount', 'amount', 'fare', 'totalAmount'], null);
                      const createdAt = pick(booking, ['createdAt', 'bookingTime', 'bookedAt'], null);
                      const canCancel =
                        bookingStatus !== 'CANCELLED' &&
                        bookingStatus !== 'COMPLETED' &&
                        tripStatus !== 'STARTED' &&
                        tripStatus !== 'COMPLETED' &&
                        bookingId;

                      return (
                        <tr key={bookingId || JSON.stringify(booking)} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 sm:py-4 w-10" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedBookingIds.has(bookingId)}
                              onChange={() => toggleId(setSelectedBookingIds, bookingId)}
                              className="w-4 h-4 rounded border-slate-300 accent-[#002046] cursor-pointer"
                            />
                          </td>
                          {/* Passenger */}
                          <td className="px-4 sm:px-5 py-3 sm:py-4">
                            <p className="text-sm font-bold text-slate-900 truncate max-w-[140px]">{passenger}</p>
                            {passengers.length > 1 && (
                              <p className="text-xs text-slate-400 mt-0.5">+{passengers.length - 1} more</p>
                            )}
                          </td>

                          {/* Booking ID */}
                          <td className="px-4 sm:px-5 py-3 sm:py-4">
                            <span className="text-xs font-mono text-slate-600">{displayBookingId}</span>
                            {createdAt && (
                              <p className="sm:hidden text-[10px] text-slate-400 mt-0.5">
                                {new Date(createdAt).toLocaleDateString()}
                              </p>
                            )}
                          </td>

                          {/* Route */}
                          <td className="px-4 sm:px-5 py-3 sm:py-4 hidden md:table-cell">
                            <span className="text-sm text-slate-600 truncate max-w-[160px] block">{routeName}</span>
                          </td>

                          {/* Seat(s) */}
                          <td className="px-4 sm:px-5 py-3 sm:py-4 hidden sm:table-cell">
                            <span className="text-sm text-slate-600 font-mono">{seatNo}</span>
                          </td>

                          {/* Status */}
                          <td className="px-4 sm:px-5 py-3 sm:py-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(paymentAwareStatus.type)}`}>
                              {paymentAwareStatus.label}
                            </span>
                            {bookingStatus === 'CANCELLED' && (
                              <div className="mt-1">
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(getRefundStatusMeta(booking?.refundStatus).type)}`}>
                                  {getRefundStatusMeta(booking?.refundStatus).label}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Amount */}
                          <td className="px-4 sm:px-5 py-3 sm:py-4 hidden lg:table-cell">
                            {amount !== null && amount !== undefined ? (
                              <span className="text-sm font-bold text-[#002046]">₹{amount}</span>
                            ) : (
                              <span className="text-sm text-slate-400">—</span>
                            )}
                          </td>

                          {/* Booked At */}
                          <td className="px-4 sm:px-5 py-3 sm:py-4 hidden xl:table-cell">
                            {createdAt ? (
                              <span className="text-xs text-slate-500">{new Date(createdAt).toLocaleString()}</span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="hidden sm:table-cell px-4 sm:px-5 py-3 sm:py-4">
                            <div className="flex items-center justify-end gap-1">
                              {(tripStatus === 'STARTED' || tripStatus === 'COMPLETED') ? (
                                <span className="text-xs text-slate-400">Trip started</span>
                              ) : canCancel ? (
                                <button
                                  onClick={() => {
                                    setConfirmCancelBookingId(bookingId);
                                    setCancelReason('');
                                    setCancelReasonError('');
                                  }}
                                  disabled={cancellingId === bookingId}
                                  title="Cancel booking"
                                  className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors disabled:opacity-50"
                                >
                                  {cancellingId === bookingId ? (
                                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-300 border-t-rose-500" />
                                  ) : (
                                    <span className="material-symbols-outlined text-sm">cancel</span>
                                  )}
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Cancelled booking details — expandable info shown below table for cancelled rows on mobile */}
              {paginatedBookings.some(b => String(pick(b, ['status'], '')).toUpperCase() === 'CANCELLED') && (
                <div className="sm:hidden divide-y divide-slate-100 border-t border-slate-100">
                  {paginatedBookings
                    .filter(b => String(pick(b, ['status'], '')).toUpperCase() === 'CANCELLED')
                    .map((booking) => {
                      const bookingId = pick(booking, ['id', 'bookingId'], '');
                      const displayBookingId = toDisplayBookingId(booking);
                      return (
                        <div key={`detail-${bookingId}`} className="px-4 py-3 space-y-1">
                          <p className="text-xs font-semibold text-slate-500">{displayBookingId} — Cancellation details</p>
                          <p className="text-xs text-slate-500">
                            Cancelled by: <span className="font-medium text-slate-700">{getCancelledByLabel(booking?.cancelledBy)}</span>
                          </p>
                          <p className="text-xs text-slate-500">
                            Reason: <span className="font-medium text-slate-700">{booking?.cancelReason || '--'}</span>
                          </p>
                          <p className="text-xs text-slate-500">
                            Refund: <span className="font-medium text-slate-700">₹{Number(booking?.refundAmount ?? 0)}</span>
                          </p>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Mobile cancel buttons */}
              <div className="sm:hidden divide-y divide-slate-100 border-t border-slate-100">
                {paginatedBookings.map((booking) => {
                  const bookingId = pick(booking, ['id', 'bookingId'], '');
                  const bookingStatus = String(pick(booking, ['status'], 'UNKNOWN')).toUpperCase();
                  const tripStatus = getTripStatusValue(booking);
                  const canCancel =
                    bookingStatus !== 'CANCELLED' &&
                    bookingStatus !== 'COMPLETED' &&
                    tripStatus !== 'STARTED' &&
                    tripStatus !== 'COMPLETED' &&
                    bookingId;

                  if (!canCancel) return null;
                  return (
                    <div key={`mobile-action-${bookingId}`} className="px-4 py-2.5 flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-500 font-mono">{toDisplayBookingId(booking)}</span>
                      <button
                        onClick={() => {
                          setConfirmCancelBookingId(bookingId);
                          setCancelReason('');
                          setCancelReasonError('');
                        }}
                        disabled={cancellingId === bookingId}
                        className="flex items-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 px-3 py-1.5 text-xs font-semibold hover:bg-rose-100 transition-colors disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-xs">cancel</span>
                        Cancel Booking
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Pagination */}
          {!loadingBookings && visibleBookings.length > PAGE_SIZE && (
            <div className="border-t border-slate-100 px-5 py-3.5 flex items-center justify-between gap-4">
              <p className="text-sm text-slate-400">
                Showing {page * PAGE_SIZE + 1}–{Math.min(visibleBookings.length, (page + 1) * PAGE_SIZE)} of {visibleBookings.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(totalPages - 5, page - 2)) + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
                        page === pageNum ? 'bg-[#002046] text-white' : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Cancel modal */}
      {confirmCancelBookingId && (
        <OperatorCancelModal
          reason={cancelReason}
          setReason={(value) => {
            setCancelReason(value);
            setCancelReasonError('');
          }}
          error={cancelReasonError}
          submitting={cancellingId === confirmCancelBookingId || cancellingId === '__BULK__'}
          onClose={() => {
            setConfirmCancelBookingId(null);
            setCancelReason('');
            setCancelReasonError('');
            setBulkCancelIds([]);
          }}
          onConfirm={async () => {
            if (confirmCancelBookingId === '__BULK__') {
              await handleBulkCancelBookings();
              return;
            }
            const targetId = confirmCancelBookingId;
            const normalizedReason = cancelReason.trim();
            if (!normalizedReason) {
              setCancelReasonError('Cancellation reason is required.');
              return;
            }
            await handleCancelBooking(targetId);
            setConfirmCancelBookingId(null);
            setCancelReason('');
          }}
        />
      )}
    </OperatorLayout>
  );
};

export default Bookings;
