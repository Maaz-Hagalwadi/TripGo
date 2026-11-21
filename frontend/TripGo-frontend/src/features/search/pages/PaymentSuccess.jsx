import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import CheckoutLayout from '../components/CheckoutLayout';
import { downloadTicketFromApi, getMyBookings } from '../../../api/bookingService';
import { confirmBookingPayment } from '../../../api/paymentService';
import { ROUTES } from '../../../shared/constants/routes';
import { formatIstTime, onTravelDate } from '../../../shared/utils/scheduleSearchUtils';
import { formatTripDay } from '../utils/checkout';

const PAYMENT_STORAGE_KEY = 'tripgo_pending_payment';
const PAYMENT_INTENT_CACHE_KEY = 'tripgo_payment_intent_cache';
const PAYMENT_FLOW_STORAGE_KEY = 'tripgo_payment_flow_state';
const CURRENT_BOOKING_STORAGE_KEY = 'tripgo_current_booking_state';
const BOOKING_DRAFT_PREFIX = 'tripgo_booking_draft_';

const toDraftKeyPart = (value) => String(value || '')
  .trim()
  .replace(/[^a-zA-Z0-9_-]+/g, '-');

/**
 * Forget everything about a finished checkout — including the seat-selection draft, which otherwise
 * made the next booking of the same bus jump straight to passenger details with the old seats.
 */
