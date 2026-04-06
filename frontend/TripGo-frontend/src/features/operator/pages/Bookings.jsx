import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../../shared/contexts/AuthContext';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { getOperatorBookings, cancelOperatorBooking } from '../../../api/operatorBookingService';
import { ROUTES } from '../../../shared/constants/routes';
import './OperatorDashboard.css';

const STATUS_TABS = ['ALL', 'CONFIRMED', 'CANCELLED'];

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

const Bookings = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState('ALL');
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [confirmCancelBookingId, setConfirmCancelBookingId] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'OPERATOR') navigate(ROUTES.HOME);
  }, [user, loading, navigate]);

  const fetchBookings = async (nextStatus = status) => {
    try {
      setLoadingBookings(true);
      const data = await getOperatorBookings(nextStatus === 'ALL' ? undefined : nextStatus);
      setBookings(normalizeList(data));
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

  const handleCancelBooking = async (bookingId) => {
    try {
      setCancellingId(bookingId);
      await cancelOperatorBooking(bookingId);
      toast.success('Booking cancelled');
      await fetchBookings(status);
    } catch (e) {
      toast.error(e.message || 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  const summary = useMemo(() => {
    const total = bookings.length;
    const cancelled = bookings.filter(b => String(pick(b, ['status'], '')).toUpperCase() === 'CANCELLED').length;
    return { total, cancelled, active: total - cancelled };
  }, [bookings]);

  return (
    <OperatorLayout activeItem="bookings" title="Bookings">
      <div className="flex items-center gap-3 mb-6">
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setStatus(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              status === tab
                ? 'bg-primary text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-op-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500">Total</p>
          <p className="text-2xl font-bold">{summary.total}</p>
        </div>
        <div className="bg-white dark:bg-op-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500">Active</p>
          <p className="text-2xl font-bold text-green-600">{summary.active}</p>
        </div>
        <div className="bg-white dark:bg-op-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500">Cancelled</p>
          <p className="text-2xl font-bold text-red-600">{summary.cancelled}</p>
        </div>
      </div>

      {loadingBookings ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-slate-500">Loading bookings...</p>
          </div>
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white dark:bg-op-card rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 mb-3">confirmation_number</span>
          <p className="text-slate-500">No bookings found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const bookingId = pick(booking, ['id', 'bookingId'], '');
            const displayBookingId = toDisplayBookingId(booking);
            const bookingStatus = String(pick(booking, ['status'], 'UNKNOWN')).toUpperCase();
            const passengers = extractPassengers(booking);
            const passenger = passengers.length
              ? [passengers[0]?.firstName, passengers[0]?.lastName].filter(Boolean).join(' ')
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
                    {passengers.length > 1 ? <p className="text-xs text-slate-500">Passengers: {passengers.map((item) => [item?.firstName, item?.lastName].filter(Boolean).join(' ') || item?.seatNumber).join(', ')}</p> : null}
                    {createdAt && <p className="text-xs text-slate-500">Booked: {new Date(createdAt).toLocaleString()}</p>}
                  </div>
                  <div className="text-right space-y-2">
                    <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                      bookingStatus === 'CANCELLED'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {bookingStatus}
                    </span>
                    {amount !== null && amount !== undefined && (
                      <p className="text-sm font-bold text-primary">₹{amount}</p>
                    )}
                    {bookingStatus !== 'CANCELLED' && bookingId && (
                      <button
                        onClick={() => setConfirmCancelBookingId(bookingId)}
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

      {confirmCancelBookingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-op-card rounded-xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-500">warning</span>
              </div>
              <div>
                <h3 className="text-lg font-bold">Cancel Booking</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Are you sure you want to cancel booking <span className="font-semibold">{confirmCancelBookingId}</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmCancelBookingId(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Keep Booking
              </button>
              <button
                onClick={async () => {
                  const targetId = confirmCancelBookingId;
                  setConfirmCancelBookingId(null);
                  await handleCancelBooking(targetId);
                }}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </OperatorLayout>
  );
};

export default Bookings;
