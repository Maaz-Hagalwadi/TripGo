import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import UserLayout from '../../../shared/components/UserLayout';
import { ROUTES } from '../../../shared/constants/routes';

const DummyPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const booking = location.state || {};

  const totalFare = useMemo(
    () => Math.round(Number(booking?.selectedFare?.totalFare || 0)) * Math.max(booking?.selectedSeats?.length || 1, 1),
    [booking]
  );

  if (!booking?.bus) {
    return (
      <UserLayout activeItem="search" title="Payment">
        <div className="rounded-3xl border border-white/5 bg-charcoal p-6 text-slate-100">
          <p className="mb-4 text-sm text-slate-300">Payment details are missing. Please complete seat selection first.</p>
          <button onClick={() => navigate(ROUTES.SEARCH_RESULTS)} className="rounded-xl bg-primary px-4 py-2 font-semibold text-black">Back to Search</button>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout activeItem="search" title="Payment">
      <div className="mx-auto max-w-5xl space-y-6 rounded-[32px] bg-deep-black p-4 text-slate-100 md:p-6">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="rounded-[28px] border border-white/6 bg-[linear-gradient(140deg,rgba(0,212,255,0.14),rgba(255,255,255,0.03))] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Dummy Payment</p>
            <h1 className="mt-2 text-3xl font-black text-white">Complete your booking</h1>
            <p className="mt-2 text-sm text-slate-300">
              This is a frontend-only payment placeholder. Clicking pay will simulate a successful payment flow.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Route</p>
                <p className="mt-2 font-bold text-white">{booking?.searchParams?.from} to {booking?.searchParams?.to}</p>
                <p className="mt-1 text-sm text-slate-300">{booking?.bus?.busName}</p>
              </div>
              <div className="rounded-2xl bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Seats</p>
                <p className="mt-2 font-bold text-white">{(booking?.selectedSeats || []).join(', ')}</p>
                <p className="mt-1 text-sm text-slate-300">{booking?.selectedType || 'Seat type not selected'}</p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-charcoal/90 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Payment method</p>
                  <p className="mt-1 text-lg font-bold text-white">UPI / Card / Netbanking Demo</p>
                </div>
                <span className="material-symbols-outlined text-3xl text-primary">payments</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {['UPI', 'Card', 'Netbanking'].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-center text-sm font-semibold text-slate-200">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/6 bg-charcoal/90 p-6">
            <h2 className="text-xl font-black text-white">Fare Summary</h2>
            <div className="mt-5 space-y-3 text-sm text-slate-300">
              <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                <span>Seat count</span>
                <span className="font-bold text-white">{booking?.selectedSeats?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                <span>Per seat fare</span>
                <span className="font-bold text-white">₹{Math.round(Number(booking?.selectedFare?.totalFare || 0))}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-primary/10 px-4 py-4">
                <span className="text-primary">Total payable</span>
                <span className="text-2xl font-black text-white">₹{totalFare}</span>
              </div>
            </div>

            <button
              onClick={() => {
                toast.success('Dummy payment successful. Booking confirmed in demo mode.');
                navigate(ROUTES.DASHBOARD);
              }}
              className="mt-6 w-full rounded-2xl bg-primary px-4 py-3 text-base font-black text-black hover:bg-primary/90"
            >
              Pay ₹{totalFare}
            </button>

            <button
              onClick={() => navigate(ROUTES.BOOKING, { state: { bus: booking.bus, selectedType: booking.selectedType, selectedFare: booking.selectedFare, searchParams: booking.searchParams } })}
              className="mt-3 w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5"
            >
              Back to booking
            </button>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default DummyPayment;
