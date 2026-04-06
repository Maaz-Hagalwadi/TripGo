import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import UserLayout from '../../../shared/components/UserLayout';
import { getMyBookings } from '../../../api/bookingService';
import { ROUTES } from '../../../shared/constants/routes';

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.bookings)) return data.bookings;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const formatDateTime = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const getStatusClass = (status) => {
  const upper = String(status || '').toUpperCase();
  if (upper === 'CONFIRMED') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300';
  if (upper === 'CANCELLED') return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300';
  return 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300';
};

const extractSeats = (booking) => {
  if (Array.isArray(booking?.seatNumbers)) return booking.seatNumbers;
  if (Array.isArray(booking?.seats)) return booking.seats.map((seat) => seat?.seatNumber || seat).filter(Boolean);
  if (Array.isArray(booking?.bookingSeats)) return booking.bookingSeats.map((seat) => seat?.seatNumber).filter(Boolean);
  if (Array.isArray(booking?.passengers)) return booking.passengers.map((item) => item?.seatNumber).filter(Boolean);
  return [];
};

const UserBookings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const data = await getMyBookings();
        setBookings(normalizeList(data));
      } catch (error) {
        toast.error(error?.message || 'Failed to load your bookings.');
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const latestBooking = location.state?.latestBooking;
  const hasFreshBooking = Boolean(latestBooking);

  const visibleBookings = useMemo(() => {
    if (!latestBooking) return bookings;
    const latestId = latestBooking?.bookingId || latestBooking?.id || latestBooking?.reference;
    if (!latestId) return bookings;
    const exists = bookings.some((item) => String(item?.bookingId || item?.id || item?.reference) === String(latestId));
    return exists ? bookings : [latestBooking, ...bookings];
  }, [bookings, latestBooking]);

  return (
    <UserLayout activeItem="bookings" title="My Bookings">
      <div className="space-y-6">
        <div className="rounded-[30px] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:bg-[linear-gradient(180deg,rgba(12,12,12,0.96)_0%,rgba(6,6,6,0.98)_100%)] dark:ring-white/10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Traveler Dashboard</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">My bookings</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Track confirmed trips, seat numbers, travel details, and payment summary in one place.
          </p>
          {hasFreshBooking ? (
            <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
              Your latest booking was confirmed successfully and is shown below.
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="rounded-[30px] bg-white p-6 text-sm text-slate-500 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:bg-[linear-gradient(180deg,rgba(12,12,12,0.96)_0%,rgba(6,6,6,0.98)_100%)] dark:text-slate-400 dark:ring-white/10">
            Loading your bookings...
          </div>
        ) : visibleBookings.length === 0 ? (
          <div className="rounded-[30px] bg-white p-8 text-center shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:bg-[linear-gradient(180deg,rgba(12,12,12,0.96)_0%,rgba(6,6,6,0.98)_100%)] dark:ring-white/10">
            <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">confirmation_number</span>
            <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">No bookings yet</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Search for a route, lock your seats, and complete payment to create your first booking.</p>
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              className="mt-5 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-black hover:bg-primary/90"
            >
              Search buses
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleBookings.map((booking, index) => {
              const bookingId = booking?.bookingId || booking?.id || booking?.reference || `BOOKING-${index + 1}`;
              const routeFrom = booking?.from || booking?.source || booking?.origin || booking?.route?.from || '--';
              const routeTo = booking?.to || booking?.destination || booking?.route?.to || '--';
              const seats = extractSeats(booking);
              const passengers = Array.isArray(booking?.passengers) ? booking.passengers : [];
              const passengerNames = passengers.map((item) => [item?.firstName, item?.lastName].filter(Boolean).join(' ')).filter(Boolean);
              const bookedAt = booking?.bookedAt || booking?.createdAt || booking?.bookingTime;
              const amount = Number(booking?.payableAmount ?? booking?.totalAmount ?? booking?.amount ?? 0);
              const status = booking?.status || 'CONFIRMED';

              return (
                <div key={`${bookingId}-${index}`} className="rounded-[30px] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:bg-[linear-gradient(180deg,rgba(12,12,12,0.96)_0%,rgba(6,6,6,0.98)_100%)] dark:ring-white/10">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white">{routeFrom} to {routeTo}</h2>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(status)}`}>{status}</span>
                      </div>
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
                      <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">{passengerNames.length ? passengerNames.join(', ') : `${passengers.length || seats.length || 1} traveler(s)`}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70 dark:bg-white/[0.03] dark:ring-white/10">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Schedule</p>
                      <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">{booking?.scheduleId || booking?.schedule?.id || '--'}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default UserBookings;
