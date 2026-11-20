import { formatIstTime } from '../../../shared/utils/scheduleSearchUtils';
import { CHECKOUT_STEPS, formatCountdown, formatTripDay } from '../utils/checkout';

/**
 * Navy strip shared by the booking, payment and confirmation pages: route, trip time, bus,
 * the checkout steps and (while seats are held) the lock countdown.
 * `step` is an index into CHECKOUT_STEPS, or CHECKOUT_STEPS.length once booked.
 */
const CheckoutHeader = ({ from, to, departure, arrival, busName, step, onStepClick, onBack, secondsLeft }) => {
  const day = formatTripDay(departure);
  const timing = departure ? `${formatIstTime(departure)}${arrival ? ` – ${formatIstTime(arrival)}` : ''}` : '';
  const timerLow = secondsLeft > 0 && secondsLeft < 120;

  return (
    <section className="relative rounded-2xl bg-primary px-4 sm:px-6 py-5 text-white shadow-sm">
      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none" aria-hidden="true">
        <div className="absolute -top-24 -right-10 w-72 h-72 rounded-full bg-[#FF8A65]/15 blur-3xl" />
      </div>

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Go back"
              className="mt-0.5 w-9 h-9 flex-shrink-0 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black tracking-tight truncate">
              {from} <span className="mx-1 text-[#FDBA74]">→</span> {to}
            </h1>
            <p className="mt-0.5 text-sm text-white/70 truncate">
              {[day, timing, busName].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        {secondsLeft > 0 && (
          <div
            className={`flex items-center gap-2 rounded-xl px-3 py-2 ring-1 ${timerLow ? 'bg-red-500/20 ring-red-300/40' : 'bg-white/10 ring-white/15'}`}
            role="timer"
            aria-label="Time left to complete booking"
          >
            <span className={`material-symbols-outlined text-[18px] ${timerLow ? 'text-red-200' : 'text-[#FDBA74]'}`}>timer</span>
            <div className="leading-tight">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Seats held for</p>
              <p className="text-base font-black tabular-nums">{formatCountdown(secondsLeft)}</p>
            </div>
          </div>
        )}
      </div>

      <ol className="relative mt-5 flex items-center gap-1.5 sm:gap-2 overflow-x-auto" aria-label="Checkout steps">
        {CHECKOUT_STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          const clickable = done && onStepClick && step < CHECKOUT_STEPS.length;
          return (
            <li key={label} className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepClick(i)}
                aria-current={current ? 'step' : undefined}
                className={`flex items-center gap-2 rounded-full pl-1 pr-3 py-1 text-xs font-bold transition-colors ${
                  current ? 'bg-white text-primary' : done ? 'text-white/90 hover:bg-white/10' : 'text-white/45'
                } ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                  current ? 'bg-gradient-to-r from-[#FDBA74] to-[#FF8A65] text-primary'
                    : done ? 'bg-[#FDBA74]/25 text-[#FDBA74]' : 'bg-white/10 text-white/50'
                }`}>
                  {done ? <span className="material-symbols-outlined text-[14px]">check</span> : i + 1}
                </span>
                {label}
              </button>
              {i < CHECKOUT_STEPS.length - 1 && <span className={`w-4 sm:w-8 h-px ${done ? 'bg-[#FDBA74]/60' : 'bg-white/20'}`} />}
            </li>
          );
        })}
      </ol>
    </section>
  );
};

export default CheckoutHeader;
