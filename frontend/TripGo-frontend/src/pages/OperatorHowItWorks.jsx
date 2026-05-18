import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../shared/constants/routes';

const steps = [
  {
    number: '01',
    icon: 'how_to_reg',
    title: 'Register & Get Approved',
    desc: 'Sign up as an operator, fill your business details, and submit for admin review. Approval usually takes under 24 hours.',
    color: 'bg-sky-50 text-sky-600',
  },
  {
    number: '02',
    icon: 'directions_bus',
    title: 'Add Your Buses',
    desc: 'Use our guided wizard to add bus details, configure the seat layout, set amenities, and upload photos.',
    color: 'bg-violet-50 text-violet-600',
  },
  {
    number: '03',
    icon: 'route',
    title: 'Create Routes & Schedules',
    desc: 'Define routes with boarding/dropping points. Set recurring or one-time schedules with departure times and fares.',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    number: '04',
    icon: 'confirmation_number',
    title: 'Passengers Book Your Buses',
    desc: 'Travellers discover your buses via search. They lock seats, fill passenger details, and pay online instantly.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    number: '05',
    icon: 'payments',
    title: 'Track Earnings & Manage',
    desc: 'View all bookings, cancellations, and revenue in real time. Assign drivers, update policies, and grow your fleet.',
    color: 'bg-rose-50 text-rose-600',
  },
];

const perks = [
  { icon: 'dashboard', label: 'Operator Dashboard', desc: 'Single place to manage buses, routes, schedules, and drivers.' },
  { icon: 'bar_chart', label: 'Earnings Analytics', desc: 'Revenue charts, top routes, booking trends — all visualised.' },
  { icon: 'reviews', label: 'Passenger Reviews', desc: 'See what travellers say and respond to feedback directly.' },
  { icon: 'support_agent', label: 'Dedicated Support', desc: '24/7 support for operators via chat, email, or phone.' },
];

const OperatorHowItWorks = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white">

      {/* Header / Hero */}
      <div className="bg-gradient-to-br from-[#001633] to-[#002f6c] text-white">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16 md:py-24">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate(ROUTES.HOME)}
              className="flex items-center gap-1.5 text-sky-300 hover:text-white text-sm font-semibold transition-colors"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Back to Home
            </button>
          </div>
          <p className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-3">For Operators</p>
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-5">
            Run your bus fleet<br />
            <span className="text-sky-300">the smart way.</span>
          </h1>
          <p className="text-slate-300 text-base md:text-lg max-w-xl leading-relaxed mb-8">
            TripGo gives bus operators a complete platform to list buses, manage routes, accept online bookings, and grow revenue — no tech expertise required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate(ROUTES.OPERATOR_REGISTER)}
              className="rounded-2xl bg-white text-[#002046] px-7 py-3.5 text-sm font-bold hover:bg-slate-100 transition-colors"
            >
              Register as Operator
            </button>
            <button
              onClick={() => navigate(ROUTES.LOGIN)}
              className="rounded-2xl border-2 border-white/30 text-white px-7 py-3.5 text-sm font-bold hover:bg-white/10 transition-colors"
            >
              Already registered? Sign in
            </button>
          </div>
        </div>
      </div>

      {/* Step-by-step flow */}
      <section className="py-16 md:py-20">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">The Process</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">How it works — step by step</h2>
          </div>

          <div className="relative">
            {/* Vertical connector */}
            <div className="hidden md:block absolute left-[38px] top-8 bottom-8 w-px bg-slate-200" />

            <div className="space-y-8">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-6 md:gap-8 items-start">
                  {/* Icon circle */}
                  <div className={`relative flex-shrink-0 w-[76px] h-[76px] rounded-2xl flex flex-col items-center justify-center shadow-sm ring-1 ring-slate-200 bg-white z-10`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${step.color}`}>
                      <span className="material-symbols-outlined text-xl">{step.icon}</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 mt-1">{step.number}</span>
                  </div>
                  {/* Content */}
                  <div className="flex-1 pt-3">
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{step.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed max-w-lg">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Perks grid */}
      <section className="py-14 bg-slate-50 border-t border-slate-100">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">What you get</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">Built for operators, by operators</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {perks.map((p) => (
              <div key={p.label} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 flex flex-col gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#002046]/[0.07] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#002046] text-xl">{p.icon}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{p.label}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
            Ready to grow your bus business?
          </h2>
          <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto">
            Join hundreds of operators on TripGo. Registration is free and setup takes less than 10 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate(ROUTES.OPERATOR_REGISTER)}
              className="rounded-2xl bg-[#002046] text-white px-8 py-3.5 text-sm font-bold hover:bg-[#003a80] transition-colors"
            >
              Register as Operator
            </button>
            <button
              onClick={() => navigate(ROUTES.HOME)}
              className="rounded-2xl border border-slate-200 text-slate-700 px-8 py-3.5 text-sm font-bold hover:bg-slate-50 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};

export default OperatorHowItWorks;
