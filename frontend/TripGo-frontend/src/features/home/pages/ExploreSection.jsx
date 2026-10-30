import { useNavigate } from 'react-router-dom';

const routes = [
  { from: 'Mumbai', to: 'Pune', duration: '3h', buses: '120+ buses' },
  { from: 'Delhi', to: 'Jaipur', duration: '5h', buses: '80+ buses' },
  { from: 'Bangalore', to: 'Chennai', duration: '6h', buses: '100+ buses' },
  { from: 'Hyderabad', to: 'Bangalore', duration: '10h', buses: '75+ buses' },
  { from: 'Ahmedabad', to: 'Mumbai', duration: '8h', buses: '60+ buses' },
  { from: 'Kolkata', to: 'Bhubaneswar', duration: '7h', buses: '45+ buses' },
];

const ACCENTS = ['#0B1F3A', '#1a3a6b', '#0f4c75', '#1b262c', '#162447', '#0a3d62'];

const RouteCard = ({ from, to, duration, buses, accent, onBook }) => (
  <button
    onClick={onBook}
    className="group bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-left w-full flex"
  >
    <div className="w-1 flex-shrink-0" style={{ background: accent }} />
    <div className="flex items-center justify-between flex-1 px-4 py-4 gap-3">
      <div>
        <div className="flex items-center gap-1.5 text-slate-900 font-black text-sm">
          {from}
          <span className="text-slate-400 font-normal text-base">→</span>
          {to}
        </div>
        <div className="text-xs text-slate-400 mt-0.5">{buses} · {duration}</div>
      </div>
      <span className="material-symbols-outlined text-slate-300 group-hover:text-primary !text-xl transition-colors flex-shrink-0">
        arrow_forward
      </span>
    </div>
  </button>
);

const ExploreSection = () => {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const handleBook = (from, to) =>
    navigate('/search-results', { state: { from, to, date: today } });

  return (
    <section className="py-12 md:py-14 bg-white border-t border-slate-100">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6">

        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900">Where are you headed?</h2>
            <p className="text-slate-500 text-sm mt-1">Popular routes, ready to book</p>
          </div>
          <button
            onClick={() => navigate('/search-results')}
            className="text-sm font-semibold text-primary hover:underline hidden md:block"
          >
            See all routes →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {routes.map((r, i) => (
            <RouteCard
              key={`${r.from}-${r.to}`}
              {...r}
              accent={ACCENTS[i]}
              onBook={() => handleBook(r.from.toLowerCase(), r.to.toLowerCase())}
            />
          ))}
        </div>

      </div>
    </section>
  );
};

export default ExploreSection;
