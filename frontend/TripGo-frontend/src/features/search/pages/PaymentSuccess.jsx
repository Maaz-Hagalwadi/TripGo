import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import UserLayout from '../../../shared/components/UserLayout';
import { getMyBookings } from '../../../api/bookingService';
import { confirmBookingPayment } from '../../../api/paymentService';
import { ROUTES } from '../../../shared/constants/routes';

const PAYMENT_STORAGE_KEY = 'tripgo_pending_payment';
const PAYMENT_INTENT_CACHE_KEY = 'tripgo_payment_intent_cache';
const PAYMENT_FLOW_STORAGE_KEY = 'tripgo_payment_flow_state';
const CURRENT_BOOKING_STORAGE_KEY = 'tripgo_current_booking_state';
const BOOKING_DRAFT_PREFIX = 'tripgo_booking_draft_';

const toDraftKeyPart = (value) => String(value || '')
  .trim()
  .replace(/[^a-zA-Z0-9_-]+/g, '-');

const findMatchingBooking = (bookings, pendingPayment) => {
  if (!pendingPayment) return null;
  const pendingIds = [
    pendingPayment.bookingId,
    pendingPayment.bookingCode,
    pendingPayment.paymentIntentId,
  ].filter(Boolean).map(String);

  return bookings.find((booking) => {
    const candidates = [
      booking?.bookingId,
      booking?.id,
      booking?.bookingCode,
      booking?.publicBookingId,
      booking?.reference,
      booking?.paymentIntentId,
    ].filter(Boolean).map(String);
    return pendingIds.some((id) => candidates.includes(id));
  }) || null;
};

const buildLatestBookingFallback = (pendingPayment, paymentIntentId) => {
  if (!pendingPayment) return null;
  const bookingState = pendingPayment?.bookingState || {};
  const passengers = Array.isArray(bookingState?.passengers) ? bookingState.passengers : [];

  return {
    id: pendingPayment?.bookingId || paymentIntentId || pendingPayment?.paymentIntentId || `pending-${Date.now()}`,
    bookingId: pendingPayment?.bookingId || '',
    bookingCode: pendingPayment?.bookingCode || '',
    paymentIntentId: paymentIntentId || pendingPayment?.paymentIntentId || '',
    scheduleId: pendingPayment?.scheduleId || bookingState?.scheduleId || bookingState?.bus?.scheduleId || '',
    from: bookingState?.searchParams?.from || '',
    to: bookingState?.searchParams?.to || '',
    busName: bookingState?.bus?.busName || bookingState?.bus?.name || '',
    seatNumbers: bookingState?.selectedSeats || [],
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
  };
};

