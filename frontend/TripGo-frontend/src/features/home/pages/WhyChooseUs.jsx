const features = [
  {
    icon: 'verified_user',
    title: 'Safe & Secure',
    description: 'Every booking is protected with bank-grade encryption and verified operators only.',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: 'payments',
    title: 'Best Price Guarantee',
    description: "Find a lower price anywhere else? We'll match it. No hidden fees, ever.",
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: 'support_agent',
    title: '24/7 Customer Support',
    description: 'Real humans ready to help around the clock — by chat, phone, or email.',
    color: 'bg-violet-50 text-violet-600',
  },
  {
    icon: 'confirmation_number',
    title: 'Instant Confirmation',
    description: 'Booking confirmed in seconds. Digital ticket sent to your email & phone.',
    color: 'bg-amber-50 text-amber-600',
  },
];

const steps = [
  { number: '01', title: 'Search', desc: 'Enter your origin, destination, and travel date.' },
  { number: '02', title: 'Choose', desc: 'Pick from hundreds of buses, operators, and seat types.' },
  { number: '03', title: 'Travel', desc: 'Show your digital ticket and enjoy the journey.' },
];

const WhyChooseUs = () => {
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
            {/* Connector line (desktop) */}
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
    </>
  );
};

export default WhyChooseUs;
