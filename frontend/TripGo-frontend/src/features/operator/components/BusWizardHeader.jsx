const BUS_STEPS = ['Bus details', 'Seat layout', 'Review & submit'];

/** Navy strip for the add-bus and create-route wizards: back button, title and step progress. */
const BusWizardHeader = ({ step, title, subtitle, onBack, steps = BUS_STEPS, label = 'Add bus steps' }) => (
  <section className="relative rounded-2xl bg-primary px-5 sm:px-6 py-5 text-white shadow-sm">
    <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none" aria-hidden="true">
      <div className="absolute -top-24 -right-10 w-72 h-72 rounded-full bg-[#FF8A65]/15 blur-3xl" />
    </div>
    <div className="relative flex items-start gap-3">
      <button onClick={onBack} aria-label="Go back" className="mt-0.5 w-9 h-9 flex-shrink-0 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
      </button>
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-black tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-white/70">{subtitle}</p>}
      </div>
    </div>
    <ol className="relative mt-5 flex items-center gap-1.5 sm:gap-2 overflow-x-auto" aria-label={label}>
      {steps.map((name, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li key={name} className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <span aria-current={current ? 'step' : undefined} className={`flex items-center gap-2 rounded-full pl-1 pr-3 py-1 text-xs font-bold ${current ? 'bg-white text-primary' : done ? 'text-white/90' : 'text-white/45'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${current ? 'bg-gradient-to-r from-[#FDBA74] to-[#FF8A65] text-primary' : done ? 'bg-[#FDBA74]/25 text-[#FDBA74]' : 'bg-white/10 text-white/50'}`}>
                {done ? <span className="material-symbols-outlined text-[14px]">check</span> : i + 1}
              </span>
              {name}
            </span>
            {i < steps.length - 1 && <span className={`w-4 sm:w-8 h-px ${done ? 'bg-[#FDBA74]/60' : 'bg-white/20'}`} />}
          </li>
        );
      })}
    </ol>
  </section>
);

export default BusWizardHeader;
