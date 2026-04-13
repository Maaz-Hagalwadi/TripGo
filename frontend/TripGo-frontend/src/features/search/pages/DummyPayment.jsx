import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'sonner';
import UserLayout from '../../../shared/components/UserLayout';
import { ROUTES } from '../../../shared/constants/routes';
import { STRIPE_PUBLISHABLE_KEY } from '../../../config/env';
import { confirmBookingPayment, createPaymentIntent } from '../../../api/paymentService';

const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;
const PAYMENT_STORAGE_KEY = 'tripgo_pending_payment';
const PAYMENT_INTENT_CACHE_KEY = 'tripgo_payment_intent_cache';
const PAYMENT_FLOW_STORAGE_KEY = 'tripgo_payment_flow_state';

const readCachedIntent = () => {
  try {
    const raw = sessionStorage.getItem(PAYMENT_INTENT_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCachedIntent = (value) => {
  try {
    sessionStorage.setItem(PAYMENT_INTENT_CACHE_KEY, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
};

const readStoredPaymentFlow = () => {
  try {
    const raw = sessionStorage.getItem(PAYMENT_FLOW_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeStoredPaymentFlow = (value) => {
  try {
    sessionStorage.setItem(PAYMENT_FLOW_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
};

const InlineLoader = ({ label }) => (
  <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/40 border-t-primary" />
    <span>{label}</span>
  </div>
);

const CenterScreenLoader = ({ label }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 backdrop-blur-sm">
    <div className="flex flex-col items-center gap-4 rounded-[28px] bg-white px-8 py-7 shadow-[0_24px_70px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/70 dark:bg-[linear-gradient(180deg,#050505_0%,#0d0d0d_100%)] dark:ring-white/10">
      <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-primary/25 border-t-primary" />
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</p>
    </div>
  </div>
);

const splitPassengerName = (name) => {
  const trimmed = String(name || '').trim();
  if (!trimmed) return { firstName: 'Traveler', lastName: '' };
  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] || 'Traveler',
    lastName: parts.slice(1).join(' '),
  };
};

const deriveFareBreakdown = (selectedFare) => {
  const totalFare = Math.round(Number(selectedFare?.totalFare || 0));
  const explicitBase = Number(selectedFare?.baseFare);
  const explicitGstAmount = Number(selectedFare?.gstAmount ?? selectedFare?.gst ?? NaN);
  const gstPercent = Number(selectedFare?.gstPercent ?? selectedFare?.gstRate ?? NaN);

  let baseFare = Number.isFinite(explicitBase) ? Math.round(explicitBase) : 0;
  let gstAmount = Number.isFinite(explicitGstAmount) ? Math.round(explicitGstAmount) : 0;

  if (!baseFare && totalFare && Number.isFinite(gstPercent) && gstPercent > 0) {
    baseFare = Math.round((totalFare * 100) / (100 + gstPercent));
  }

  if (!gstAmount && totalFare && baseFare && totalFare >= baseFare) {
    gstAmount = totalFare - baseFare;
  }

  if (!baseFare && totalFare) {
    baseFare = Math.max(totalFare - gstAmount, 0);
  }

  return {
    perSeatBase: baseFare,
    perSeatGst: gstAmount,
    perSeatTotal: totalFare || baseFare + gstAmount,
  };
};

const buildPaymentPayload = (booking, totalAmount, gstAmount, payableAmount) => {
  const seatNumbers = Array.isArray(booking?.selectedSeats) ? booking.selectedSeats : [];
  const passengerEntries = Array.isArray(booking?.passengers) && booking.passengers.length
    ? booking.passengers
    : seatNumbers.map((seatNumber) => ({ ...booking?.passenger, seatNumber }));
  const selectedDate = booking?.searchParams?.date || booking?.travelDate || '';

  return {
    lockToken: booking?.lockToken || '',
    scheduleId: booking?.scheduleId || '',
    travelDate: selectedDate,
    from: booking?.searchParams?.from || '',
    to: booking?.searchParams?.to || '',
    totalAmount,
    gstAmount,
    payableAmount,
    passengers: seatNumbers.map((seatNumber, index) => {
      const passenger = passengerEntries.find((item) => item?.seatNumber === seatNumber) || passengerEntries[index] || {};
      const { firstName, lastName } = splitPassengerName(passenger?.name);
      return {
        seatNumber,
        firstName,
        lastName,
        age: Number(passenger?.age || 0),
        gender: passenger?.gender || 'OTHER',
        phone: passenger?.phone || booking?.contact?.phone || '',
      };
    }),
  };
};

const CheckoutForm = ({ booking, paymentMeta, payableAmount, lockSecondsLeft }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [paymentElementReady, setPaymentElementReady] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) return;
    if (!paymentElementReady) {
      const message = 'Payment form is still loading. Please wait a moment and try again.';
      setError(message);
      toast.error(message);
      return;
    }
    if (lockSecondsLeft <= 0) {
      toast.error('Seat lock expired. Please select seats again.');
      navigate(ROUTES.BOOKING, { state: booking });
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        const message = submitError.message || 'Payment details are incomplete. Please review and try again.';
        setError(message);
        toast.error(message);
        return;
      }

      const result = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}${ROUTES.PAYMENT_SUCCESS}`,
        },
      });

      if (result.error) {
        const message = result.error.message || 'Payment failed. Please try again.';
        setError(message);
        toast.error(message);
        return;
      }

      const succeededPaymentIntent = result.paymentIntent?.status === 'succeeded'
        ? result.paymentIntent
        : null;

      if (succeededPaymentIntent && paymentMeta?.bookingId) {
        await confirmBookingPayment(paymentMeta.bookingId, succeededPaymentIntent.id);

        const nextPaymentMeta = {
          ...paymentMeta,
          paymentIntentId: succeededPaymentIntent.id,
        };
        localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(nextPaymentMeta));
        sessionStorage.removeItem(PAYMENT_INTENT_CACHE_KEY);

        navigate(
          `${ROUTES.PAYMENT_SUCCESS}?payment_intent=${encodeURIComponent(succeededPaymentIntent.id)}&redirect_status=succeeded`,
          { replace: true }
        );
        return;
      }

      if (succeededPaymentIntent) {
        navigate(
          `${ROUTES.PAYMENT_SUCCESS}?payment_intent=${encodeURIComponent(succeededPaymentIntent.id)}&redirect_status=succeeded`,
          { replace: true }
        );
        return;
      }

      navigate(ROUTES.PAYMENT_SUCCESS, { replace: true });
    } catch (submitError) {
      const message = submitError?.message || 'Payment confirmation failed. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {submitting ? <CenterScreenLoader label="Processing your payment..." /> : null}
      <div className="rounded-[28px] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 ring-1 ring-slate-200/70 shadow-[0_16px_40px_rgba(15,23,42,0.06)] dark:bg-black/70 dark:ring-slate-950">
        <PaymentElement
          onReady={() => {
            setPaymentElementReady(true);
            setError('');
          }}
          onLoaderStart={() => setPaymentElementReady(false)}
          onLoadError={(loadError) => {
            setPaymentElementReady(false);
            setError(loadError?.error?.message || 'Failed to load the payment form. Please refresh and try again.');
          }}
        />
      </div>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      <button
        type="submit"
        disabled={!stripe || !elements || !paymentElementReady || submitting || lockSecondsLeft <= 0}
        className="w-full rounded-2xl bg-slate-900 px-4 py-3.5 text-base font-black text-white shadow-[0_18px_30px_rgba(15,23,42,0.18)] hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-primary dark:text-black dark:hover:bg-primary/90"
      >
        {submitting ? 'Processing payment...' : `Pay ₹${payableAmount}`}
      </button>
    </form>
  );
};

const DummyPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const booking = location.state?.bus ? location.state : (readStoredPaymentFlow() || {});
  const [clientSecret, setClientSecret] = useState('');
  const [paymentMeta, setPaymentMeta] = useState(null);
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [intentError, setIntentError] = useState('');
  const [lockSecondsLeft, setLockSecondsLeft] = useState(() => {
    const lockExpiresAt = Number(booking?.lockExpiresAt || 0);
    if (lockExpiresAt > Date.now()) {
      return Math.max(0, Math.floor((lockExpiresAt - Date.now()) / 1000));
    }
    return Number(booking?.lockSecondsLeft || 0);
  });

  const seatCount = Math.max(booking?.selectedSeats?.length || 1, 1);
  const { perSeatBase, perSeatGst, perSeatTotal } = useMemo(
    () => deriveFareBreakdown(booking?.selectedFare),
    [booking?.selectedFare]
  );

  const totalFare = useMemo(() => perSeatTotal * seatCount, [perSeatTotal, seatCount]);
  const gstAmount = useMemo(() => perSeatGst * seatCount, [perSeatGst, seatCount]);
  const totalAmount = useMemo(() => (gstAmount > 0 ? perSeatBase * seatCount : totalFare), [gstAmount, perSeatBase, seatCount, totalFare]);
  const payableAmount = useMemo(() => (gstAmount > 0 ? totalAmount + gstAmount : totalFare), [gstAmount, totalAmount, totalFare]);

  useEffect(() => {
    if (!booking?.bus) return;
    writeStoredPaymentFlow(booking);
  }, [booking]);

  useEffect(() => {
    const lockExpiresAt = Number(booking?.lockExpiresAt || 0);
    if (lockExpiresAt > Date.now()) {
      const tick = () => {
        setLockSecondsLeft(Math.max(0, Math.floor((lockExpiresAt - Date.now()) / 1000)));
      };
      tick();
      const timer = setInterval(tick, 1000);
      return () => clearInterval(timer);
    }

    setLockSecondsLeft(Number(booking?.lockSecondsLeft || 0));
    return undefined;
  }, [booking]);

  useEffect(() => {
    if (!booking?.bus || !booking?.scheduleId || !booking?.lockToken) return;
    if (!STRIPE_PUBLISHABLE_KEY) {
      setIntentError('Secure payment is temporarily unavailable. Please try again in a moment.');
      return;
    }

    const payload = buildPaymentPayload(booking, totalAmount, gstAmount, payableAmount);
    const selectedDate = booking?.searchParams?.date || booking?.travelDate || '';
    let isMounted = true;

    const initializePayment = async () => {
      try {
        setCreatingIntent(true);
        setIntentError('');

        const cachedIntent = readCachedIntent();
        const cacheMatchesCurrentBooking = cachedIntent
          && cachedIntent.lockToken === booking.lockToken
          && cachedIntent.scheduleId === booking.scheduleId
          && String(cachedIntent.travelDate || '') === String(selectedDate)
          && Number(cachedIntent.payableAmount) === Number(payableAmount)
          && Array.isArray(cachedIntent.seatNumbers)
          && cachedIntent.seatNumbers.join(',') === (booking?.selectedSeats || []).join(',')
          && cachedIntent.clientSecret;

        if (cacheMatchesCurrentBooking) {
          setClientSecret(cachedIntent.clientSecret || '');
          setPaymentMeta(cachedIntent);
          localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(cachedIntent));
          return;
        }

        const response = await createPaymentIntent(payload);
        if (!isMounted) return;

        const nextMeta = {
          lockToken: booking?.lockToken || '',
          bookingId: response?.bookingId || '',
          bookingCode: response?.bookingCode || '',
          paymentIntentId: response?.paymentIntentId || '',
          clientSecret: response?.clientSecret || '',
          payableAmount,
          totalAmount,
          gstAmount,
          seatNumbers: booking?.selectedSeats || [],
          scheduleId: booking?.scheduleId || '',
          travelDate: selectedDate,
          bus: booking?.bus || null,
          searchParams: booking?.searchParams || null,
          bookingState: booking,
          lockExpiresAt: booking?.lockExpiresAt || null,
          createdAt: new Date().toISOString(),
        };
        setClientSecret(nextMeta.clientSecret);
        setPaymentMeta(nextMeta);
        writeCachedIntent(nextMeta);
        localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(nextMeta));
      } catch (error) {
        if (!isMounted) return;
        setIntentError(error?.message || 'Failed to initialize payment.');
      } finally {
        if (isMounted) setCreatingIntent(false);
      }
    };

    initializePayment();
    return () => { isMounted = false; };
  }, [booking, totalAmount, gstAmount, payableAmount]);

  if (!booking?.bus) {
    return (
      <UserLayout activeItem="search" title="Payment" showHeaderSearch={false}>
        <div className="rounded-3xl bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:bg-black dark:text-slate-100 dark:ring-slate-900">
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">Payment details are missing. Please complete seat selection first.</p>
          <button onClick={() => navigate(ROUTES.SEARCH_RESULTS)} className="rounded-xl bg-primary px-4 py-2 font-semibold text-black">Back to Search</button>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout activeItem="search" title="Payment" showHeaderSearch={false}>
      {creatingIntent ? <CenterScreenLoader label="Fetching payment details..." /> : null}
      <div className="mx-auto max-w-6xl space-y-4 rounded-[28px] bg-[radial-gradient(circle_at_top,#fff4cf_0%,#f8fbff_26%,#edf4ff_100%)] p-3 text-slate-900 dark:bg-[linear-gradient(180deg,#040404_0%,#0b0b0b_100%)] dark:text-slate-100 sm:space-y-6 sm:rounded-[36px] sm:p-4 md:p-6">
        <div className="rounded-[24px] bg-[linear-gradient(135deg,#0f172a,#1e293b)] px-4 py-5 text-white shadow-[0_22px_50px_rgba(15,23,42,0.18)] sm:rounded-[28px] sm:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Secure Checkout</p>
              <h1 className="mt-2 text-2xl font-black sm:text-3xl">Complete your booking</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Your seats are reserved for a short time. Finish payment now to confirm this trip.
              </p>
            </div>
            <div className="rounded-3xl bg-white/10 px-4 py-4 ring-1 ring-white/10 backdrop-blur sm:px-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Amount to pay</p>
              <p className="mt-2 text-2xl font-black text-primary sm:text-3xl">₹{payableAmount}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="rounded-[24px] bg-[linear-gradient(140deg,#ffffff,#eef7ff)] p-4 shadow-[0_20px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:bg-[linear-gradient(135deg,#050404,#0b0b0b)] dark:ring-slate-950 sm:rounded-[28px] sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Payment Details</p>
                <h2 className="mt-2 text-xl font-black text-slate-900 dark:text-white sm:text-2xl">Choose how you want to pay</h2>
              </div>
              <div className="hidden rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20 md:block">
                <p className="text-xs uppercase tracking-[0.18em]">Encrypted payment</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Choose your preferred payment method below. Your reserved seats stay held while the timer is running.</p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200/70 dark:bg-black/70 dark:ring-slate-950">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Trip</p>
                <p className="mt-2 font-bold text-slate-900 dark:text-white">{booking?.searchParams?.from} to {booking?.searchParams?.to}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{booking?.bus?.busName}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200/70 dark:bg-black/70 dark:ring-slate-950">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Seats</p>
                <p className="mt-2 font-bold text-slate-900 dark:text-white">{(booking?.selectedSeats || []).join(', ')}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{booking?.selectedType || 'Seat type not selected'}</p>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] bg-white/80 p-4 ring-1 ring-slate-200/70 dark:bg-black/70 dark:ring-slate-950 sm:rounded-[28px] sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Payment method</p>
                  <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Card, UPI or wallets</p>
                </div>
                <span className="material-symbols-outlined text-3xl text-primary">payments</span>
              </div>

              {creatingIntent ? (
                <InlineLoader label="Preparing your payment options..." />
              ) : intentError ? (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20">
                  {intentError}
                </div>
              ) : clientSecret && stripePromise ? (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm
                    booking={booking}
                    paymentMeta={paymentMeta}
                    payableAmount={payableAmount}
                    lockSecondsLeft={lockSecondsLeft}
                  />
                </Elements>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-300">Payment form unavailable. Please try again.</p>
              )}
            </div>

            {paymentMeta?.bookingCode ? (
              <div className="mt-6 rounded-3xl bg-emerald-50/80 px-4 py-4 text-sm text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                Booking reference reserved: <span className="font-bold">{paymentMeta.bookingCode}</span>
              </div>
            ) : null}
          </div>

          <div className="rounded-[24px] bg-white p-4 shadow-[0_20px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:bg-[linear-gradient(180deg,#040404_0%,#0b0b0b_100%)] dark:ring-slate-950 sm:rounded-[28px] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Fare Summary</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                {(booking?.selectedSeats || []).length || 0} seats
              </span>
            </div>
            <div className="mt-5 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between rounded-3xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/70 dark:bg-black/70 dark:ring-slate-950"><span>Seat count</span><span className="font-bold text-slate-900 dark:text-white">{booking?.selectedSeats?.length || 0}</span></div>
              <div className="flex items-center justify-between rounded-3xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/70 dark:bg-black/70 dark:ring-slate-950"><span>Base fare</span><span className="font-bold text-slate-900 dark:text-white">₹{totalAmount}</span></div>
              <div className="flex items-center justify-between rounded-3xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/70 dark:bg-black/70 dark:ring-slate-950"><span>GST</span><span className="font-bold text-slate-900 dark:text-white">₹{gstAmount}</span></div>
              <div className="rounded-[28px] bg-[linear-gradient(135deg,#fff3cf,#ffffff)] px-4 py-4 ring-1 ring-amber-200/70 dark:bg-[linear-gradient(135deg,#15110a,#080808)] dark:ring-amber-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Total payable</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white">₹{payableAmount}</span>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-3xl bg-amber-50 px-4 py-4 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/20">
                <span className="text-amber-700 dark:text-amber-200">Seat lock timer</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">{lockSecondsLeft > 0 ? `${Math.floor(lockSecondsLeft / 60).toString().padStart(2, '0')}:${String(lockSecondsLeft % 60).padStart(2, '0')}` : 'Expired'}</span>
              </div>
            </div>
            <div className="mt-6 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200/70 dark:bg-black/50 dark:text-slate-300 dark:ring-slate-800">
              <p className="font-semibold text-slate-900 dark:text-white">After payment</p>
              <p className="mt-1">You will see your booking confirmation as soon as the payment is processed.</p>
            </div>
            <button onClick={() => navigate(ROUTES.BOOKING, { state: booking })} className="mt-6 w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900">Back to booking</button>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default DummyPayment;