const InfoCard = ({ icon, title, children }) => (
  <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
    <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
      <div className="w-9 h-9 rounded-xl bg-[#002046]/[0.08] flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-[#002046] text-lg">{icon}</span>
      </div>
      <p className="text-sm font-black text-slate-900">{title}</p>
    </div>
    <div className="px-5 py-5">{children}</div>
  </div>
);

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Verifying your booking...');

  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const redirectStatus = query.get('redirect_status');
  const paymentIntentId = query.get('payment_intent');
  const pendingPayment = useMemo(() => {
    try {
      const raw = localStorage.getItem(PAYMENT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);
  const paymentSucceeded = redirectStatus === 'succeeded' || Boolean(paymentIntentId);

  useEffect(() => {
    if (redirectStatus && redirectStatus !== 'succeeded') {
      toast.error('Payment was not completed.');
      navigate(ROUTES.BOOKING, { replace: true, state: pendingPayment?.bookingState || null });
      return;
    }

    let cancelled = false;

    const verifyBooking = async () => {
      try {
        if (pendingPayment?.bookingId && (paymentIntentId || pendingPayment?.paymentIntentId)) {
          try {
            await confirmBookingPayment(
              pendingPayment.bookingId,
              paymentIntentId || pendingPayment.paymentIntentId
            );
          } catch {
            // ignore — webhook may have already confirmed it
          }
        }

        for (let attempt = 0; attempt < 6; attempt += 1) {
          const response = await getMyBookings();
          const bookings = Array.isArray(response) ? response : Array.isArray(response?.bookings) ? response.bookings : Array.isArray(response?.data) ? response.data : [];
          const match = findMatchingBooking(bookings, {
            ...pendingPayment,
            paymentIntentId: paymentIntentId || pendingPayment?.paymentIntentId,
          });
          const matchStatus = String(match?.status || '').toUpperCase();

          if (match && ['CONFIRMED', 'PAYMENT_SUCCESSFUL', 'PENDING'].includes(matchStatus)) {
            if (cancelled) return;
            setBooking(match);
            setStatusMessage(matchStatus === 'CONFIRMED' ? 'Booking confirmed successfully.' : 'Payment received. Booking is syncing to your account.');
            if (matchStatus === 'CONFIRMED') {
              localStorage.removeItem(PAYMENT_STORAGE_KEY);
              sessionStorage.removeItem(PAYMENT_INTENT_CACHE_KEY);
              sessionStorage.removeItem(PAYMENT_FLOW_STORAGE_KEY);
              localStorage.removeItem(CURRENT_BOOKING_STORAGE_KEY);
              if (pendingPayment?.scheduleId) {
                localStorage.removeItem(`${BOOKING_DRAFT_PREFIX}${pendingPayment.scheduleId}`);
                localStorage.removeItem(
                  `${BOOKING_DRAFT_PREFIX}${toDraftKeyPart(pendingPayment.scheduleId)}_${toDraftKeyPart(pendingPayment?.travelDate || pendingPayment?.bookingState?.searchParams?.date || 'unscheduled')}`
                );
              }
            }
            setLoading(false);
            return;
          }

          if (match && String(match?.status || '').toUpperCase() === 'FAILED') {
            if (cancelled) return;
            toast.error('Payment failed. Please try again.');
            navigate(ROUTES.BOOKING, { replace: true, state: pendingPayment?.bookingState || null });
            return;
          }

          setStatusMessage(
            paymentSucceeded
              ? `Payment received. Waiting for booking confirmation${attempt < 5 ? '...' : '.'}`
              : `Waiting for booking confirmation${attempt < 5 ? '...' : '.'}`
          );
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        if (!cancelled && paymentSucceeded) {
          const fallbackBooking = buildLatestBookingFallback(pendingPayment, paymentIntentId);
          if (fallbackBooking) {
            setBooking(fallbackBooking);
            setStatusMessage('Payment received. Your booking will appear in My Bookings shortly.');
          }
        }
      } catch (error) {
        if (!cancelled) {
          setStatusMessage(error?.message || 'Unable to verify booking right now.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    verifyBooking();
    return () => { cancelled = true; };
  }, [navigate, paymentSucceeded, pendingPayment, paymentIntentId, redirectStatus]);

  const visualState = booking
    ? 'confirmed'
    : paymentSucceeded
      ? 'paid'
      : 'pending';

  const iconName = visualState === 'pending' ? 'hourglass_top' : 'check_circle';
  const heading = visualState === 'confirmed'
    ? 'Booking confirmed'
    : visualState === 'paid'
      ? 'Payment successful'
      : 'Processing payment';
  const subheading = visualState === 'confirmed'
    ? 'Your seats are booked and ready to view in My Bookings.'
    : visualState === 'paid'
      ? 'Your payment went through. We are finishing booking confirmation in the background.'
      : statusMessage;

  const headerAccent = visualState === 'confirmed'
    ? { icon: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Confirmed' }
    : visualState === 'paid'
      ? { icon: 'text-white', dot: 'bg-white', label: 'Payment received' }
      : { icon: 'text-amber-400', dot: 'bg-amber-400', label: 'Pending' };

  return (
    <UserLayout activeItem="bookings" title="Payment Status" showHeaderSearch={false}>
      <div className="space-y-5">

        {/* Navy gradient header */}
        <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] px-5 py-5 text-white shadow-sm relative overflow-hidden">
          <div className="absolute -top-3 -right-3 text-7xl opacity-10 select-none">★</div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
              <span className={`material-symbols-outlined text-4xl ${headerAccent.icon}`}>{iconName}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold opacity-60 uppercase tracking-widest mb-1">Payment Status</p>
              <h1 className="text-2xl font-black">{heading}</h1>
              <p className="text-sm opacity-70 mt-1">{subheading}</p>
            </div>
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest">
                <span className={`h-2.5 w-2.5 rounded-full ${headerAccent.dot}`} />
                {headerAccent.label}
              </div>
            </div>
          </div>
          {loading && !booking && (
            <div className="mt-4 flex items-center gap-2 opacity-70 text-sm">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span>Confirming your booking...</span>
            </div>
          )}
        </div>

        {/* Booking code + Payment status */}
        <div className="grid gap-5 md:grid-cols-2">
          <InfoCard icon="confirmation_number" title="Booking code">
            <p className="text-xl font-black text-slate-900">
              {pendingPayment?.bookingCode || booking?.bookingCode || 'Generating...'}
            </p>
            <p className="mt-2 text-sm text-slate-500">Keep this code handy for support and trip tracking.</p>
          </InfoCard>

          <InfoCard icon="payments" title="Payment status">
            <p className="text-xl font-black text-slate-900">
              {visualState === 'confirmed' ? 'Confirmed' : visualState === 'paid' ? 'Paid, syncing booking' : 'Processing'}
            </p>
            <p className="mt-2 text-sm text-slate-500">Your payment has been received safely.</p>
          </InfoCard>
        </div>

        {/* Info banner */}
        <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-5">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined mt-0.5 text-xl text-amber-500 flex-shrink-0">info</span>
            <div>
              <p className="font-bold text-slate-900">
                {visualState === 'confirmed' ? 'Your booking is confirmed.' : 'Payment received successfully.'}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {visualState === 'confirmed'
                  ? 'You can now open My Bookings to view your ticket details and trip info.'
                  : 'We are finishing your booking confirmation. This usually takes only a few seconds.'}
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => navigate(ROUTES.USER_BOOKINGS, { replace: true, state: booking ? { latestBooking: booking } : undefined })}
            className="rounded-xl bg-[#002046] px-6 py-3 text-sm font-bold text-white hover:bg-[#003a80] transition-colors"
          >
            Go to My Bookings
          </button>
          <button
            onClick={() => navigate(ROUTES.SEARCH_RESULTS)}
            className="rounded-xl bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Search More Buses
          </button>
        </div>

      </div>
    </UserLayout>
  );
};

export default PaymentSuccess;
