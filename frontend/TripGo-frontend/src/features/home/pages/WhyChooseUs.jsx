import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/constants/routes';
import Reveal from '../../../shared/components/ui/Reveal';

// Deliberately different from the hero highlights (fees, ticket, reschedule, tracking)
const features = [
  {
    icon: 'verified_user',
    title: 'Verified Operators',
    description: 'Every operator is reviewed and approved by our team before they can list a bus.',
  },
  {
    icon: 'lock',
    title: 'Secure Payments',
    description: 'Cards and wallets processed by Stripe. We never store your card details.',
  },
  {
    icon: 'star',
    title: 'Real Rider Reviews',
    description: 'Ratings come only from passengers who actually took the trip.',
  },
  {
    icon: 'policy',
    title: 'Clear Cancellation',
    description: 'See the exact refund policy for every bus before you pay — no surprises.',
  },
];

const steps = [
  { n: '01', title: 'Search', desc: 'Enter your origin, destination, and date.' },
  { n: '02', title: 'Choose & Pay', desc: 'Pick a bus, select your seat, pay securely.' },
  { n: '03', title: 'Board & Go', desc: 'Show your QR ticket — no printout needed.' },
];

// Mini 2+2 seat layout for the featured card: B = booked, S = selected, . = available
const SEAT_ROWS = ['BB.B', '.BSB', 'B..B', 'BB.B', '.B.B'];

const seatCls = {
  B: 'bg-white/15',
  S: 'seat-pulse bg-gradient-to-br from-[#FDBA74] to-[#FF8A65] shadow-[0_0_12px_rgba(255,138,101,0.6)]',
  '.': 'border border-white/30',
};

const WhyChooseUs = () => {
  const navigate = useNavigate();

  return (
    <>
      {/* Features — bento grid */}
      <section id="why-tripgo" className="py-12 md:py-16 bg-slate-50">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">

          <Reveal className="mb-8">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
              Why riders choose TripGo
            </h2>
            <p className="text-slate-500 text-sm md:text-base mt-2 max-w-lg">
              Booking a bus should feel safe and simple. Here&apos;s what we do differently.
            </p>
          </Reveal>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Featured card — full width on mobile, 1 col spanning 2 rows on desktop */}
            <Reveal className="col-span-2 lg:col-span-1 lg:row-span-2 relative overflow-hidden bg-primary rounded-2xl p-7 flex flex-col justify-between gap-6 min-h-[220px]">
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#FF8A65]/10 blur-2xl" aria-hidden="true" />

              {/* Seat map visual */}
              <div className="relative self-start rounded-xl border border-white/10 bg-white/5 p-3" aria-hidden="true">
                <div className="flex justify-end mb-2">
                  <span className="material-symbols-outlined text-base text-white/40">airline_seat_recline_normal</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {SEAT_ROWS.map((row, r) => (
                    <div key={r} className="flex gap-1.5">
                      {row.split('').map((seat, c) => (
                        <span
                          key={c}
                          className={`w-5 h-5 rounded-[5px] ${seatCls[seat]} ${c === 2 ? 'ml-3' : ''}`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <h3 className="text-xl font-black text-white mb-2">Pick your exact seat</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Window or aisle, front or back — choose from a live seat map. Your seat is held for you while you pay.
                </p>
              </div>
            </Reveal>

            {features.map((f, i) => (
              <Reveal key={f.title} delay={100 + i * 90} className="bg-white border border-slate-200/70 rounded-2xl p-5">
                <span className="w-10 h-10 mb-4 rounded-xl bg-[#FDBA74]/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl text-orange-600">{f.icon}</span>
                </span>
                <h3 className="text-base font-black text-slate-900 mb-1.5">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.description}</p>
              </Reveal>
            ))}
          </div>

        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-y border-slate-100 py-10 md:py-12">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
          <Reveal>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-6">How it works</h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {steps.map((step, i) => (
              <Reveal key={step.n} delay={i * 120} className="flex items-start gap-4 py-5 md:py-2 md:px-6 md:first:pl-0 md:last:pr-0">
                <span className="w-11 h-11 flex-shrink-0 rounded-xl bg-gradient-to-br from-[#FDBA74] to-[#FF8A65] flex items-center justify-center text-sm font-black text-primary">
                  {step.n}
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 mb-1">{step.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Operator CTA */}
      <section className="py-10 bg-slate-50">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
          <Reveal className="relative overflow-hidden bg-primary rounded-3xl px-8 py-12 md:px-14 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="absolute -bottom-24 -right-10 w-72 h-72 rounded-full bg-[#FF8A65]/10 blur-3xl" aria-hidden="true" />
            <div
              className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] [background-size:18px_18px]"
              aria-hidden="true"
            />

            <div className="relative">
              <span className="inline-block bg-[#FDBA74]/15 text-[#FDBA74] text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4">
                For Operators
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-white leading-snug max-w-md">
                Run your fleet on TripGo.<br />Reach more passengers, earn more.
              </h2>
              <p className="mt-3 text-sm text-slate-400 max-w-md leading-relaxed">
                List buses, set routes and schedules, manage bookings, and track earnings — one dashboard.
              </p>
            </div>
            <div className="relative flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <button
                onClick={() => navigate(ROUTES.OPERATOR_HOW_IT_WORKS)}
                className="rounded-xl border-2 border-white/30 text-white px-6 py-3 text-sm font-bold hover:bg-white/10 transition-colors"
              >
                How it works
              </button>
              <button
                onClick={() => navigate(ROUTES.OPERATOR_REGISTER)}
                className="rounded-xl bg-gradient-to-r from-[#FDBA74] to-[#FF8A65] text-primary px-6 py-3 text-sm font-black hover:brightness-105 shadow-[0_8px_20px_rgba(255,138,101,0.35)] transition-all"
              >
                Start as Operator
              </button>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
};

export default WhyChooseUs;
