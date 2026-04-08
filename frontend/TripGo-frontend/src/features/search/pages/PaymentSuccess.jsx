import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import UserLayout from '../../../shared/components/UserLayout';
import { getMyBookings } from '../../../api/bookingService';
import { ROUTES } from '../../../shared/constants/routes';

const PAYMENT_STORAGE_KEY = 'tripgo_pending_payment';
const PAYMENT_INTENT_CACHE_KEY = 'tripgo_payment_intent_cache';

const getBookingIdentity = (item) => String(
  item?.bookingId ||
  item?.id ||
  item?.bookingCode ||
  item?.publicBookingId ||
  item?.reference ||
  ''
).trim();

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
        for (let attempt = 0; attempt < 6; attempt += 1) {
          const response = await getMyBookings();
          const bookings = Array.isArray(response) ? response : Array.isArray(response?.bookings) ? response.bookings : Array.isArray(response?.data) ? response.data : [];
          const match = findMatchingBooking(bookings, {
            ...pendingPayment,
            paymentIntentId: paymentIntentId || pendingPayment?.paymentIntentId,
          });

          if (match && String(match?.status || '').toUpperCase() === 'CONFIRMED') {
            if (cancelled) return;
            setBooking(match);
            setStatusMessage('Booking confirmed successfully.');
            localStorage.removeItem(PAYMENT_STORAGE_KEY);
            sessionStorage.removeItem(PAYMENT_INTENT_CACHE_KEY);
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
  const iconColor = visualState === 'confirmed' ? 'text-emerald-500' : visualState === 'paid' ? 'text-primary' : 'text-amber-500';
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

  return (
    <UserLayout activeItem="bookings" title="Payment Status">
      <div className="mx-auto max-w-4xl rounded-[32px] bg-[radial-gradient(circle_at_top,#fff3cf_0%,#f7fbff_28%,#eef4ff_100%)] p-4 text-slate-900 dark:bg-[linear-gradient(180deg,#040404_0%,#0b0b0b_100%)] dark:text-slate-100 md:p-6">
        <div className="rounded-[28px] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:bg-[linear-gradient(180deg,#050505_0%,#0d0d0d_100%)] dark:ring-slate-900 md:p-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 ring-1 ring-slate-200/70 dark:bg-black/60 dark:ring-slate-800">
              <span className={`material-symbols-outlined text-6xl ${iconColor}`}>
                {iconName}
              </span>
            </div>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              <span className={`h-2.5 w-2.5 rounded-full ${visualState === 'confirmed' ? 'bg-emerald-500' : visualState === 'paid' ? 'bg-primary' : 'bg-amber-500'}`} />
              {visualState === 'confirmed' ? 'Confirmed' : visualState === 'paid' ? 'Payment received' : 'Pending'}
            </div>
          </div>

          <h1 className="mt-5 text-center text-3xl font-black text-slate-900 dark:text-white">
            {heading}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-500 dark:text-slate-400">
            {subheading}
          </p>

          {!booking ? (
            <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">{statusMessage}</p>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200/70 dark:bg-black/50 dark:ring-slate-800">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Booking code</p>
              <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">
                {pendingPayment?.bookingCode || booking?.bookingCode || 'Generating...'}
              </p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Keep this code handy for support and trip tracking.
              </p>
            </div>

            <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200/70 dark:bg-black/50 dark:ring-slate-800">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Payment status</p>
              <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">
                {visualState === 'confirmed' ? 'Confirmed' : visualState === 'paid' ? 'Paid, syncing booking' : 'Processing'}
              </p>
              {paymentIntentId ? (
                <p className="mt-2 break-all text-xs text-slate-400 dark:text-slate-500">Payment Intent: {paymentIntentId}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-8 rounded-3xl bg-[linear-gradient(135deg,#fff7d8,#fff)] p-5 ring-1 ring-amber-200/70 dark:bg-[linear-gradient(135deg,#15110a,#080808)] dark:ring-amber-500/20">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined mt-0.5 text-2xl text-amber-500">info</span>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">
                  {visualState === 'confirmed' ? 'Everything is complete.' : 'Your payment is successful.'}
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {visualState === 'confirmed'
                    ? 'You can open My Bookings to see the confirmed ticket details.'
                    : 'Stripe has accepted the payment. If booking confirmation takes a few seconds, your ticket status will update automatically in My Bookings once the webhook finishes.'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => navigate(ROUTES.USER_BOOKINGS, { replace: true, state: booking ? { latestBooking: booking } : undefined })}
              className="rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-black hover:bg-primary/90"
            >
              Go to My Bookings
            </button>
            <button
              onClick={() => navigate(ROUTES.SEARCH_RESULTS)}
              className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Search More Buses
            </button>
          </div>

          {loading && !booking ? (
            <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">Confirmation usually appears within a few seconds.</p>
          ) : null}
        </div>
      </div>
    </UserLayout>
  );
};

export default PaymentSuccess;
