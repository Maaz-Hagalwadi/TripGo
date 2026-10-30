import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/constants/routes';

const features = [
  {
    icon: 'location_on',
    title: 'Live Bus Tracking',
    description: 'Track your bus in real time on a live map. Always know exactly where your ride is.',
    featured: true,
  },
  {
    icon: 'event_repeat',
    title: 'Free Reschedule',
    description: 'Plans changed? Reschedule for free up to 4 hours before departure.',
  },
  {
    icon: 'confirmation_number',
    title: 'Instant Tickets',
    description: 'QR-coded PDF ticket in your inbox the moment you pay.',
  },
  {
    icon: 'verified_user',
    title: 'Verified Operators',
    description: 'Every operator is individually reviewed. Payments processed via Stripe.',
  },
  {
    icon: 'support_agent',
    title: '24/7 Support',
    description: 'Real help, around the clock — by chat, phone, or email.',
  },
];

const WhyChooseUs = () => {
  const navigate = useNavigate();

  return (
    <>
      {/* Features — bento grid */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">

          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-8 max-w-xs leading-tight">
            Why riders choose TripGo
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Featured card — spans full width on mobile, 1 col spanning 2 rows on desktop */}
            <div className="col-span-2 lg:col-span-1 lg:row-span-2 bg-primary rounded-2xl p-7 flex flex-col justify-between min-h-[180px] lg:min-h-0">
              <span className="material-symbols-outlined !text-3xl text-white/60">{features[0].icon}</span>
              <div>
                <h3 className="text-xl font-black text-white mb-2">{features[0].title}</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{features[0].description}</p>
              </div>
            </div>

            {/* Remaining 5 cards */}
            {features.slice(1).map((f) => (
              <div
                key={f.title}
                className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <span className="material-symbols-outlined !text-2xl text-primary mb-4 block">{f.icon}</span>
                <h3 className="text-sm font-black text-slate-900 mb-1.5">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* How it works — clean inline strip */}
      <section className="bg-white border-y border-slate-100">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {[
              { n: '01', title: 'Search', desc: 'Enter your origin, destination, and date.' },
              { n: '02', title: 'Choose & Pay', desc: 'Pick a bus, select your seat, pay securely.' },
              { n: '03', title: 'Board & Go', desc: 'Show your QR ticket — no printout needed.' },
            ].map((step) => (
              <div key={step.n} className="flex items-start gap-4 px-6 py-6 first:pl-0 last:pr-0">
                <span className="text-3xl font-black text-primary/30 leading-none flex-shrink-0 mt-0.5">{step.n}</span>
                <div>
                  <h3 className="text-base font-black text-slate-900 mb-1">{step.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Operator CTA */}
      <section className="py-10 bg-slate-50">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
          <div className="bg-primary rounded-3xl px-8 py-12 md:px-14 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <span className="inline-block bg-white/10 text-white text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4">
                For Operators
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-white leading-snug max-w-md">
                Run your fleet on TripGo.<br />Reach more passengers, earn more.
              </h2>
              <p className="mt-3 text-sm text-slate-400 max-w-md leading-relaxed">
                List buses, set routes and schedules, manage bookings, and track earnings — one dashboard.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <button
                onClick={() => navigate(ROUTES.OPERATOR_HOW_IT_WORKS)}
                className="rounded-xl border-2 border-white/30 text-white px-6 py-3 text-sm font-bold hover:bg-white/10 transition-colors"
              >
                How it works
              </button>
              <button
                onClick={() => navigate(ROUTES.OPERATOR_REGISTER)}
                className="rounded-xl bg-white text-primary px-6 py-3 text-sm font-black hover:bg-slate-100 transition-colors"
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
