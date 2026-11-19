import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPopularRoutes } from '../../../api/routeService';
import { localDateString } from '../../../shared/utils/date';
import Reveal from '../../../shared/components/ui/Reveal';

const formatDuration = (minutes) => {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

const SkeletonCard = () => (
  <div className="h-[132px] bg-white rounded-2xl border border-slate-200/70 p-5 animate-pulse">
    <div className="h-4 w-2/3 bg-slate-100 rounded mb-4" />
    <div className="h-2 w-full bg-slate-100 rounded mb-5" />
    <div className="h-3 w-1/3 bg-slate-100 rounded" />
  </div>
);

const RouteCard = ({ route, onBook }) => {
  const duration = formatDuration(route.durationMinutes);
  const meta = [
    route.buses ? `${route.buses} ${route.buses === 1 ? 'bus' : 'buses'}` : null,
    duration,
  ].filter(Boolean).join(' · ');

  return (
    <button
      onClick={onBook}
      className="group text-left w-full bg-white border border-slate-200/70 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-[#FDBA74] transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">From</p>
          <p className="text-base font-black text-slate-900 truncate">{route.from}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">To</p>
          <p className="text-base font-black text-slate-900 truncate">{route.to}</p>
        </div>
      </div>

      {/* Route line */}
      <div className="flex items-center gap-2 mb-4" aria-hidden="true">
        <span className="w-2.5 h-2.5 rounded-full border-2 border-primary flex-shrink-0" />
        <span className="flex-1 border-t-2 border-dashed border-slate-200" />
        <span className="material-symbols-outlined text-lg text-primary group-hover:text-[#FF8A65] transition-colors">directions_bus</span>
        <span className="flex-1 border-t-2 border-dashed border-slate-200" />
        <span className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          {route.startingFare != null && (
            <p className="text-sm text-slate-500">
              from <span className="text-lg font-black text-slate-900">₹{Math.round(route.startingFare)}</span>
            </p>
          )}
          {meta && <p className="text-xs text-slate-400 mt-0.5">{meta}</p>}
        </div>
        <span className="flex-shrink-0 inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-xs font-bold text-primary bg-gradient-to-r from-[#FDBA74] to-[#FF8A65] shadow-[0_6px_16px_rgba(255,138,101,0.3)] group-hover:brightness-105 group-hover:shadow-[0_8px_20px_rgba(255,138,101,0.45)] transition-all">
          Search
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </span>
      </div>
    </button>
  );
};

const ExploreSection = () => {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPopularRoutes(6)
      .then((data) => setRoutes(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const handleBook = (from, to) =>
    navigate('/search-results', { state: { from, to, date: localDateString() } });

  // Nothing bookable yet — don't show an empty "popular routes" block
  if (!loading && routes.length === 0) return null;

  return (
    <section id="explore" className="py-12 md:py-14 bg-white border-t border-slate-100">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6">

        <Reveal className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900">Where are you headed?</h2>
            <p className="text-slate-500 text-sm mt-1">Popular routes with buses running now, ready to book</p>
          </div>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex-shrink-0 text-sm font-semibold text-primary hover:text-[#FF8A65] transition-colors"
          >
            Search other routes →
          </button>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading
            ? [1, 2, 3].map((i) => <SkeletonCard key={i} />)
            : routes.map((r, i) => (
                <Reveal key={`${r.from}-${r.to}`} delay={i * 90}>
                  <RouteCard route={r} onBook={() => handleBook(r.from, r.to)} />
                </Reveal>
              ))}
        </div>

      </div>
    </section>
  );
};

export default ExploreSection;
