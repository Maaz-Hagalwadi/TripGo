import SearchBar from '../../../shared/components/ui/SearchBar';

const HeroSection = () => {
  return (
    <section
      className="relative w-full"
      style={{ background: 'linear-gradient(180deg, #0d1117 0%, #0d1f3c 60%, #0a2847 100%)' }}
    >
      {/* Subtle dot texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      {/* Soft glow — neutral blue, not cyan */}
      <div className="absolute top-0 left-1/3 w-96 h-72 bg-blue-900/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-slate-700/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-screen-xl mx-auto px-4 sm:px-6 pt-14 pb-16">

        {/* Headline */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-white/8 border border-white/15 rounded-full px-4 py-1.5 mb-6 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span className="text-white/80 text-xs font-semibold uppercase tracking-widest">
              Trusted by 50,000+ Travelers
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-[3.4rem] font-black text-white leading-tight tracking-tight mb-4">
            Book Bus Tickets{' '}
            <span className="text-white/90 italic">Instantly</span>
          </h1>

          <p className="text-slate-400 text-base md:text-lg max-w-xl mx-auto font-medium">
            500+ cities &middot; 1,000+ bus operators &middot; Best prices guaranteed
          </p>
        </div>

        {/* Search widget */}
        <div className="max-w-5xl mx-auto">
          <div
            className="rounded-2xl border border-white/10 shadow-[0_8px_60px_rgba(0,0,0,0.6)]"
            style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)' }}
          >
            <SearchBar showQuickDates={true} persistDraft={false} submitLabel="Search Buses" />
          </div>
        </div>

        {/* Stats row — no cyan */}
        <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 mt-10">
          {[
            { value: '500+', label: 'Cities' },
            { value: '50K+', label: 'Happy Travelers' },
            { value: '1000+', label: 'Bus Operators' },
            { value: '4.8 ★', label: 'Avg Rating' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-xl font-extrabold text-white">{s.value}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default HeroSection;
