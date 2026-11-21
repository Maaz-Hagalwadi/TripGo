import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'sonner';
import CheckoutLayout from '../components/CheckoutLayout';
import { ROUTES } from '../../../shared/constants/routes';
import { STRIPE_PUBLISHABLE_KEY } from '../../../config/env';
import { confirmBookingPayment, createPaymentIntent } from '../../../api/paymentService';
import { formatIstTime } from '../../../shared/utils/scheduleSearchUtils';
import CheckoutHeader from '../components/CheckoutHeader';
import { formatTripDay } from '../utils/checkout';

const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;
const PAYMENT_STORAGE_KEY = 'tripgo_pending_payment';
const SAVED_CARDS_KEY = 'tripgo_saved_cards';

const loadSavedCards = () => {
  try { return JSON.parse(localStorage.getItem(SAVED_CARDS_KEY) || '[]'); } catch { return []; }
};

const BRAND_STYLES = {
  visa:       { label: 'VISA', bg: 'from-[#1a1f71] to-[#0f5298]' },
  mastercard: { label: 'MC',   bg: 'from-orange-600 to-red-600' },
  amex:       { label: 'AMEX', bg: 'from-teal-700 to-teal-500' },
  discover:   { label: 'DISC', bg: 'from-orange-400 to-yellow-400' },
};
const getCardBrand = (brand) => BRAND_STYLES[brand?.toLowerCase()] || { label: (brand || 'CARD').toUpperCase().slice(0, 4), bg: 'from-slate-700 to-slate-500' };
const PAYMENT_INTENT_CACHE_KEY = 'tripgo_payment_intent_cache';

// One create-intent request per seat lock: StrictMode (and quick remounts) run the init effect twice,
// and two concurrent requests used to create two bookings for the same seats.
const inFlightIntents = new Map();
const createIntentOnce = (key, payload) => {
  if (!inFlightIntents.has(key)) {
    inFlightIntents.set(key, createPaymentIntent(payload).finally(() => {
      setTimeout(() => inFlightIntents.delete(key), 0);
    }));
  }
  return inFlightIntents.get(key);
};
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
  <div className="flex items-center gap-3 text-sm text-slate-500">
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
    <span>{label}</span>
  </div>
);