const clearCheckout = (pendingPayment) => {
  localStorage.removeItem(PAYMENT_STORAGE_KEY);
  sessionStorage.removeItem(PAYMENT_INTENT_CACHE_KEY);
  sessionStorage.removeItem(PAYMENT_FLOW_STORAGE_KEY);
  localStorage.removeItem(CURRENT_BOOKING_STORAGE_KEY);
  const bus = pendingPayment?.bus || pendingPayment?.bookingState?.bus;
  const ids = [pendingPayment?.scheduleId, bus?.scheduleId, bus?.id].filter(Boolean).map(toDraftKeyPart);
  Object.keys(localStorage)
    .filter((k) => ids.some((id) => k.startsWith(`${BOOKING_DRAFT_PREFIX}${id}`)))
    .forEach((k) => localStorage.removeItem(k));
};

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

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Verifying your booking...');
  const [downloading, setDownloading] = useState(false);

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
  const isGuest = !localStorage.getItem('accessToken');

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

        // Guest users have no "My Bookings" — show fallback from stored payment state
        if (isGuest) {
          if (cancelled) return;
          const fallbackBooking = buildLatestBookingFallback(pendingPayment, paymentIntentId);
          setBooking(fallbackBooking || null);
          setStatusMessage('Payment received. Your ticket will be sent to your email shortly.');
          clearCheckout(pendingPayment);
          setLoading(false);
          return;
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
            if (matchStatus === 'CONFIRMED') clearCheckout(pendingPayment);
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

  const bookingState = pendingPayment?.bookingState || {};
  const trip = bookingState.searchParams || {};
  const bookingStatus = String(booking?.status || '').toUpperCase();
  const visualState = bookingStatus === 'CONFIRMED' ? 'confirmed' : (booking || paymentSucceeded) ? 'paid' : 'pending';
  const bookingCode = booking?.bookingCode || pendingPayment?.bookingCode || '';
  const bookingId = booking?.bookingId || pendingPayment?.bookingId || '';

  // Trip details: the confirmed booking from the API, else what was chosen at checkout
  const departure = (booking?.travelDate && booking?.departureTime && onTravelDate(booking.travelDate, booking.departureTime))
    || bookingState.bus?.departureTime || booking?.departureTime;
  const durationMs = new Date(bookingState.bus?.arrivalTime || booking?.arrivalTime) - new Date(bookingState.bus?.departureTime || booking?.departureTime);
  const arrival = departure && Number.isFinite(durationMs) && durationMs > 0 ? new Date(new Date(departure).getTime() + durationMs) : null;
  const from = booking?.from || trip.from;
  const to = booking?.to || trip.to;
  const boarding = bookingState.boardingPoint?.name || booking?.fromStop || from;
  const dropping = bookingState.droppingPoint?.name || booking?.toStop || to;
  const busName = booking?.busName || bookingState.bus?.busName;
  const travellers = (Array.isArray(booking?.passengers) && booking.passengers.length
    ? booking.passengers.map((p) => ({ name: [p.firstName, p.lastName].filter(Boolean).join(' '), seatNumber: p.seatNumber, age: p.age, gender: p.gender }))
    : (bookingState.passengers || []));
  const amountPaid = Number(booking?.payableAmount ?? pendingPayment?.payableAmount ?? 0);
  const contactEmail = bookingState.contact?.email;

  const HERO = {
    confirmed: { icon: 'check', title: 'Booking confirmed!', sub: isGuest ? `Your e-ticket is on its way to ${contactEmail || 'your email'}.` : 'Your seats are booked. Have a great trip!' },
    paid: { icon: 'check', title: 'Payment successful', sub: isGuest ? `Your e-ticket is on its way to ${contactEmail || 'your email'}.` : 'We’re issuing your ticket — this takes a few seconds.' },
    pending: { icon: 'hourglass_top', title: 'Confirming your booking…', sub: statusMessage },
  }[visualState];

  const copyCode = () => {
    navigator.clipboard?.writeText(bookingCode).then(() => toast.success('Booking code copied')).catch(() => {});
  };

  const download = async () => {
    setDownloading(true);
    const ok = await downloadTicketFromApi(bookingId, `TripGo-${bookingCode || 'ticket'}.pdf`);
    setDownloading(false);
    if (!ok) toast.error(isGuest ? 'Your ticket is still being prepared. Try again in a minute — it’s also in your email.' : 'Your ticket is still being prepared. Try again in a minute, or find it in My bookings.');
  };

  const returnDate = (() => {
    const base = trip.date ? new Date(`${trip.date}T00:00:00`) : new Date();
    base.setDate(base.getDate() + 1);
    const pad = (n) => String(n).padStart(2, '0');
    return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`;
  })();
  const genderShort = { MALE: 'M', FEMALE: 'F', OTHER: 'O' };

  return (
    <CheckoutLayout activeItem="bookings" title="Booking status">
      <div className="mx-auto max-w-3xl space-y-5">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl bg-primary px-6 py-8 text-center text-white shadow-sm">
          <div className="absolute -top-24 -right-10 w-72 h-72 rounded-full bg-[#FF8A65]/20 blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-24 -left-10 w-64 h-64 rounded-full bg-[#FDBA74]/10 blur-3xl" aria-hidden="true" />
          <div className="relative">
            <span className={`mx-auto mb-4 flex w-16 h-16 items-center justify-center rounded-full ${
              visualState === 'pending' ? 'bg-white/10' : 'bg-gradient-to-br from-[#FDBA74] to-[#FF8A65] shadow-lg shadow-[#FF8A65]/30 animate-[pop_0.5s_ease-out]'
            }`}>
              <span className={`material-symbols-outlined text-4xl ${visualState === 'pending' ? 'text-[#FDBA74] animate-pulse' : 'text-primary'}`} style={{ fontVariationSettings: "'wght' 700" }}>{HERO.icon}</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{HERO.title}</h1>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-white/70">{HERO.sub}</p>
            {bookingCode && (
              <button
                onClick={copyCode}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 ring-1 ring-white/15 hover:bg-white/15 transition-colors"
                title="Copy booking code"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-white/60">Booking code</span>
                <span className="font-mono text-base font-black tracking-wider">{bookingCode}</span>
                <span className="material-symbols-outlined text-[16px] text-[#FDBA74]">content_copy</span>
              </button>
            )}
            {loading && visualState !== 'confirmed' && (
              <p className="mt-4 flex items-center justify-center gap-2 text-xs text-white/60">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {statusMessage}
              </p>
            )}
          </div>
        </section>

        {/* Ticket */}
        {(from || departure) && (
          <section className="rounded-2xl bg-white border border-slate-200/80 shadow-sm">
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{formatTripDay(departure)}</p>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  visualState === 'confirmed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${visualState === 'confirmed' ? 'bg-green-500' : 'bg-amber-500'}`} />
                  {visualState === 'confirmed' ? 'Confirmed' : visualState === 'paid' ? 'Paid · issuing ticket' : 'Processing'}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="min-w-0">
                  <p className="text-2xl font-black text-slate-900">{departure ? formatIstTime(departure) : '--'}</p>
                  <p className="font-bold text-slate-800 truncate">{from}</p>
                  <p className="text-xs text-slate-500 truncate">{boarding}</p>
                </div>
                <div className="flex flex-col items-center text-slate-300" aria-hidden="true">
                  <span className="material-symbols-outlined text-[22px] text-[#FF8A65]">directions_bus</span>
                  <span className="mt-1 h-px w-12 sm:w-24 bg-slate-200" />
                </div>
                <div className="min-w-0 text-right">
                  <p className="text-2xl font-black text-slate-900">{arrival ? formatIstTime(arrival) : '--'}</p>
                  <p className="font-bold text-slate-800 truncate">{to}</p>
                  <p className="text-xs text-slate-500 truncate">{dropping}</p>
                </div>
              </div>
              {busName && <p className="mt-4 text-sm text-slate-500"><span className="material-symbols-outlined align-[-4px] text-[18px] text-slate-400 mr-1">directions_bus</span>{busName}</p>}
            </div>

            {/* Tear line */}
            <div className="relative h-0 border-t-2 border-dashed border-slate-200" aria-hidden="true">
              <span className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-slate-50 border-r border-slate-200/80" />
              <span className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-slate-50 border-l border-slate-200/80" />
            </div>

            <div className="p-5 sm:p-6 grid gap-5 sm:grid-cols-[1fr_auto]">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Travellers</p>
                <div className="space-y-1.5">
                  {travellers.map((p, i) => (
                    <div key={p.seatNumber || i} className="flex items-center gap-2 text-sm">
                      <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-black text-white">{p.seatNumber}</span>
                      <span className="font-semibold text-slate-800 truncate">{p.name || 'Traveller'}</span>
                      <span className="text-slate-400">{[genderShort[p.gender], p.age].filter(Boolean).join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
              {amountPaid > 0 && (
                <div className="sm:text-right">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Amount paid</p>
                  <p className="text-2xl font-black text-slate-900">₹{Math.round(amountPaid).toLocaleString('en-IN')}</p>
                </div>
              )}
            </div>

            {!isGuest && (
              <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/70 px-5 sm:px-6 py-4 rounded-b-2xl">
                {visualState === 'confirmed' && bookingId && (
                  <button onClick={download} disabled={downloading} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-[#102A4C] transition-colors disabled:opacity-60">
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    {downloading ? 'Downloading…' : 'Download ticket'}
                  </button>
                )}
                <button
                  onClick={() => navigate(ROUTES.USER_BOOKINGS, { replace: true, state: booking ? { latestBooking: booking } : undefined })}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-[#FF8A65] transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">confirmation_number</span>
                  My bookings
                </button>
              </div>
            )}
          </section>
        )}

        {/* What happens next */}
        <section className="rounded-2xl bg-white border border-slate-200/80 shadow-sm p-5 sm:p-6">
          <h2 className="font-black text-slate-900 mb-4">What happens next</h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {[
              ['mark_email_read', 'E-ticket by email', contactEmail ? `Sent to ${contactEmail}` : 'Sent to your email with a QR code'],
              ['share_location', 'Track your bus', isGuest ? 'Use the link in your ticket email on travel day' : 'Live location in My bookings on travel day'],
              ['event_busy', 'Plans changed?', isGuest ? `Contact TripGo support with booking code ${bookingCode || 'from your email'} — refunds follow the policy shown at booking` : 'Cancel from My bookings — refunds follow the policy shown at booking'],
            ].map(([icon, title, sub]) => (
              <li key={title} className="flex gap-3">
                <span className="w-9 h-9 flex-shrink-0 rounded-xl bg-[#FDBA74]/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px] text-orange-600">{icon}</span>
                </span>
                <span>
                  <span className="block text-sm font-bold text-slate-900">{title}</span>
                  <span className="block text-xs text-slate-500">{sub}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* Return trip */}
        {trip.from && trip.to && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl bg-[#FFF7F2] border border-[#FDBA74]/50 px-5 py-4">
            <span className="w-11 h-11 flex-shrink-0 rounded-xl bg-[#FDBA74]/25 flex items-center justify-center">
              <span className="material-symbols-outlined text-orange-600">u_turn_left</span>
            </span>
            <div className="flex-1">
              <p className="font-bold text-slate-900">Need a ride back?</p>
              <p className="text-sm text-slate-600">Book your return from {trip.to} to {trip.from}.</p>
            </div>
            <button
              onClick={() => navigate(ROUTES.SEARCH_RESULTS, { state: { from: trip.to, to: trip.from, date: returnDate } })}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-[#102A4C] transition-colors"
            >
              Find return buses
            </button>
          </div>
        )}

        {isGuest ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm px-5 py-4">
            <span className="w-11 h-11 flex-shrink-0 rounded-xl bg-primary/5 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">person_add</span>
            </span>
            <div className="flex-1">
              <p className="font-bold text-slate-900">Keep all your trips in one place</p>
              <p className="text-sm text-slate-600">Create a free account to download tickets, track buses and cancel online.</p>
            </div>
            <button onClick={() => navigate(ROUTES.REGISTER)} className="rounded-xl border border-primary px-5 py-2.5 text-sm font-bold text-primary hover:bg-primary hover:text-white transition-colors">
              Create account
            </button>
          </div>
        ) : null}

        <p className="text-center">
          <button onClick={() => navigate(ROUTES.SEARCH_RESULTS)} className="text-sm font-bold text-primary hover:text-[#FF8A65] transition-colors">
            Search more buses
          </button>
        </p>
      </div>
    </CheckoutLayout>
  );
};

export default PaymentSuccess;
