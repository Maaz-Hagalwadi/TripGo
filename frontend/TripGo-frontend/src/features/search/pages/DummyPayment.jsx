import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'sonner';
import UserLayout from '../../../shared/components/UserLayout';
import { ROUTES } from '../../../shared/constants/routes';
import { STRIPE_PUBLISHABLE_KEY } from '../../../config/env';
import { createPaymentIntent } from '../../../api/paymentService';

const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;
const PAYMENT_STORAGE_KEY = 'tripgo_pending_payment';
const PAYMENT_INTENT_CACHE_KEY = 'tripgo_payment_intent_cache';

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

  return {
    lockToken: booking?.lockToken || '',
    scheduleId: booking?.scheduleId || '',
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

const CheckoutForm = ({ booking, payableAmount, lockSecondsLeft }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) return;
    if (lockSecondsLeft <= 0) {
      toast.error('Seat lock expired. Please select seats again.');
      navigate(ROUTES.BOOKING, { state: booking });
      return;
    }

    setSubmitting(true);
    setError('');

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}${ROUTES.PAYMENT_SUCCESS}`,
      },
    });

    if (result.error) {
      const message = result.error.message || 'Payment failed. Please try again.';
      setError(message);
      toast.error(message);
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-[28px] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 ring-1 ring-slate-200/70 shadow-[0_16px_40px_rgba(15,23,42,0.06)] dark:bg-black/70 dark:ring-slate-950">
        <PaymentElement />
      </div>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      <button
        type="submit"
        disabled={!stripe || !elements || submitting || lockSecondsLeft <= 0}
        className="w-full rounded-2xl bg-slate-900 px-4 py-3.5 text-base font-black text-white shadow-[0_18px_30px_rgba(15,23,42,0.18)] hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-primary dark:text-black dark:hover:bg-primary/90"
      >
        {submitting ? 'Securing payment...' : `Pay ₹${payableAmount}`}
      </button>
    </form>
  );
};

const DummyPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const booking = location.state || {};
  const [clientSecret, setClientSecret] = useState('');
  const [paymentMeta, setPaymentMeta] = useState(null);
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [intentError, setIntentError] = useState('');

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
    if (!booking?.bus || !booking?.scheduleId || !booking?.lockToken) return;
    if (!STRIPE_PUBLISHABLE_KEY) {
      setIntentError('Stripe publishable key is missing. Add VITE_STRIPE_PUBLISHABLE_KEY to .env.');
      return;
    }

    const payload = buildPaymentPayload(booking, totalAmount, gstAmount, payableAmount);
    let isMounted = true;

    const initializePayment = async () => {
      try {
        setCreatingIntent(true);
        setIntentError('');

        const cachedIntent = readCachedIntent();
        const cacheMatchesCurrentBooking = cachedIntent
          && cachedIntent.lockToken === booking.lockToken
          && cachedIntent.scheduleId === booking.scheduleId
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
          bus: booking?.bus || null,
          searchParams: booking?.searchParams || null,
          bookingState: booking,
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
      <UserLayout activeItem="search" title="Payment">
        <div className="rounded-3xl bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:bg-black dark:text-slate-100 dark:ring-slate-900">
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">Payment details are missing. Please complete seat selection first.</p>
          <button onClick={() => navigate(ROUTES.SEARCH_RESULTS)} className="rounded-xl bg-primary px-4 py-2 font-semibold text-black">Back to Search</button>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout activeItem="search" title="Payment">
      <div className="mx-auto max-w-6xl space-y-4 rounded-[28px] bg-[radial-gradient(circle_at_top,#fff4cf_0%,#f8fbff_26%,#edf4ff_100%)] p-3 text-slate-900 dark:bg-[linear-gradient(180deg,#040404_0%,#0b0b0b_100%)] dark:text-slate-100 sm:space-y-6 sm:rounded-[36px] sm:p-4 md:p-6">
        <div className="rounded-[24px] bg-[linear-gradient(135deg,#0f172a,#1e293b)] px-4 py-5 text-white shadow-[0_22px_50px_rgba(15,23,42,0.18)] sm:rounded-[28px] sm:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Secure Stripe Checkout</p>
              <h1 className="mt-2 text-2xl font-black sm:text-3xl">Complete your booking</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Your seats are reserved for a short time. Finish payment securely to lock in this trip.
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
                <p className="text-xs uppercase tracking-[0.18em]">Protected by Stripe</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Card, UPI and wallet options are shown below. Your seats stay locked while the timer is active.</p>

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
                <p className="text-sm text-slate-600 dark:text-slate-300">Initializing secure payment form...</p>
              ) : intentError ? (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20">
                  {intentError}
                </div>
              ) : clientSecret && stripePromise ? (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm booking={booking} payableAmount={payableAmount} lockSecondsLeft={Number(booking?.lockSecondsLeft || 0)} />
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
                <span className="text-xl font-black text-slate-900 dark:text-white">{booking?.lockSecondsLeft > 0 ? `${Math.floor(booking.lockSecondsLeft / 60).toString().padStart(2, '0')}:${String(booking.lockSecondsLeft % 60).padStart(2, '0')}` : 'Expired'}</span>
              </div>
            </div>
            <div className="mt-6 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200/70 dark:bg-black/50 dark:text-slate-300 dark:ring-slate-800">
              <p className="font-semibold text-slate-900 dark:text-white">What happens next?</p>
              <p className="mt-1">After payment, you will return to a confirmation screen while the booking status syncs automatically.</p>
            </div>
            <button onClick={() => navigate(ROUTES.BOOKING, { state: booking })} className="mt-6 w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900">Back to booking</button>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default DummyPayment;
