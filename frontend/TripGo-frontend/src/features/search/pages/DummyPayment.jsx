import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import UserLayout from '../../../shared/components/UserLayout';
import { ROUTES } from '../../../shared/constants/routes';
import { confirmBooking } from '../../../api/bookingService';

const splitPassengerName = (name) => {
  const trimmed = String(name || '').trim();
  if (!trimmed) return { firstName: 'Traveler', lastName: '' };
  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] || 'Traveler',
    lastName: parts.slice(1).join(' '),
  };
};

const getSeatBaseFare = (selectedFare) => {
  const explicitBase = Number(selectedFare?.baseFare);
  if (Number.isFinite(explicitBase) && explicitBase > 0) return explicitBase;

  const totalFare = Number(selectedFare?.totalFare || 0);
  const explicitGst = Number(selectedFare?.gstAmount ?? selectedFare?.gst ?? 0);
  if (Number.isFinite(totalFare) && Number.isFinite(explicitGst) && explicitGst >= 0 && totalFare >= explicitGst) {
    return totalFare - explicitGst;
  }

  return totalFare;
};

const DummyPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const booking = location.state || {};
  const [confirming, setConfirming] = useState(false);

  const seatCount = Math.max(booking?.selectedSeats?.length || 1, 1);
  const perSeatTotal = Math.round(Number(booking?.selectedFare?.totalFare || 0));
  const perSeatGst = Math.round(Number(booking?.selectedFare?.gstAmount ?? booking?.selectedFare?.gst ?? 0));
  const perSeatBase = Math.max(0, Math.round(getSeatBaseFare(booking?.selectedFare)));

  const totalFare = useMemo(
    () => perSeatTotal * seatCount,
    [perSeatTotal, seatCount]
  );

  const gstAmount = useMemo(
    () => perSeatGst * seatCount,
    [perSeatGst, seatCount]
  );

  const totalAmount = useMemo(() => {
    if (gstAmount > 0) return perSeatBase * seatCount;
    return totalFare;
  }, [gstAmount, perSeatBase, seatCount, totalFare]);

  const payableAmount = useMemo(() => {
    if (gstAmount > 0) return totalAmount + gstAmount;
    return totalFare;
  }, [gstAmount, totalAmount, totalFare]);

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
      <div className="mx-auto max-w-5xl space-y-6 rounded-[32px] bg-[linear-gradient(180deg,#f7fbff_0%,#eef4ff_100%)] p-4 text-slate-900 dark:bg-[linear-gradient(180deg,#040404_0%,#0b0b0b_100%)] dark:text-slate-100 md:p-6">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="rounded-[28px] bg-[linear-gradient(140deg,#ffffff,#eef7ff)] p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:bg-[linear-gradient(135deg,#050404,#0b0b0b)] dark:ring-slate-950">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Dummy Payment</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">Complete your booking</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">This is a frontend-only payment placeholder. Clicking pay will simulate a successful payment flow.</p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70 dark:bg-black/70 dark:ring-slate-950">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Route</p>
                <p className="mt-2 font-bold text-slate-900 dark:text-white">{booking?.searchParams?.from} to {booking?.searchParams?.to}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{booking?.bus?.busName}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70 dark:bg-black/70 dark:ring-slate-950">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Seats</p>
                <p className="mt-2 font-bold text-slate-900 dark:text-white">{(booking?.selectedSeats || []).join(', ')}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{booking?.selectedType || 'Seat type not selected'}</p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl bg-white/80 p-5 ring-1 ring-slate-200/70 dark:bg-black/70 dark:ring-slate-950">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Payment method</p>
                  <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">UPI / Card / Netbanking Demo</p>
                </div>
                <span className="material-symbols-outlined text-3xl text-primary">payments</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {['UPI', 'Card', 'Netbanking'].map((item) => (
                  <div key={item} className="rounded-2xl bg-slate-50 px-4 py-4 text-center text-sm font-semibold text-slate-700 ring-1 ring-slate-200/70 dark:bg-black/70 dark:text-slate-200 dark:ring-slate-950">{item}</div>
                ))}
              </div>
            </div>

            {booking?.lockToken ? (
              <div className="mt-6 rounded-2xl bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                Your seats are locked with token <span className="font-semibold">{booking.lockToken}</span>. Confirm payment before the timer expires.
              </div>
            ) : (
              <div className="mt-6 rounded-2xl bg-amber-50/80 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
                Lock token is missing. Please go back and lock seats again before continuing.
              </div>
            )}
          </div>

          <div className="rounded-[28px] bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:bg-[linear-gradient(180deg,#040404_0%,#0b0b0b_100%)] dark:ring-slate-950">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Fare Summary</h2>
            <div className="mt-5 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/70 dark:bg-black/70 dark:ring-slate-950"><span>Seat count</span><span className="font-bold text-slate-900 dark:text-white">{booking?.selectedSeats?.length || 0}</span></div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/70 dark:bg-black/70 dark:ring-slate-950"><span>Per seat fare</span><span className="font-bold text-slate-900 dark:text-white">₹{perSeatTotal}</span></div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/70 dark:bg-black/70 dark:ring-slate-950"><span>GST</span><span className="font-bold text-slate-900 dark:text-white">₹{gstAmount}</span></div>
              <div className="flex items-center justify-between rounded-2xl bg-primary/10 px-4 py-4"><span className="text-primary">Total payable</span><span className="text-2xl font-black text-slate-900 dark:text-white">₹{payableAmount}</span></div>
            </div>
            <button
              onClick={async () => {
                if (!booking?.scheduleId) return toast.error('Schedule is missing. Please restart the booking flow.');
                if (!booking?.lockToken) return toast.error('Seat lock expired or missing. Please lock seats again.');

                const seatNumbers = Array.isArray(booking?.selectedSeats) ? booking.selectedSeats : [];
                if (!seatNumbers.length) return toast.error('No seats selected.');

                try {
                  setConfirming(true);
                  const { firstName, lastName } = splitPassengerName(booking?.passenger?.name);
                  const payload = {
                    scheduleId: booking.scheduleId,
                    lockToken: booking.lockToken,
                    from: booking?.searchParams?.from || '',
                    to: booking?.searchParams?.to || '',
                    totalAmount,
                    gstAmount,
                    payableAmount,
                    passengers: seatNumbers.map((seatNumber) => ({
                      seatNumber,
                      firstName,
                      lastName,
                      age: Number(booking?.passenger?.age || 0),
                      gender: booking?.passenger?.gender || 'OTHER',
                      phone: booking?.passenger?.phone || booking?.contact?.phone || '',
                    })),
                  };

                  const response = await confirmBooking(payload);
                  const bookingId = response?.bookingId || response?.id || response?.reference || '';
                  toast.success(bookingId ? `Booking confirmed: ${bookingId}` : 'Booking confirmed successfully.');
                  navigate(ROUTES.USER_BOOKINGS, { replace: true, state: { latestBooking: response || payload } });
                } catch (error) {
                  toast.error(error?.message || 'Payment succeeded, but booking confirmation failed.');
                } finally {
                  setConfirming(false);
                }
              }}
              disabled={confirming || !booking?.lockToken}
              className="mt-6 w-full rounded-2xl bg-primary px-4 py-3 text-base font-black text-black hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {confirming ? 'Confirming Booking...' : `Pay ₹${payableAmount}`}
            </button>
            <button onClick={() => navigate(ROUTES.BOOKING, { state: booking })} className="mt-3 w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900">Back to booking</button>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default DummyPayment;
