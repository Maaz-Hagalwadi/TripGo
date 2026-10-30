import SearchBar from '../../../shared/components/ui/SearchBar';

const HeroSection = () => (
  <section className="bg-primary">
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 pt-12 pb-10">

      <h1 className="text-5xl md:text-6xl font-black text-white leading-[1.08] tracking-tight mb-4">
        Book any bus.<br />
        Go anywhere.
      </h1>
      <p className="text-slate-400 text-base md:text-lg mb-10 max-w-md leading-relaxed">
        Confirmed seats on 500+ routes across India — in under a minute.
      </p>

      <div className="bg-white rounded-2xl overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.4)]">
        <SearchBar showQuickDates={true} persistDraft={false} submitLabel="Find Buses" />
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-2 mt-7 text-sm text-slate-400">
        {['No booking fees', 'Instant PDF ticket', 'Free reschedule up to 4h', 'Live bus tracking'].map((t) => (
          <span key={t} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
            {t}
          </span>
        ))}
      </div>

    </div>
  </section>
);

export default HeroSection;
