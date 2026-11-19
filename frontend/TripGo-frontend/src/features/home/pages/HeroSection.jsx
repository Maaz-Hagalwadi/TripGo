import SearchBar from '../../../shared/components/ui/SearchBar';
import RecentSearches from '../components/RecentSearches';

const HIGHLIGHTS = [
  { icon: 'money_off',        title: 'No booking fees',  sub: 'Pay only the fare' },
  { icon: 'picture_as_pdf',   title: 'Instant ticket',   sub: 'PDF in your inbox' },
  { icon: 'event_repeat',     title: 'Easy date change', sub: 'Reschedule online' },
  { icon: 'share_location',   title: 'Live tracking',    sub: 'Know where your bus is' },
];

const HeroSection = () => (
  <section className="relative z-10 bg-primary">
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 pt-12 pb-10">

      <h1 className="fade-up text-5xl md:text-6xl font-black text-white leading-[1.08] tracking-tight mb-4">
        Book any bus.<br />
        <span className="gradient-shift bg-gradient-to-r from-[#FDBA74] via-[#FF8A65] to-[#FDBA74] bg-clip-text text-transparent">Go anywhere.</span>
      </h1>
      <p className="fade-up text-slate-400 text-base md:text-lg mb-10 max-w-md leading-relaxed" style={{ animationDelay: '120ms' }}>
        Confirmed seats and instant e-tickets — booked in under a minute.
      </p>

      {/* relative z-20: the fade-up animation makes each hero block its own stacking layer, so the
          city dropdown must sit on a higher layer than the recent searches and highlight cards below */}
      <div className="fade-up relative z-20 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.4)]" style={{ animationDelay: '240ms' }}>
        <SearchBar variant="hero" showQuickDates={true} persistDraft={false} submitLabel="Search Buses" />
      </div>

      <RecentSearches className="fade-up mt-4" style={{ animationDelay: '300ms' }} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
        {HIGHLIGHTS.map(({ icon, title, sub }, i) => (
          <div key={title} style={{ animationDelay: `${360 + i * 80}ms` }} className="fade-up flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3 hover:bg-white/10 transition-colors">
            <span className="w-9 h-9 flex-shrink-0 rounded-lg bg-[#FDBA74]/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl text-[#FDBA74]">{icon}</span>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-tight">{title}</p>
              <p className="text-xs text-slate-400 leading-tight mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  </section>
);

export default HeroSection;