const CenterScreenLoader = ({ label }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-8 py-7 shadow-2xl ring-1 ring-slate-200">
      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
      <p className="text-sm font-semibold text-slate-700">{label}</p>
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
    guestEmail: booking?.contact?.email || '',
    // Saved on the booking so the operator's passenger list shows where each traveller boards
    boardingPointId: booking?.boardingPoint?.id || null,
    droppingPointId: booking?.droppingPoint?.id || null,
    // The server re-checks the code and takes the discount off what is charged
    promoCode: booking?.promoResult?.code || null,
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

const CheckoutForm = ({ booking, paymentMeta, payableAmount, lockSecondsLeft, savedCards, clientSecret }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [paymentElementReady, setPaymentElementReady] = useState(false);
  const [selectedSource, setSelectedSource] = useState(savedCards?.length ? savedCards[0].id : 'new');

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
          paid: true,
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

  const handleSavedCardPayment = async () => {
    if (!stripe) return;
    if (lockSecondsLeft <= 0) { toast.error('Seat lock expired. Please select seats again.'); navigate(ROUTES.BOOKING, { state: booking }); return; }
    setSubmitting(true);
    setError('');
    try {
      const result = await stripe.confirmCardPayment(clientSecret, { payment_method: selectedSource });
      if (result.error) { setError(result.error.message); toast.error(result.error.message); return; }
      const pi = result.paymentIntent;
      if (pi?.status === 'succeeded' && paymentMeta?.bookingId) {
        await confirmBookingPayment(paymentMeta.bookingId, pi.id);
        localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify({ ...paymentMeta, paymentIntentId: pi.id, paid: true }));
        sessionStorage.removeItem(PAYMENT_INTENT_CACHE_KEY);
        navigate(`${ROUTES.PAYMENT_SUCCESS}?payment_intent=${encodeURIComponent(pi.id)}&redirect_status=succeeded`, { replace: true });
      } else {
        navigate(ROUTES.PAYMENT_SUCCESS, { replace: true });
      }
    } catch (e) {
      setError(e?.message || 'Payment failed. Please try again.');
      toast.error(e?.message || 'Payment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const usingSavedCard = selectedSource !== 'new';
  const expired = lockSecondsLeft <= 0;
  const payLabel = submitting ? 'Processing…' : `Pay ₹${Number(payableAmount).toLocaleString('en-IN')}`;
  const payButtonClass = 'w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-black text-white hover:bg-[#102A4C] transition-colors disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="space-y-4">
      {submitting ? <CenterScreenLoader label="Processing your payment… don’t close this page" /> : null}

      {savedCards?.length > 0 && (
        <div className="space-y-2" role="radiogroup" aria-label="Payment method">
          {[...savedCards.map((card) => ({ id: card.id, card })), { id: 'new' }].map(({ id, card }) => {
            const selected = selectedSource === id;
            const brand = card ? getCardBrand(card.brand) : null;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setSelectedSource(id)}
                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                  selected ? 'border-primary bg-primary/[0.04] ring-1 ring-primary' : 'border-slate-200 hover:border-[#FF8A65]'
                }`}
              >
                {card ? (
                  <span className={`w-11 h-7 flex-shrink-0 rounded-md bg-gradient-to-br ${brand.bg} flex items-center justify-center text-[9px] font-black tracking-wider text-white`}>{brand.label}</span>
                ) : (
                  <span className="w-11 h-7 flex-shrink-0 rounded-md bg-slate-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px] text-slate-500">add_card</span>
                  </span>
                )}
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-slate-900">{card ? `•••• ${card.last4}` : 'Another card, UPI or wallet'}</span>
                  {card && <span className="block text-xs text-slate-500">{card.name} · {String(card.exp_month).padStart(2, '0')}/{String(card.exp_year).slice(-2)}</span>}
                </span>
                <span className={`w-4 h-4 flex-shrink-0 rounded-full border-2 ${selected ? 'border-primary bg-primary shadow-[inset_0_0_0_3px_white]' : 'border-slate-300'}`} />
              </button>
            );
          })}
        </div>
      )}

      {!usingSavedCard && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <PaymentElement
            options={{ layout: { type: 'tabs', defaultCollapsed: false } }}
            onReady={() => { setPaymentElementReady(true); setError(''); }}
            onLoaderStart={() => setPaymentElementReady(false)}
            onLoadError={(loadError) => {
              setPaymentElementReady(false);
              setError(loadError?.error?.message || 'Failed to load the payment form. Please refresh and try again.');
            }}
          />
          {error ? <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p> : null}
          <button type="submit" disabled={!stripe || !elements || !paymentElementReady || submitting || expired} className={payButtonClass}>
            <span className="material-symbols-outlined text-[20px]">lock</span>
            {payLabel}
          </button>
        </form>
      )}

      {usingSavedCard && (
        <div className="space-y-3">
          {error ? <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p> : null}
          <button type="button" onClick={handleSavedCardPayment} disabled={submitting || expired} className={payButtonClass}>
            <span className="material-symbols-outlined text-[20px]">lock</span>
            {payLabel}
          </button>
        </div>
      )}
    </div>
  );
};

const DummyPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Stable across renders: the effects below key off it (a fresh object each render re-ran payment setup)
  const booking = useMemo(() => (location.state?.bus ? location.state : (readStoredPaymentFlow() || {})), [location.state]);
  const savedCards = loadSavedCards();
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
  // Seats can be different types (seater / lower / upper berth), so fares are summed seat by seat
  const { sumBase, sumGst, sumTotal } = useMemo(() => {
    const seatFares = Array.isArray(booking?.seatFares) && booking.seatFares.length === seatCount
      ? booking.seatFares
      : Array.from({ length: seatCount }, () => booking?.selectedFare);
    return seatFares.map(deriveFareBreakdown).reduce((acc, f) => ({
      sumBase: acc.sumBase + f.perSeatBase,
      sumGst: acc.sumGst + f.perSeatGst,
      sumTotal: acc.sumTotal + f.perSeatTotal,
    }), { sumBase: 0, sumGst: 0, sumTotal: 0 });
  }, [booking?.seatFares, booking?.selectedFare, seatCount]);

  const promoResult = booking?.promoResult || null;
  const discountAmount = promoResult ? Math.round(Number(promoResult.discountAmount || 0)) : 0;

  const gstAmount = sumGst;
  const totalAmount = gstAmount > 0 ? sumBase : sumTotal;
  const grossAmount = gstAmount > 0 ? totalAmount + gstAmount : sumTotal;
  const payableAmount = useMemo(() => Math.max(0, grossAmount - discountAmount), [grossAmount, discountAmount]);

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

        const response = await createIntentOnce(`${booking.lockToken}:${payableAmount}`, payload);
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
      <CheckoutLayout activeItem="search" title="Payment">
        <section className="rounded-2xl bg-white border border-slate-200/80 p-10 text-center">
          <span className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-[#FDBA74]/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-orange-600">receipt_long</span>
          </span>
          <h2 className="text-lg font-black text-slate-900">Nothing to pay for yet</h2>
          <p className="mt-1 text-sm text-slate-500">Pick a bus and your seats first.</p>
          <button onClick={() => navigate(ROUTES.SEARCH_RESULTS)} className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-[#102A4C] transition-colors">
            Search buses
          </button>
        </section>
      </CheckoutLayout>
    );
  }

  const { searchParams = {}, bus } = booking;
  const passengers = Array.isArray(booking.passengers) ? booking.passengers : [];
  const expired = lockSecondsLeft <= 0;
  const backToBooking = () => navigate(ROUTES.BOOKING, { state: booking });
  const genderShort = { MALE: 'M', FEMALE: 'F', OTHER: 'O' };

  return (
    <CheckoutLayout activeItem="search" title="Payment">
      <div className="space-y-5">
        <CheckoutHeader
          from={searchParams.from}
          to={searchParams.to}
          departure={bus.departureTime}
          arrival={bus.arrivalTime}
          busName={bus.busName}
          step={3}
          onStepClick={backToBooking}
          onBack={backToBooking}
          secondsLeft={lockSecondsLeft}
        />

        {expired && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl bg-red-50 border border-red-200 px-5 py-4">
            <span className="material-symbols-outlined text-red-600">timer_off</span>
            <div className="flex-1">
              <p className="font-bold text-red-800">Your seat hold has expired</p>
              <p className="text-sm text-red-700">The seats were released. Pick them again to continue — you haven’t been charged.</p>
            </div>
            <button onClick={backToBooking} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors">
              Pick seats again
            </button>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          {/* Payment */}
          <section className="order-2 lg:order-1 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-[#FDBA74]/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px] text-orange-600">credit_card</span>
                </span>
                <div>
                  <h2 className="font-black text-slate-900">Pay securely</h2>
                  <p className="text-xs text-slate-500">Cards, UPI and wallets</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700">
                <span className="material-symbols-outlined text-[14px]">verified_user</span>
                Encrypted · Powered by Stripe
              </span>
            </div>

            <div className="p-5">
              {creatingIntent ? (
                <div className="space-y-3" aria-label="Preparing payment options">
                  <div className="h-11 rounded-xl bg-slate-100 animate-pulse" />
                  <div className="h-11 rounded-xl bg-slate-100 animate-pulse" />
                  <div className="h-11 w-2/3 rounded-xl bg-slate-100 animate-pulse" />
                  <InlineLoader label="Preparing your payment options…" />
                </div>
              ) : intentError ? (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                  <p className="text-sm font-bold text-red-800">We couldn’t start the payment</p>
                  <p className="text-sm text-red-700">{intentError}</p>
                  <button onClick={() => window.location.reload()} className="mt-2 text-sm font-bold text-red-700 underline">Try again</button>
                </div>
              ) : clientSecret && stripePromise ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: { colorPrimary: '#0B1F3A', borderRadius: '12px', fontFamily: 'inherit', colorText: '#0f172a' },
                    },
                  }}
                >
                  <CheckoutForm
                    booking={booking}
                    paymentMeta={paymentMeta}
                    payableAmount={payableAmount}
                    lockSecondsLeft={lockSecondsLeft}
                    savedCards={savedCards}
                    clientSecret={clientSecret}
                  />
                </Elements>
              ) : (
                <p className="text-sm text-slate-500">The payment form isn’t available right now. Please refresh the page.</p>
              )}

              <p className="mt-4 text-center text-xs text-slate-400">
                By paying you agree to TripGo’s{' '}
                <Link to={ROUTES.TERMS} className="font-semibold text-slate-500 hover:text-primary underline-offset-2 hover:underline">Terms</Link> and{' '}
                <Link to={ROUTES.REFUND_POLICY} className="font-semibold text-slate-500 hover:text-primary underline-offset-2 hover:underline">Refund policy</Link>.
              </p>
            </div>
          </section>

          {/* Trip + fare summary */}
          <aside className="order-1 lg:order-2 lg:sticky lg:top-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-dashed border-slate-200">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{formatTripDay(bus.departureTime)}</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-black text-slate-900">{formatIstTime(bus.departureTime)}</p>
                  <p className="text-xs text-slate-500 truncate">{booking.boardingPoint?.name || searchParams.from}</p>
                </div>
                <div className="flex-1 flex items-center gap-1 text-slate-300" aria-hidden="true">
                  <span className="h-px flex-1 bg-slate-200" />
                  <span className="material-symbols-outlined text-[18px] text-[#FF8A65]">directions_bus</span>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="min-w-0 text-right">
                  <p className="text-lg font-black text-slate-900">{formatIstTime(bus.arrivalTime)}</p>
                  <p className="text-xs text-slate-500 truncate">{booking.droppingPoint?.name || searchParams.to}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">{bus.busName}</p>
            </div>

            {passengers.length > 0 && (
              <div className="p-5 border-b border-dashed border-slate-200">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Travellers</p>
                <div className="space-y-1.5">
                  {passengers.map((p) => (
                    <div key={p.seatNumber} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-semibold text-slate-800">
                        {p.name}
                        <span className="ml-1.5 font-normal text-slate-400">{[genderShort[p.gender], p.age].filter(Boolean).join(', ')}</span>
                      </span>
                      <span className="flex-shrink-0 rounded-md bg-primary px-2 py-0.5 text-xs font-black text-white">{p.seatNumber}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-5 space-y-2 text-sm">
              <div className="flex justify-between text-slate-500"><span>Base fare ({seatCount} seat{seatCount > 1 ? 's' : ''})</span><span>₹{totalAmount.toLocaleString('en-IN')}</span></div>
              {gstAmount > 0 && <div className="flex justify-between text-slate-500"><span>GST</span><span>₹{gstAmount.toLocaleString('en-IN')}</span></div>}
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-700"><span>Promo ({promoResult.code})</span><span>−₹{discountAmount.toLocaleString('en-IN')}</span></div>
              )}
              <div className="flex items-end justify-between border-t border-slate-100 pt-3">
                <span className="font-bold text-slate-900">Amount to pay</span>
                <span className="text-2xl font-black text-slate-900">₹{payableAmount.toLocaleString('en-IN')}</span>
              </div>
              {paymentMeta?.bookingCode && (
                <p className="pt-1 text-xs text-slate-400">Booking reference <span className="font-mono font-bold text-slate-600">{paymentMeta.bookingCode}</span></p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </CheckoutLayout>
  );
};

export default DummyPayment;
