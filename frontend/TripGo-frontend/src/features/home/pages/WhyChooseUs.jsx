import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/constants/routes';

const features = [
  {
    icon: 'location_on',
    title: 'Live Bus Tracking',
    description: 'Track your bus in real time on a live map. Always know exactly where your ride is.',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: 'event_repeat',
    title: 'Free Reschedule',
    description: 'Plans changed? Reschedule your trip for free up to 4 hours before departure.',
    color: 'bg-sky-50 text-sky-600',
  },
  {
    icon: 'confirmation_number',
    title: 'Instant Digital Tickets',
    description: 'Booking confirmed in seconds. QR-coded PDF ticket sent straight to your inbox.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: 'notifications_active',
    title: 'Real-time Notifications',
    description: 'Get notified the moment your booking is confirmed, updated, or your bus departs.',
    color: 'bg-violet-50 text-violet-600',
  },
  {
    icon: 'verified_user',
    title: 'Verified Operators Only',
    description: 'Every bus on TripGo is admin-approved. Bank-grade encryption on every payment.',
    color: 'bg-rose-50 text-rose-600',
  },
  {
    icon: 'support_agent',
    title: '24/7 Customer Support',
    description: 'Real humans ready to help around the clock — by chat, phone, or email.',
    color: 'bg-indigo-50 text-indigo-600',
  },
];

const steps = [
  { number: '01', title: 'Search', desc: 'Enter your origin, destination, and travel date.' },
  { number: '02', title: 'Choose', desc: 'Pick from hundreds of buses, operators, and seat types.' },
  { number: '03', title: 'Travel', desc: 'Show your digital ticket and enjoy the journey.' },
];

const WhyChooseUs = () => {
  const navigate = useNavigate();
  return (
    <>
      {/* Features */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">

          <div className="text-center mb-12">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Why TripGo</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">
              Everything you need for a great journey
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group flex flex-col items-start p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 bg-white"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${f.color}`}>
                  <span className="material-symbols-outlined !text-2xl">{f.icon}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-slate-900">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">

          <div className="text-center mb-12">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Simple Process</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-1">
              Book in 3 easy steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-8 left-1/3 right-1/3 h-px bg-white/15" />

            {steps.map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center relative">
                <div className="w-16 h-16 rounded-full bg-white/8 border-2 border-white/20 flex items-center justify-center mb-5 z-10">
                  <span className="text-white font-black text-lg">{step.number}</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed max-w-xs">{step.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Operator CTA */}
      <section className="py-14 bg-white border-t border-slate-100">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
          <div className="rounded-3xl bg-gradient-to-br from-[#001633] to-[#002f6c] px-8 py-12 md:px-14 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <p className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-2">For Bus Operators</p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-snug">
                Run your fleet on TripGo.<br />
                <span className="text-sky-300">Reach more passengers, earn more.</span>
              </h2>
              <p className="mt-3 text-sm text-slate-300 max-w-md leading-relaxed">
                List your buses, set routes and schedules, manage bookings, and track earnings — all from one dashboard.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <button
                onClick={() => navigate(ROUTES.OPERATOR_HOW_IT_WORKS)}
                className="rounded-2xl border-2 border-white/30 text-white px-6 py-3 text-sm font-bold hover:bg-white/10 transition-colors"
              >
                See how it works
              </button>
              <button
                onClick={() => navigate(ROUTES.OPERATOR_REGISTER)}
                className="rounded-2xl bg-white text-[#002046] px-6 py-3 text-sm font-bold hover:bg-slate-100 transition-colors"
              >
                Start as Operator
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default WhyChooseUs;
