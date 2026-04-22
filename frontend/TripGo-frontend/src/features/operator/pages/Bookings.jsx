import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../../shared/contexts/AuthContext';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import PaginationControls from '../../../shared/components/ui/PaginationControls';
import { getOperatorBookings, cancelOperatorBooking } from '../../../api/operatorBookingService';
import { ROUTES } from '../../../shared/constants/routes';
import './OperatorDashboard.css';

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
    return {
      label: 'CONFIRMED',
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    };
  }

  if (paymentStatus === 'SUCCESS' && bookingStatus === 'PENDING') {
    return {
      label: 'PAYMENT RECEIVED',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    };
  }

  if (paymentStatus === 'FAILED') {
    return {
      label: 'PAYMENT FAILED',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
  }

  if (paymentStatus === 'INITIATED' || !paymentStatus) {
    return {
      label: 'AWAITING PAYMENT',
      className: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300',
    };
  }

  if (bookingStatus === 'CANCELLED') {
    return {
      label: 'CANCELLED',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
  }

  return {
    label: bookingStatus || 'UNKNOWN',
    className: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300',
  };
};

const getTripStatusValue = (booking) => String(
  pick(booking, ['tripStatus', 'scheduleStatus', 'currentStatus', 'status'], '')
).toUpperCase();

const getRefundStatusMeta = (refundStatus) => {
  const upper = String(refundStatus || 'NA').toUpperCase();
  if (upper === 'PROCESSED') return { label: 'Refund Processed', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' };
  if (upper === 'PENDING') return { label: 'Refund Pending (5-7 days)', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
  return { label: 'No Refund', className: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300' };
};

const getCancelledByLabel = (cancelledBy) => {
  const upper = String(cancelledBy || '').toUpperCase();
  if (!upper) return '--';
  if (upper === 'USER') return 'User';
  if (upper === 'OPERATOR') return 'Operator';
  if (upper === 'SYSTEM') return 'System';
  return upper;
};

const OperatorCancelModal = ({ reason, setReason, error, onClose, onConfirm, submitting }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-op-card rounded-xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800">
      <h3 className="text-lg font-bold">Cancel Booking</h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">100% refund will be issued to the passenger.</p>
      <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
        100% refund will be issued to the passenger.
      </div>
      <div className="mt-5">
        <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-white">Cancellation reason</label>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={4}
          placeholder="Tell the passenger why this booking is being cancelled."
          className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200/70 focus:ring-2 focus:ring-primary dark:bg-white/[0.04] dark:text-white dark:ring-white/10"
        />
        {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
      </div>
      <div className="mt-6 flex gap-3 justify-end">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Keep Booking</button>
        <button onClick={onConfirm} disabled={submitting || !reason.trim()} className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-60">
          {submitting ? 'Cancelling...' : 'Confirm Cancel'}
        </button>
      </div>
    </div>
  </div>
);

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
  const [viewMode, setViewMode] = useState('grid');
  const [page, setPage] = useState(0);
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
  }, [status]);

  useEffect(() => {
    if (page >= totalPages) {
      setPage(Math.max(totalPages - 1, 0));
    }
  }, [page, totalPages]);

  return (
    <OperatorLayout activeItem="bookings" title="Bookings">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setStatus(tab)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                status === tab
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab === 'ALL' ? 'All' : tab === 'CONFIRMED' ? 'Confirmed' : 'Cancelled'}
            </button>
          ))}
        </div>
        <div className="inline-flex shrink-0 rounded-2xl bg-slate-100 p-1 dark:bg-white/5">
          {['grid', 'list'].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${viewMode === mode ? 'bg-white text-slate-900 shadow-sm dark:bg-black/40 dark:text-white' : 'text-slate-500 dark:text-slate-300'}`}
            >
              {mode === 'grid' ? 'Grid' : 'List'}
            </button>
          ))}
        </div>
      </div>

      {notificationBookingCode ? (
        <div className="mb-4 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
          Showing booking results for <span className="font-bold">{notificationBookingCode}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white dark:bg-op-card p-3 md:p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] md:text-xs text-slate-500">Total</p>
          <p className="text-lg md:text-2xl font-bold">{summary.total}</p>
        </div>
        <div className="bg-white dark:bg-op-card p-3 md:p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] md:text-xs text-slate-500">Active</p>
          <p className="text-lg md:text-2xl font-bold text-green-600">{summary.active}</p>
        </div>
        <div className="bg-white dark:bg-op-card p-3 md:p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] md:text-xs text-slate-500">Cancelled</p>
          <p className="text-lg md:text-2xl font-bold text-red-600">{summary.cancelled}</p>
        </div>
      </div>

      {loadingBookings ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-slate-500">Loading bookings...</p>
          </div>
        </div>
      ) : visibleBookings.length === 0 ? (
        <div className="bg-white dark:bg-op-card rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 mb-3">confirmation_number</span>
          <p className="text-slate-500">{notificationBookingCode ? 'No matching booking found' : 'No bookings found'}</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4' : 'space-y-3'}>
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
            const routeName = pick(booking, ['routeName', 'tripName'], '') || [pick(booking, ['from', 'source', 'origin'], ''), pick(booking, ['to', 'destination'], '')].filter(Boolean).join(' to ') || '-';
            const seatNumbers = extractSeats(booking);
            const seatNo = seatNumbers.length ? seatNumbers.join(', ') : pick(booking, ['seatNumber', 'seatNo', 'seat'], '-');
            const amount = pick(booking, ['payableAmount', 'amount', 'fare', 'totalAmount'], null);
            const createdAt = pick(booking, ['createdAt', 'bookingTime', 'bookedAt'], null);

            return (
              <div key={bookingId || JSON.stringify(booking)} className="bg-white dark:bg-op-card rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{passenger}</p>
                    <p className="text-xs text-slate-500">Booking ID: {displayBookingId}</p>
                    <p className="text-xs text-slate-500">Route: {routeName}</p>
                    <p className="text-xs text-slate-500">Seat: {seatNo}</p>
                    {passengers.length > 1 ? <p className="text-xs text-slate-500">Passengers: {passengers.map((item) => [toTitleCase(item?.firstName), toTitleCase(item?.lastName)].filter(Boolean).join(' ') || item?.seatNumber).join(', ')}</p> : null}
                    {createdAt && <p className="text-xs text-slate-500">Booked: {new Date(createdAt).toLocaleString()}</p>}
                    {bookingStatus === 'CANCELLED' ? (
                      <div className="mt-3 space-y-1 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200/70 dark:bg-black/30 dark:ring-white/10">
                        <p className="text-xs text-slate-500">Cancelled By: <span className="font-medium text-slate-700 dark:text-slate-200">{getCancelledByLabel(booking?.cancelledBy)}</span></p>
                        <p className="text-xs text-slate-500">Reason: <span className="font-medium text-slate-700 dark:text-slate-200">{booking?.cancelReason || '--'}</span></p>
                        <p className="text-xs text-slate-500">Refund Amount: <span className="font-medium text-slate-700 dark:text-slate-200">₹{Number(booking?.refundAmount ?? 0)}</span></p>
                        <div className="pt-1">
                          <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${getRefundStatusMeta(booking?.refundStatus).className}`}>
                            {getRefundStatusMeta(booking?.refundStatus).label}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="text-right space-y-2">
                    <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${paymentAwareStatus.className}`}>
                      {paymentAwareStatus.label}
                    </span>
                    {amount !== null && amount !== undefined && (
                      <p className="text-sm font-bold text-primary">₹{amount}</p>
                    )}
                    {(tripStatus === 'STARTED' || tripStatus === 'COMPLETED') ? (
                      <p className="text-xs font-medium text-slate-400">Cannot cancel after trip start.</p>
                    ) : null}
                    {bookingStatus !== 'CANCELLED' && bookingStatus !== 'COMPLETED' && tripStatus !== 'STARTED' && tripStatus !== 'COMPLETED' && bookingId && (
                      <button
                        onClick={() => {
                          setConfirmCancelBookingId(bookingId);
                          setCancelReason('');
                          setCancelReasonError('');
                        }}
                        disabled={cancellingId === bookingId}
                        className="px-3 py-1.5 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        {cancellingId === bookingId ? 'Cancelling...' : 'Cancel Booking'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loadingBookings && visibleBookings.length > 0 ? (
        <PaginationControls
          page={page}
          pageSize={PAGE_SIZE}
          totalItems={visibleBookings.length}
          onPageChange={setPage}
          itemLabel="bookings"
          className="mt-6"
        />
      ) : null}

      {confirmCancelBookingId && (
        <OperatorCancelModal
          reason={cancelReason}
          setReason={(value) => {
            setCancelReason(value);
            setCancelReasonError('');
          }}
          error={cancelReasonError}
          submitting={cancellingId === confirmCancelBookingId}
          onClose={() => {
            setConfirmCancelBookingId(null);
            setCancelReason('');
            setCancelReasonError('');
          }}
          onConfirm={async () => {
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
