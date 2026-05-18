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
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#002046]/30 border-t-[#002046]" />
    <span>{label}</span>
  </div>
);

const CenterScreenLoader = ({ label }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-8 py-7 shadow-2xl ring-1 ring-slate-200">
      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#002046]/20 border-t-[#002046]" />
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
        localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify({ ...paymentMeta, paymentIntentId: pi.id }));
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

  return (
    <div className="space-y-4">
      {submitting ? <CenterScreenLoader label="Processing your payment..." /> : null}

      {/* Saved cards section */}
      {savedCards?.length > 0 && (
        <div className="rounded-xl bg-white ring-1 ring-slate-200 overflow-hidden shadow-sm">
          <p className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">Saved Cards</p>
          <div className="divide-y divide-slate-100">
            {savedCards.map(card => {
              const brand = getCardBrand(card.brand);
              const expiry = `${String(card.exp_month).padStart(2, '0')}/${String(card.exp_year).slice(-2)}`;
              const selected = selectedSource === card.id;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setSelectedSource(card.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${selected ? 'bg-[#002046]/[0.04]' : 'hover:bg-slate-50'}`}
                >
                  <div className={`w-12 h-8 rounded-lg bg-gradient-to-br ${brand.bg} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-[9px] font-black text-white tracking-wider">{brand.label}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">•••• {card.last4}</p>
                    <p className="text-xs text-slate-500">{card.name} · {expiry}</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${selected ? 'border-[#002046] bg-[#002046]' : 'border-slate-300'}`}>
                    {selected && <div className="w-full h-full rounded-full scale-50 bg-white" />}
                  </div>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setSelectedSource('new')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${!usingSavedCard ? 'bg-[#002046]/[0.04]' : 'hover:bg-slate-50'}`}
            >
              <div className="w-12 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-slate-500 text-base">add_card</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">Use a new card</p>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${!usingSavedCard ? 'border-[#002046] bg-[#002046]' : 'border-slate-300'}`}>
                {!usingSavedCard && <div className="w-full h-full rounded-full scale-50 bg-white" />}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Stripe PaymentElement — only for new card */}
      {!usingSavedCard && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl bg-white ring-1 ring-slate-200 p-5 shadow-sm">
            <PaymentElement
              onReady={() => { setPaymentElementReady(true); setError(''); }}
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
            className="w-full rounded-xl bg-[#002046] px-6 py-3.5 text-base font-black text-white hover:bg-[#003a80] transition-colors disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">payments</span>
            {submitting ? 'Processing payment...' : `Pay ₹${payableAmount}`}
          </button>
        </form>
      )}

      {/* Pay with saved card */}
      {usingSavedCard && (
        <div className="space-y-3">
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          <button
            type="button"
            onClick={handleSavedCardPayment}
            disabled={submitting || lockSecondsLeft <= 0}
            className="w-full rounded-xl bg-[#002046] px-6 py-3.5 text-base font-black text-white hover:bg-[#003a80] transition-colors disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">credit_card</span>
            {submitting ? 'Processing payment...' : `Pay ₹${payableAmount}`}
          </button>
        </div>
      )}
    </div>
  );
};

const DummyPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const booking = location.state?.bus ? location.state : (readStoredPaymentFlow() || {});
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
  const { perSeatBase, perSeatGst, perSeatTotal } = useMemo(
    () => deriveFareBreakdown(booking?.selectedFare),
    [booking?.selectedFare]
  );

  const promoResult = booking?.promoResult || null;
  const discountAmount = promoResult ? Math.round(Number(promoResult.discountAmount || 0)) : 0;

  const totalFare = useMemo(() => perSeatTotal * seatCount, [perSeatTotal, seatCount]);
  const gstAmount = useMemo(() => perSeatGst * seatCount, [perSeatGst, seatCount]);
  const totalAmount = useMemo(() => (gstAmount > 0 ? perSeatBase * seatCount : totalFare), [gstAmount, perSeatBase, seatCount, totalFare]);
  const grossAmount = useMemo(() => (gstAmount > 0 ? totalAmount + gstAmount : totalFare), [gstAmount, totalAmount, totalFare]);
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
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-6">
          <p className="mb-4 text-sm text-slate-600">Payment details are missing. Please complete seat selection first.</p>
          <button onClick={() => navigate(ROUTES.SEARCH_RESULTS)} className="rounded-xl bg-[#002046] px-4 py-2 text-sm font-bold text-white hover:bg-[#003a80] transition-colors">Back to Search</button>
        </div>
      </UserLayout>
    );
  }

  const lockTimerDisplay = lockSecondsLeft > 0
    ? `${Math.floor(lockSecondsLeft / 60).toString().padStart(2, '0')}:${String(lockSecondsLeft % 60).padStart(2, '0')}`
    : 'Expired';

  return (
    <UserLayout activeItem="search" title="Payment" showHeaderSearch={false}>
      {creatingIntent ? <CenterScreenLoader label="Fetching payment details..." /> : null}
      <div className="space-y-5">

        {/* Header — navy gradient */}
        <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] px-5 py-5 text-white shadow-sm relative overflow-hidden">
          <div className="absolute -top-3 -right-3 text-7xl opacity-10 select-none">★</div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold opacity-60 uppercase tracking-widest mb-1">Secure Checkout</p>
              <h1 className="text-2xl font-black">Complete your booking</h1>
              <p className="mt-1 text-sm opacity-70 max-w-md">
                Your seats are reserved for a short time. Finish payment now to confirm this trip.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 px-5 py-4 text-right flex-shrink-0 self-start sm:self-auto">
              <p className="text-[10px] font-semibold opacity-60 uppercase tracking-widest mb-1">Amount to pay</p>
              <p className="text-3xl font-black">₹{payableAmount}</p>
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid gap-5 lg:grid-cols-[1.4fr_0.85fr]">

          {/* Left — Payment details */}
          <div className="order-2 lg:order-1 rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#002046]/[0.08] flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[#002046] text-lg">credit_card</span>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">Payment Details</p>
                  <p className="text-xs text-slate-400 mt-0.5">Choose how you want to pay</p>
                </div>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <span className="material-symbols-outlined text-sm">lock</span>
                Encrypted payment
              </span>
            </div>

            <div className="p-5 space-y-5">
              <p className="text-sm text-slate-500">Choose your preferred payment method below. Your reserved seats stay held while the timer is running.</p>

              {/* Trip + Seats info tiles */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-4">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Trip</p>
                  <p className="text-sm font-bold text-slate-900">{booking?.searchParams?.from} to {booking?.searchParams?.to}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{booking?.bus?.busName}</p>
                </div>
                <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-4">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Seats</p>
                  <p className="text-sm font-bold text-slate-900">{(booking?.selectedSeats || []).join(', ')}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{booking?.selectedType || 'Seat type not selected'}</p>
                </div>
                <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-4">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Payment method</p>
                  <p className="text-sm font-bold text-slate-900">Card, UPI or wallets</p>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-[#002046]">payments</span>
                    Stripe secured
                  </p>
                </div>
              </div>

              {/* Payment form */}
              <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-5">
                {creatingIntent ? (
                  <InlineLoader label="Preparing your payment options..." />
                ) : intentError ? (
                  <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-200">
                    {intentError}
                  </div>
                ) : clientSecret && stripePromise ? (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
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
                  <p className="text-sm text-slate-500">Payment form unavailable. Please try again.</p>
                )}
              </div>

              {/* Booking reference */}
              {paymentMeta?.bookingCode && (
                <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
                  <span className="material-symbols-outlined text-base">confirmation_number</span>
                  Booking reference reserved: <span className="font-black ml-1">{paymentMeta.bookingCode}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right — Fare summary */}
          <div className="order-1 lg:order-2 rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#002046]/[0.08] flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[#002046] text-lg">receipt_long</span>
                </div>
                <p className="text-sm font-black text-slate-900">Fare Summary</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#002046]/[0.07] px-2.5 py-1 text-xs font-semibold text-[#002046]">
                {(booking?.selectedSeats || []).length || 0} seats
              </span>
            </div>

            <div className="p-5 space-y-3">
              {/* Fare rows */}
              {[
                { label: 'Seat count', value: booking?.selectedSeats?.length || 0 },
                { label: 'Base fare', value: `₹${totalAmount}` },
                { label: 'GST', value: `₹${gstAmount}` },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between rounded-xl bg-slate-50 ring-1 ring-slate-200 px-4 py-3 text-sm">
                  <span className="text-slate-500">{row.label}</span>
                  <span className="font-bold text-slate-900">{row.value}</span>
                </div>
              ))}

              {/* Subtotal before discount */}
              {discountAmount > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-slate-50 ring-1 ring-slate-200 px-4 py-3 text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-bold text-slate-900">₹{grossAmount}</span>
                </div>
              )}

              {/* Promo discount row */}
              {discountAmount > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 ring-1 ring-emerald-200 px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-emerald-600">local_offer</span>
                    <span className="text-emerald-700 font-semibold">Promo ({promoResult.code})</span>
                  </div>
                  <span className="font-bold text-emerald-700">−₹{discountAmount}</span>
                </div>
              )}

              {/* Total payable — navy gradient */}
              <div className="rounded-xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] px-4 py-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold opacity-80">Total payable</span>
                    {discountAmount > 0 && (
                      <p className="text-[11px] opacity-60 mt-0.5">After ₹{discountAmount} discount</p>
                    )}
                  </div>
                  <div className="text-right">
                    {discountAmount > 0 && (
                      <p className="text-sm line-through opacity-50">₹{grossAmount}</p>
                    )}
                    <span className="text-2xl font-black">₹{payableAmount}</span>
                  </div>
                </div>
              </div>

              {/* Seat lock timer */}
              <div className={`flex items-center justify-between rounded-xl px-4 py-3.5 ring-1 ${lockSecondsLeft > 0 ? 'bg-amber-50 ring-amber-200' : 'bg-red-50 ring-red-200'}`}>
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-base ${lockSecondsLeft > 0 ? 'text-amber-600' : 'text-red-500'}`}>timer</span>
                  <span className={`text-sm font-semibold ${lockSecondsLeft > 0 ? 'text-amber-700' : 'text-red-600'}`}>Seat lock timer</span>
                </div>
                <span className={`text-xl font-black ${lockSecondsLeft > 0 ? 'text-amber-700' : 'text-red-600'}`}>{lockTimerDisplay}</span>
              </div>

              {/* After payment */}
              <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 px-4 py-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="material-symbols-outlined text-base text-emerald-600">check_circle</span>
                  <p className="text-sm font-semibold text-slate-900">After payment</p>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">You will see your booking confirmation as soon as the payment is processed.</p>
              </div>

              {/* Back button */}
              <button
                onClick={() => navigate(ROUTES.BOOKING, { state: booking })}
                className="w-full rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Back to booking
              </button>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default DummyPayment;
